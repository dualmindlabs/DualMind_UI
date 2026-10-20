/**
 * The mock adapter: a `fetch` implementation that answers every API route from memory. Because it
 * replaces only `fetch`, everything else (headers, request ids, timeouts, error normalisation,
 * schemas, the SSE parser) runs exactly as in production. Used by unit tests, Playwright and the
 * demo/offline mode (`VITE_API_MOCK=1`). State (threads, votes) lives per adapter instance.
 */
import type { FetchLike } from '../http/types';
import {
  demoAnswers,
  demoChatAnswer,
  MOCK_FEATURE_FLAGS,
  MOCK_MODEL_STATS,
  MOCK_MODELS,
  MOCK_USER,
  toWireModelStat,
} from './fixtures';
import { isMockScenario, MOCK_SCENARIO_HEADER, type MockScenario } from './scenarios';

export interface MockOptions {
  /** Scenario for every request without an `x-mock-scenario` header. Default `ok`. */
  scenario?: MockScenario | undefined;
  /** Read on every request, before `scenario` (for example from a `?mock=` URL parameter). */
  getScenario?: (() => MockScenario | undefined) | undefined;
  /** Delay before each answer, in milliseconds. Default 0. */
  latencyMs?: number | undefined;
  /** Delay between streamed chunks, in milliseconds. Default 0. */
  streamChunkDelayMs?: number | undefined;
}

interface MockReply {
  status: number;
  /** JSON body; omitted means an empty body. */
  json?: unknown;
  /** Raw text body (served as text/html). */
  text?: string;
  /** SSE frames for a streaming answer. */
  sse?: string[];
  /** Binary audio body. */
  audio?: ArrayBuffer;
  headers?: Record<string, string>;
}

interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
  authorized: boolean;
  scenario: MockScenario;
}

type AuthRule = 'required' | 'optional' | 'none';

interface Route {
  method: string;
  pattern: RegExp;
  auth: AuthRule;
  /** Arena routes answer errors as `ai.error` bodies. */
  arena?: boolean;
  handle: (request: MockRequest, params: string[]) => MockReply;
}

interface WireThread {
  threadId: string;
  userId: string;
  title: string;
  mode: string;
  visibility: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string | null;
}

interface WireMessage {
  messageId: string;
  threadId: string;
  position: number;
  promptText: string;
  model1Name: string;
  model2Name: string;
  model1Response: string;
  model2Response: string;
  model1TimeMs: number;
  model2TimeMs: number;
  comparisonId: string;
  voteChoice: string | null;
  hasVoted: boolean;
  createdAt: string;
}

const VOTE_CHOICES = new Set(['left', 'right', 'tie', 'both-bad']);
const VISIBILITIES = new Set(['private', 'unlisted', 'public']);
const THREAD_MODES = new Set(['battle', 'arena', 'direct']);
const STREAM_CHUNK_BYTES = 48;

const ok = (json: unknown): MockReply => ({ status: 200, json });
const empty = (status: number, headers?: Record<string, string>): MockReply =>
  headers === undefined ? { status } : { status, headers };
const failure = (status: number, error: string, code: string): MockReply => ({
  status,
  json: { success: false, error, code },
});

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function wait(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    if (ms <= 0) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** A tiny valid WAV file: 0.1 s of silence, 8 kHz, 8-bit mono. */
function silentWav(): ArrayBuffer {
  const samples = 800;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i += 1) view.setUint8(44 + i, 128);
  return buffer;
}

/** SSE frames as a byte stream cut every 48 bytes, so lines and characters split across chunks. */
function sseBody(
  frames: string[],
  delayMs: number,
  signal: AbortSignal | null | undefined,
): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(frames.join(''));
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await wait(delayMs, signal);
      } catch (error) {
        controller.error(error);
        return;
      }
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + STREAM_CHUNK_BYTES));
      offset += STREAM_CHUNK_BYTES;
    },
  });
}

const frame = (data: unknown) => `data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`;

