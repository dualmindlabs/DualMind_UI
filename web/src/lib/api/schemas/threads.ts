import { z } from 'zod';

import { VOTE_CHOICES } from './arena';
import { count, flag, listOf, optionalNumber, optionalString, withAliases } from './common';

export const THREAD_MODES = ['battle', 'arena', 'direct'] as const;
export type ThreadMode = (typeof THREAD_MODES)[number];

export const VISIBILITIES = ['private', 'unlisted', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/**
 * A thread. Responses use `threadId`; older code also saw `id` and `thread_id`.
 * An unknown `visibility` reads as `private` (the safe side); an unknown `mode` as `battle`
 * (messages are battle-shaped either way).
 */
export const threadSchema = withAliases(
  z.object({
    threadId: z.string().min(1),
    userId: optionalString,
    title: optionalString,
    mode: z.enum(THREAD_MODES).catch('battle'),
    visibility: z.enum(VISIBILITIES).catch('private'),
    messageCount: count,
    createdAt: optionalString,
    updatedAt: optionalString,
  }),
  { threadId: ['id'] },
).transform(thread => ({ ...thread, title: thread.title ?? 'Untitled' }));

export const threadListSchema = listOf(threadSchema);

export type Thread = z.output<typeof threadSchema>;

/**
 * One row of `GET /api/threads/{id}/messages`: a prompt and both answers. With a token,
 * `voteChoice` and `hasVoted` describe the caller's own vote.
 */
export const threadMessageSchema = withAliases(
  z.object({
    messageId: z.string().min(1),
    threadId: optionalString,
    position: count,
    promptText: z.string().catch(''),
    model1Name: optionalString,
    model2Name: optionalString,
    model1Response: z.string().catch(''),
    model2Response: z.string().catch(''),
    model1TimeMs: optionalNumber,
    model2TimeMs: optionalNumber,
    comparisonId: optionalString,
    voteChoice: z
      .enum(VOTE_CHOICES)
      .nullish()
      .catch(null)
      .transform(value => value ?? null),
    hasVoted: flag(false),
    createdAt: optionalString,
  }),
  { messageId: ['id'], promptText: ['prompt'] },
).transform(message => ({ ...message, hasVoted: message.hasVoted || message.voteChoice !== null }));

export const threadMessageListSchema = listOf(threadMessageSchema);

export type ThreadMessage = z.output<typeof threadMessageSchema>;

/** `PATCH /api/threads/{id}/visibility`: `{ success, message, visibility }`. */
export const visibilityResultSchema = z.preprocess(
  (input: unknown) => (input === null || input === undefined ? {} : input),
  z.object({
    success: flag(true),
    message: optionalString,
    visibility: z.enum(VISIBILITIES).optional().catch(undefined),
  }),
);

export type VisibilityResult = z.output<typeof visibilityResultSchema>;
