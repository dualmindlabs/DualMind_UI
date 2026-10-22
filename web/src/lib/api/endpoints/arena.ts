import { ApiError } from '../errors';
import { TIMEOUTS } from '../http/timeouts';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import {
  type Answer,
  answerSchema,
  type Battle,
  battleSchema,
  type ChatStreamEvent,
  SELECTION_MODES,
  type SelectionMode,
  VOTE_CHOICES,
  type VoteChoice,
  type VoteResult,
  voteResultSchema,
} from '../schemas/arena';
import { readChatStream } from '../sse';
import { compact, oneOf, optionalPositiveInt, requireText } from './input';

/** Upper bound for `maxTokens` accepted locally; the API applies its own per-model limits. */
export const MAX_TOKENS_LIMIT = 32_768;
export const DEFAULT_MAX_TOKENS = 4_096;

export interface BattleInput {
  prompt: string;
  /** Default 4096. */
  maxTokens?: number | undefined;
  /** How the API picks models for a blind battle. Default `random`. */
  selectionMode?: SelectionMode | undefined;
  /** Model ids. Leave both empty for a blind battle; set both for side by side. */
  model1?: string | undefined;
  model2?: string | undefined;
  system?: string | undefined;
  /** Appends the battle to this thread. */
  threadId?: string | undefined;
  /**
   * Sent as `Idempotency-Key`: the same key with the same body returns the first battle instead
   * of a second one (BE-6, behind a flag on the API; ignored while the flag is off). 1 to 128
   * printable ASCII characters, such as a UUID.
   */
  idempotencyKey?: string | undefined;
}

export interface ChatInput {
  prompt: string;
  /** A model id, or `auto` (the default) for a random model. */
  model?: string | undefined;
  maxTokens?: number | undefined;
  system?: string | undefined;
  threadId?: string | undefined;
  temperature?: number | undefined;
}

export interface VoteInput {
  /** From `Battle.comparisonId`. */
  comparisonId: string;
  voteChoice: VoteChoice;
  /** Milliseconds between both answers finishing and the vote, measured by the client. */
  voteDurationMs?: number | undefined;
}

export interface StreamChatOptions extends CallOptions {
  /** Fails the stream with kind `timeout` when nothing arrives for this long. Default 30 s. */
  idleTimeoutMs?: number | undefined;
}

export interface ArenaEndpoints {
  /**
   * `POST /api/arena/dualchat`: one prompt, two models, both answers and a `comparisonId`.
   * 60 s timeout. **Never retried here**: the API stores a comparison per call, so a retry
   * after a timeout could create a second battle. Retry only on a user action, with the same
   * `idempotencyKey` when the prompt is the same.
   * The answers name their models; hide them until the vote in a blind battle. A battle a backup
   * model answered has no `comparisonId` and cannot be voted on.
   */
  startBattle: (input: BattleInput, options?: CallOptions) => Promise<Battle>;
  /** `POST /api/arena/chat`: one model (or `auto`), full answer. 60 s timeout, never retried. */
  sendChat: (input: ChatInput, options?: CallOptions) => Promise<Answer>;
  /**
   * `POST /api/arena/chat/stream`: the same request, answered as Server-Sent Events. Yields
   * `delta` events, then one `done`. Abort with `options.signal` or by leaving the loop. Errors
   * before the stream starts are normal ApiErrors; `ai.error` events mid-stream throw too.
   * If the server answers with plain JSON instead of a stream, it is replayed as one delta.
   */
  streamChat: (
    input: ChatInput,
    options?: StreamChatOptions,
  ) => AsyncGenerator<ChatStreamEvent, void, undefined>;
  /**
   * `POST /api/arena/model-vote`. Never retried here; use the vote queue (`createVoteQueue`),
   * which keeps a vote that failed for a transient reason and sends it again on reconnect.
   */
  vote: (input: VoteInput, options?: CallOptions) => Promise<VoteResult>;
}

function chatBody(input: ChatInput) {
  return compact({
    prompt: requireText(input.prompt, 'prompt'),
    model: input.model === undefined || input.model.trim() === '' ? 'auto' : input.model,
    maxTokens:
      optionalPositiveInt(input.maxTokens, 'maxTokens', MAX_TOKENS_LIMIT) ?? DEFAULT_MAX_TOKENS,
    system: input.system,
    threadId: input.threadId,
    temperature: input.temperature,
  });
}