function parseBody(body: RequestInit['body']): Record<string, unknown> | 'invalid' {
  if (body === undefined || body === null) return {};
  if (typeof body !== 'string') return 'invalid';
  try {
    const parsed = JSON.parse(body) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : 'invalid';
  } catch {
    return 'invalid';
  }
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export function createMockFetch(options: MockOptions = {}): FetchLike {
  // --- deterministic ids and clock, so tests can assert on them -------------------------------
  let sequence = 0x100;
  let tick = 0;
  let correlation = 0;
  const nextId = () => `00000000-0000-4000-8000-${(sequence++).toString(16).padStart(12, '0')}`;
  const now = () => new Date(Date.UTC(2026, 9, 20, 12, 0, tick++)).toISOString();

  // --- in-memory data ---------------------------------------------------------------------------
  const threads = new Map<string, WireThread>();
  const messages = new Map<string, WireMessage[]>();
  const votes = new Map<string, string>();
  let battles = 0;

  function addThread(title: string, mode: string, visibility: string): WireThread {
    const thread: WireThread = {
      threadId: nextId(),
      userId: MOCK_USER.user_id,
      title,
      mode,
      visibility,
      messageCount: 0,
      createdAt: now(),
      updatedAt: null,
    };
    threads.set(thread.threadId, thread);
    messages.set(thread.threadId, []);
    return thread;
  }

  function pickModels(model1: string, model2: string) {
    const byId = (id: string) => MOCK_MODELS.find(model => model.modelId === id);
    if (model1 !== '' || model2 !== '') return [byId(model1), byId(model2)] as const;
    const first = battles % MOCK_MODELS.length;
    return [MOCK_MODELS[first], MOCK_MODELS[(first + 1) % MOCK_MODELS.length]] as const;
  }

  function wireAnswer(answer: string, model: (typeof MOCK_MODELS)[number], prompt: string, ms: number) {
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(answer.length / 4);
    return {
      object: 'ai.response',
      success: true,
      message: answer,
      output: { type: 'message', content: [{ type: 'output_text', text: answer }] },
      model: { name: model.modelName, displayName: model.displayName, provider: model.providerName },
      prompt,
      selectionMode: 'random',
      responseTimeMs: ms,
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
      timestamp: now(),
    };
  }

  // Seed: one private battle thread with a voted message, one public thread to share.
  {
    const [left, right] = demoAnswers('What makes a good code review?');
    const seeded = addThread('What makes a good code review?', 'battle', 'private');
    const shared = addThread('Explain recursion to a ten-year-old', 'battle', 'public');
    for (const [thread, prompt, choice] of [
      [seeded, 'What makes a good code review?', 'left'],
      [shared, 'Explain recursion to a ten-year-old', null],
    ] as const) {
      messages.get(thread.threadId)?.push({
        messageId: nextId(),
        threadId: thread.threadId,
        position: 0,
        promptText: prompt,
        model1Name: MOCK_MODELS[0]?.modelName ?? '',
        model2Name: MOCK_MODELS[1]?.modelName ?? '',
        model1Response: left,
        model2Response: right,
        model1TimeMs: 1840,
        model2TimeMs: 2310,
        comparisonId: nextId(),
        voteChoice: choice,
        hasVoted: choice !== null,
        createdAt: now(),
      });
      thread.messageCount = 1;
    }
  }

  // --- handlers ---------------------------------------------------------------------------------
  const threadOr404 = (id: string | undefined) =>
    id === undefined ? undefined : threads.get(decodeURIComponent(id));

  const routes: Route[] = [
    {
      method: 'GET',
      pattern: /^\/(?:api\/)?health$/,
      auth: 'none',
      handle: () =>
        ok({
          status: 'healthy',
          message: 'DualMind API is running (mock)',
          timestamp: now(),
          version: '1.0.0-mock',
          instanceId: 'mock',
        }),
    },
    {
      method: 'GET',
      pattern: /^\/api\/models$/,
      auth: 'required',
      handle: request => ok({ items: request.scenario === 'empty' ? [] : MOCK_MODELS }),
    },
    {
      method: 'GET',
      pattern: /^\/api\/models\/([^/]+)$/,
      auth: 'required',
      handle: (_, [id]) => {
        const model = MOCK_MODELS.find(entry => entry.modelId === decodeURIComponent(id ?? ''));
        return model === undefined ? empty(404) : ok(model);
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/arena\/dualchat$/,
      auth: 'required',
      arena: true,
      handle: ({ body }) => {
        const prompt = text(body.prompt);
        if (prompt.trim() === '') return aiError(400, 'INVALID_REQUEST', 'Prompt is required');
        const [model1, model2] = pickModels(text(body.model1), text(body.model2));
        if (model1 === undefined || model2 === undefined) {
          return aiError(400, 'INVALID_REQUEST', 'Unknown model id');
        }
        battles += 1;
        const [left, right] = demoAnswers(prompt);
        const comparisonId = nextId();
        const threadId = text(body.threadId);
        const thread = threads.get(threadId);
        if (thread !== undefined) {
          const list = messages.get(threadId) ?? [];
          list.push({
            messageId: nextId(),
            threadId,
            position: list.length,
            promptText: prompt,
            model1Name: model1.modelName,
            model2Name: model2.modelName,
            model1Response: left,
            model2Response: right,
            model1TimeMs: 1840,
            model2TimeMs: 2310,
            comparisonId,
            voteChoice: null,
            hasVoted: false,
            createdAt: now(),
          });
          thread.messageCount = list.length;
          thread.updatedAt = now();
        }
        return ok({
          success: true,
          comparisonId,
          agent1: wireAnswer(left, model1, prompt, 1840),
          agent2: wireAnswer(right, model2, prompt, 2310),
          arena: {
            comparison: {
              winnerByLength: left.length >= right.length ? 'agent1' : 'agent2',
              winnerByTokens: left.length >= right.length ? 'agent1' : 'agent2',
              verdict: 'Pending user vote',
              userWinner: null,
              agent1MessageLength: left.length,
              agent2MessageLength: right.length,
              agent1Tokens: Math.ceil(left.length / 4),
              agent2Tokens: Math.ceil(right.length / 4),
            },
            models: { agent1: model1.displayName, agent2: model2.displayName },
          },
          timestamp: now(),
          totalResponseTimeMs: 2310,
        });
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/arena\/chat$/,
      auth: 'required',
      arena: true,
      handle: ({ body }) => {
        const prompt = text(body.prompt);
        if (prompt.trim() === '') return aiError(400, 'INVALID_REQUEST', 'Prompt is required');
        const model = MOCK_MODELS.find(entry => entry.modelId === body.model) ?? MOCK_MODELS[0];
        if (model === undefined) return aiError(500, 'API_ERROR', 'No model available');
        return ok(wireAnswer(demoChatAnswer(prompt), model, prompt, 1250));
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/arena\/chat\/stream$/,
      auth: 'required',
      arena: true,
      handle: ({ body, scenario }) => {
        const prompt = text(body.prompt);
        if (prompt.trim() === '') return aiError(400, 'INVALID_REQUEST', 'Prompt is required');
        const words = demoChatAnswer(prompt).split(/(?<=\s)/);
        const deltas = words.map(word =>
          frame({ object: 'ai.stream.delta', delta: { type: 'text', text: word } }),
        );
        if (scenario === 'stream-error') {
          return {
            status: 200,
            sse: [
              ...deltas.slice(0, 3),
              frame({
                object: 'ai.error',
                code: 'STREAM_ERROR',
                message: 'The provider closed the stream',
                timestamp: now(),
              }),
            ],
          };
        }
        const completionTokens = Math.ceil(words.join('').length / 4);
        const promptTokens = Math.ceil(prompt.length / 4);
        return {
          status: 200,
          sse: [
            ': mock stream\n\n',
            ...deltas,
            frame({
              object: 'ai.stream.done',
              finishReason: 'stop',
              usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
            }),
            frame('[DONE]'),
          ],
        };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/arena\/model-vote$/,
      auth: 'required',
      handle: ({ body }) => {
        const comparisonId = text(body.comparisonId);
        const choice = text(body.voteChoice);
        if (comparisonId === '') return failure(400, 'comparisonId is required', 'VALIDATION_ERROR');
        if (!VOTE_CHOICES.has(choice)) return failure(400, 'Invalid vote choice', 'VALIDATION_ERROR');
        if (votes.has(comparisonId)) {
          return failure(400, 'A vote was already recorded for this battle', 'DUPLICATE_VOTE');
        }
        votes.set(comparisonId, choice);
        for (const list of messages.values()) {
          const message = list.find(entry => entry.comparisonId === comparisonId);
          if (message !== undefined) {
            message.voteChoice = choice;
            message.hasVoted = true;
          }
        }
        return ok({ success: true, message: 'Vote recorded' });
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/arena\/model-stats$/,
      auth: 'none',
      handle: ({ scenario }) =>
        ok({
          success: true,
          items: scenario === 'empty' ? [] : MOCK_MODEL_STATS.map(toWireModelStat),
        }),
    },
    {
      method: 'POST',
      pattern: /^\/api\/speech\/generate$/,
      auth: 'required',
      handle: ({ body }) =>
        text(body.text).trim() === ''
          ? failure(400, 'Text is required', 'VALIDATION_ERROR')
          : { status: 200, audio: silentWav() },
    },
    {
      method: 'GET',
      pattern: /^\/api\/threads$/,
      auth: 'required',
      handle: ({ query, scenario }) => {
        const limit = Math.max(1, Math.min(100, Number(query.get('limit') ?? '20') || 20));
        const items = [...threads.values()]
          .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
          .slice(0, limit);
        return ok({ items: scenario === 'empty' ? [] : items });
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/threads$/,
      auth: 'required',
      handle: ({ body }) => {
        const mode = text(body.mode) || 'battle';
        if (!THREAD_MODES.has(mode)) return failure(400, 'Invalid mode', 'VALIDATION_ERROR');
        return ok(addThread(text(body.title) || 'New thread', mode, 'private'));
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/threads\/([^/]+)$/,
      auth: 'optional',
      handle: ({ authorized }, [id]) => {
        const thread = threadOr404(id);
        if (thread === undefined) return failure(404, 'Thread not found', 'NOT_FOUND');
        if (!authorized && thread.visibility === 'private') {
          return failure(403, 'This thread is private', 'FORBIDDEN');
        }
        return ok(thread);
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/threads\/([^/]+)$/,
      auth: 'required',
      handle: ({ body }, [id]) => {
        const thread = threadOr404(id);
        if (thread === undefined) return failure(404, 'Thread not found', 'NOT_FOUND');
        const title = text(body.title).trim();
        if (title === '') return failure(400, 'Title is required', 'VALIDATION_ERROR');
        thread.title = title;
        thread.updatedAt = now();
        return ok({ success: true, message: 'Thread updated' });
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/threads\/([^/]+)$/,
      auth: 'required',
      handle: (_, [id]) => {
        const thread = threadOr404(id);
        if (thread === undefined) return failure(404, 'Thread not found', 'NOT_FOUND');
        threads.delete(thread.threadId);
        messages.delete(thread.threadId);
        return ok({ success: true, message: 'Thread deleted' });
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/threads\/([^/]+)\/messages$/,
      auth: 'optional',
      handle: ({ authorized }, [id]) => {
        const thread = threadOr404(id);
        if (thread === undefined) return failure(404, 'Thread not found', 'NOT_FOUND');
        if (!authorized && thread.visibility === 'private') {
          return failure(403, 'This thread is private', 'FORBIDDEN');
        }
        const list = messages.get(thread.threadId) ?? [];
        // Votes are the caller's own: a visitor without a token sees none.
        return ok({
          items: authorized ? list : list.map(m => ({ ...m, voteChoice: null, hasVoted: false })),
        });
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/threads\/([^/]+)\/visibility$/,
      auth: 'required',
      handle: ({ body }, [id]) => {
        const thread = threadOr404(id);
        if (thread === undefined) return failure(404, 'Thread not found', 'NOT_FOUND');
        const visibility = text(body.visibility);
        if (!VISIBILITIES.has(visibility)) {
          return failure(400, 'Invalid visibility', 'VALIDATION_ERROR');
        }
        thread.visibility = visibility;
        thread.updatedAt = now();
        return ok({ success: true, message: 'Visibility updated', visibility });
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/users\/sync$/,
      auth: 'required',
      handle: ({ body }) =>
        ok({
          success: true,
          user: {
            ...MOCK_USER,
            user_id: text(body.id) || MOCK_USER.user_id,
            email: text(body.email) || MOCK_USER.email,
            name: text(body.name) || MOCK_USER.name,
            avatar_url: typeof body.avatar_url === 'string' ? body.avatar_url : null,
          },
        }),
    },
    {
      // The live API answers 404 here today (KNOWN_ISSUES N7); the mock serves the planned shape.
      method: 'GET',
      pattern: /^\/api\/users\/me$/,
      auth: 'required',
      handle: () => ok(MOCK_USER),
    },
    {
      method: 'GET',
      pattern: /^\/api\/settings\/feature-flag\/([^/]+)$/,
      auth: 'none',
      handle: (_, [key]) => {
        const name = decodeURIComponent(key ?? '');
        return ok({ key: name, enabled: MOCK_FEATURE_FLAGS[name] ?? false });
      },
    },
  ];

  function aiError(status: number, code: string, message: string): MockReply {
    return { status, json: { object: 'ai.error', code, message, timestamp: now() } };
  }

  /** The reply a scenario forces, or undefined to let the route answer. */
  function scenarioReply(
    scenario: MockScenario,
    route: Route,
    requestId: string,
  ): MockReply | undefined {
    switch (scenario) {
      case 'unauthorized':
        return empty(401, { 'www-authenticate': 'Bearer' });
      case 'forbidden':
        return failure(403, 'You do not have access to this resource', 'FORBIDDEN');
      case 'not-found':
        return empty(404);
      case 'validation':
        return route.arena === true
          ? aiError(400, 'INVALID_REQUEST', 'Prompt is required')
          : failure(400, 'Invalid request body', 'VALIDATION_ERROR');
      case 'rate-limited':
        return {
          ...failure(429, 'Too many requests', 'RATE_LIMITED'),
          headers: { 'retry-after': '2' },
        };
      case 'server-error':
        return route.arena === true
          ? aiError(500, 'API_ERROR', 'The model provider failed')
          : failure(500, 'Internal server error', 'INTERNAL_ERROR');
      case 'bad-gateway':
        return { status: 502, json: { error: 'bad_gateway', requestId } };
      case 'gateway-timeout':
        return { status: 504, json: { error: 'gateway_timeout', requestId } };
      case 'malformed':
        return { status: 200, text: '<!doctype html><title>DualMind waitlist</title>' };
      default:
        return undefined;
    }
  }

  function toResponse(
    reply: MockReply,
    signal: AbortSignal | null | undefined,
    requestId: string,
  ): Response {
    correlation += 1;
    const headers = new Headers({
      'x-correlation-id': correlation.toString(16).padStart(8, '0'),
      // Like the Worker proxy: the request id comes back on every response.
      'x-request-id': requestId,
      'x-dualmind-mock': '1',
      ...reply.headers,
    });
    if (reply.sse !== undefined) {
      headers.set('content-type', 'text/event-stream; charset=utf-8');
      const body = sseBody(reply.sse, options.streamChunkDelayMs ?? 0, signal);
      return new Response(body, { status: reply.status, headers });
    }
    if (reply.audio !== undefined) {
      headers.set('content-type', 'audio/wav');
      return new Response(reply.audio, { status: reply.status, headers });
    }
    if (reply.text !== undefined) {
      headers.set('content-type', 'text/html; charset=utf-8');
      return new Response(reply.text, { status: reply.status, headers });
    }
    if (reply.json === undefined) return new Response(null, { status: reply.status, headers });
    headers.set('content-type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(reply.json), { status: reply.status, headers });
  }

  return async (input, init) => {
    const url = new URL(input, 'http://mock.invalid');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    const signal = init.signal;
    const requestId = headers.get('x-request-id') ?? `mock-${(correlation + 1).toString(16)}`;

    const requested =
      headers.get(MOCK_SCENARIO_HEADER) ?? options.getScenario?.() ?? options.scenario;
    let scenario: MockScenario = 'ok';
    if (requested !== undefined) {
      if (!isMockScenario(requested)) {
        return toResponse(
          failure(400, `Unknown mock scenario "${requested}"`, 'MOCK_UNKNOWN_SCENARIO'),
          signal,
          requestId,
        );
      }
      scenario = requested;
    }

    await wait(options.latencyMs ?? 0, signal);
    if (scenario === 'network-error') throw new TypeError('Failed to fetch');
    if (scenario === 'timeout') {
      await new Promise<never>((_, reject) => {
        if (signal?.aborted) reject(abortError());
        signal?.addEventListener('abort', () => reject(abortError()), { once: true });
      });
    }

    let params: string[] = [];
    const route = routes.find(candidate => {
      if (candidate.method !== method) return false;
      const match = candidate.pattern.exec(url.pathname);
      if (match === null) return false;
      params = match.slice(1);
      return true;
    });
    if (route === undefined) return toResponse(empty(404), signal, requestId);

    const token = /^Bearer\s+(\S+)$/i.exec(headers.get('authorization') ?? '')?.[1];
    const authorized = token !== undefined;
    if (route.auth === 'required' && !authorized) {
      return toResponse(empty(401, { 'www-authenticate': 'Bearer' }), signal, requestId);
    }

    const forced = scenarioReply(scenario, route, requestId);
    if (forced !== undefined) return toResponse(forced, signal, requestId);

    const body = parseBody(init.body);
    if (body === 'invalid') {
      return toResponse(
        failure(400, 'The request body is not valid JSON', 'INVALID_JSON'),
        signal,
        requestId,
      );
    }
    const reply = route.handle(
      { method, path: url.pathname, query: url.searchParams, body, authorized, scenario },
      params,
    );
    return toResponse(reply, signal, requestId);
  };
}
