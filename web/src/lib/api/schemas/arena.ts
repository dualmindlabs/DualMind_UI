import { z } from 'zod';

import {
  isRecord,
  mutationResultSchema,
  optionalNumber,
  optionalString,
  type Usage,
  usageSchema,
  withAliases,
} from './common';

export const VOTE_CHOICES = ['left', 'right', 'tie', 'both-bad'] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export const SELECTION_MODES = ['random', 'topper'] as const;
export type SelectionMode = (typeof SELECTION_MODES)[number];

/**
 * The model that answered. Chat responses send an object `{ name, displayName, provider }`;
 * older shapes send just a name.
 */
export const answerModelSchema = z.preprocess(
  (input: unknown) => (typeof input === 'string' ? { name: input } : input),
  withAliases(
    z.object({
      id: optionalString,
      name: z.string().min(1),
      displayName: optionalString,
      provider: optionalString,
    }),
    { id: ['modelId'], name: ['modelName'], provider: ['providerName'] },
  ),
);

export type AnswerModel = z.output<typeof answerModelSchema>;

/**
 * The answer text lives in one of three places (endpoints.md, "Response envelope quirks"):
 * `output.content[]` parts of type `output_text`, then `message`, then `text`.
 */
export function extractAnswerText(raw: Record<string, unknown>): string {
  const output = raw.output;
  if (isRecord(output) && Array.isArray(output.content)) {
    const parts = output.content
      .filter(isRecord)
      .filter(part => part.type === 'output_text' && typeof part.text === 'string')
      .map(part => part.text as string);
    if (parts.length > 0 && parts.join('') !== '') return parts.join('');
  }
  if (typeof raw.message === 'string' && raw.message !== '') return raw.message;
  if (typeof raw.text === 'string') return raw.text;
  return '';
}

/**
 * One model's answer (`POST /api/arena/chat`, and `agent1`/`agent2` of a battle), normalised to
 * `{ text, model, usage, finishReason, responseTimeMs, timestamp }`. For a blind battle the UI
 * must not show `model` before the vote: the API sends it, hiding it is the UI's job.
 */
export const answerSchema = z.preprocess(
  (input: unknown) => (isRecord(input) ? { ...input, text: extractAnswerText(input) } : input),
  withAliases(
    z.object({
      text: z.string(),
      model: answerModelSchema.nullish().catch(null).transform(value => value ?? null),
      usage: usageSchema.nullish().catch(null).transform(value => value ?? null),
      finishReason: optionalString.catch(null),
      responseTimeMs: optionalNumber.catch(null),
      timestamp: optionalString.catch(null),
    }),
  ),
);

export type Answer = z.output<typeof answerSchema>;

/** `arena` block of a battle: length and token comparisons. Informational; a bad block is dropped. */
const battleArenaSchema = z
  .object({
    comparison: withAliases(
      z.object({
        winnerByLength: optionalString,
        winnerByTokens: optionalString,
        verdict: optionalString,
        agent1MessageLength: optionalNumber,
        agent2MessageLength: optionalNumber,
        agent1Tokens: optionalNumber,
        agent2Tokens: optionalNumber,
      }),
    ),
  })
  .nullish()
  .catch(null)
  .transform(value => value?.comparison ?? null);

/**
 * `POST /api/arena/dualchat`: two answers to one prompt and the `comparisonId` the vote refers
 * to. `agent1` is shown on the left (Mind A), `agent2` on the right (Mind B).
 */
export const battleSchema = withAliases(
  z.object({
    comparisonId: z.string().min(1),
    agent1: answerSchema,
    agent2: answerSchema,
    arena: battleArenaSchema,
    totalResponseTimeMs: optionalNumber.catch(null),
    timestamp: optionalString.catch(null),
  }),
).transform(({ arena, ...battle }) => ({ ...battle, comparison: arena }));

export type Battle = z.output<typeof battleSchema>;

/** `POST /api/arena/model-vote`: `{ success, message }`. It does not return new ratings (B-2). */
export const voteResultSchema = mutationResultSchema;
export type VoteResult = z.output<typeof voteResultSchema>;

// --- Streaming (`POST /api/arena/chat/stream`) ------------------------------------------------

const streamDeltaSchema = z.object({
  object: z.literal('ai.stream.delta'),
  delta: z
    .object({ type: optionalString, text: z.string().nullish() })
    .transform(delta => delta.text ?? ''),
});

const streamDoneSchema = withAliases(
  z.object({
    object: z.literal('ai.stream.done'),
    finishReason: optionalString,
    usage: usageSchema.nullish().catch(null).transform(value => value ?? null),
  }),
);

const streamErrorSchema = z.object({
  object: z.literal('ai.error'),
  code: optionalString,
  message: optionalString,
  timestamp: optionalString,
});

/** One parsed SSE event of the chat stream, before it becomes a `ChatStreamEvent`. */
export const streamEventSchema = z.union([streamDeltaSchema, streamDoneSchema, streamErrorSchema]);

export type RawStreamEvent = z.output<typeof streamEventSchema>;

/** What `streamChat()` yields. */
export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; finishReason: string | null; usage: Usage | null };