const IDEMPOTENCY_KEY_RE = /^[\x21-\x7e]{1,128}$/;

/** The `Idempotency-Key` header for a battle, or nothing when no key is set. */
function idempotencyHeaders(key: string | undefined): Record<string, string> {
  if (key === undefined) return {};
  if (!IDEMPOTENCY_KEY_RE.test(key)) {
    throw new ApiError({
      kind: 'validation',
      code: 'INVALID_ARGUMENT',
      message: 'idempotencyKey must be 1 to 128 printable ASCII characters',
    });
  }
  return { 'Idempotency-Key': key };
}

export function createArenaEndpoints(transport: Transport): ArenaEndpoints {
  async function* streamChat(
    input: ChatInput,
    options: StreamChatOptions = {},
  ): AsyncGenerator<ChatStreamEvent, void, undefined> {
    const { idleTimeoutMs = TIMEOUTS.streamIdle, ...callOptions } = options;
    const path = '/api/arena/chat/stream';
    const handle = await transport.openStream(
      {
        method: 'POST',
        path,
        body: chatBody(input),
        auth: 'required',
        accept: 'text/event-stream',
        // Until the response headers arrive; after that the idle timeout applies.
        timeoutMs: TIMEOUTS.chat,
      },
      callOptions,
    );
    const context = { requestId: handle.requestId, method: 'POST', path };
    try {
      const contentType = handle.response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const parsed = answerSchema.safeParse(await handle.response.json());
        if (!parsed.success) {
          throw new ApiError({
            kind: 'bad_response',
            code: 'SCHEMA_MISMATCH',
            message: 'The chat stream answered with JSON that is not an answer',
            ...context,
          });
        }
        if (parsed.data.text !== '') yield { type: 'delta', text: parsed.data.text };
        yield { type: 'done', finishReason: parsed.data.finishReason, usage: parsed.data.usage };
        return;
      }
      const { body } = handle.response;
      if (body === null) {
        throw new ApiError({
          kind: 'bad_response',
          code: 'EMPTY_STREAM',
          message: 'The chat stream has no body',
          ...context,
        });
      }
      yield* readChatStream(body, { signal: handle.signal, idleTimeoutMs, context });
    } finally {
      handle.close();
    }
  }

  return {
    startBattle: async (input, options) => {
      const headers = { ...options?.headers, ...idempotencyHeaders(input.idempotencyKey) };
      return await transport.json(
        {
          method: 'POST',
          path: '/api/arena/dualchat',
          auth: 'required',
          timeoutMs: TIMEOUTS.battle,
          // `userId` is not sent: the API takes the identity from the token.
          body: compact({
            prompt: requireText(input.prompt, 'prompt'),
            maxTokens:
              optionalPositiveInt(input.maxTokens, 'maxTokens', MAX_TOKENS_LIMIT) ??
              DEFAULT_MAX_TOKENS,
            selectionMode:
              input.selectionMode === undefined
                ? 'random'
                : oneOf(input.selectionMode, SELECTION_MODES, 'selectionMode'),
            model1: input.model1 || undefined,
            model2: input.model2 || undefined,
            system: input.system,
            threadId: input.threadId,
          }),
          schema: battleSchema,
        },
        { ...options, headers },
      );
    },

    sendChat: async (input, options) =>
      await transport.json(
        {
          method: 'POST',
          path: '/api/arena/chat',
          auth: 'required',
          timeoutMs: TIMEOUTS.chat,
          body: chatBody(input),
          schema: answerSchema,
        },
        options,
      ),

    streamChat,

    vote: async (input, options) =>
      await transport.json(
        {
          method: 'POST',
          path: '/api/arena/model-vote',
          auth: 'required',
          body: compact({
            comparisonId: requireText(input.comparisonId, 'comparisonId'),
            voteChoice: oneOf(input.voteChoice, VOTE_CHOICES, 'voteChoice'),
            voteDurationMs:
              input.voteDurationMs === undefined
                ? undefined
                : Math.max(0, Math.round(input.voteDurationMs)),
          }),
          schema: voteResultSchema,
        },
        options,
      ),
  };
}
