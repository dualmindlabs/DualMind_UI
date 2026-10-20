import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { pathSegment } from '../http/url';
import { type MutationResult, mutationResultSchema } from '../schemas/common';
import {
  type Thread,
  THREAD_MODES,
  threadListSchema,
  type ThreadMessage,
  threadMessageListSchema,
  type ThreadMode,
  threadSchema,
  VISIBILITIES,
  type Visibility,
  type VisibilityResult,
  visibilityResultSchema,
} from '../schemas/threads';
import { compact, oneOf, optionalPositiveInt, requireText } from './input';

export const DEFAULT_THREAD_LIMIT = 20;
export const MAX_THREAD_LIMIT = 100;
export const THREAD_TITLE_MAX_LENGTH = 40;

/** The title the Arena gives a new thread: the first prompt, one line, cut to 40 characters. */
export function toThreadTitle(prompt: string, maxLength = THREAD_TITLE_MAX_LENGTH): string {
  const oneLine = prompt.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLength) return oneLine;
  return `${oneLine.slice(0, maxLength).trimEnd()}...`;
}

export interface ListThreadsInput {
  /** 1-100, default 20. The API has no cursor yet (endpoints.md, gap 5). */
  limit?: number | undefined;
}

export interface CreateThreadInput {
  title?: string | undefined;
  mode?: ThreadMode | undefined;
}

export interface RenameThreadInput {
  threadId: string;
  title: string;
}

export interface SetThreadVisibilityInput {
  threadId: string;
  visibility: Visibility;
}

/** A shared thread as a visitor sees it. */
export interface SharedThread {
  thread: Thread;
  messages: ThreadMessage[];
}

export interface ThreadEndpoints {
  /** `GET /api/threads?limit=`: the signed-in user's threads, newest first. */
  listThreads: (input?: ListThreadsInput, options?: CallOptions) => Promise<Thread[]>;
  /** `POST /api/threads`. New threads are private. Not idempotent, never retried. */
  createThread: (input?: CreateThreadInput, options?: CallOptions) => Promise<Thread>;
  /**
   * `GET /api/threads/{id}` with the token when there is one: the owner sees a private thread,
   * anyone sees a public or unlisted one while `public_sharing` is on. Use it to read the current
   * visibility (the legacy app called a method that did not exist and always showed `private`).
   */
  getThread: (threadId: string, options?: CallOptions) => Promise<Thread>;
  /** `GET /api/threads/{id}/messages`, oldest first. With a token, votes are the caller's. */
  listThreadMessages: (threadId: string, options?: CallOptions) => Promise<ThreadMessage[]>;
  /** `PATCH /api/threads/{id}` with `{ title }`. Owner only. */
  renameThread: (input: RenameThreadInput, options?: CallOptions) => Promise<MutationResult>;
  /** `DELETE /api/threads/{id}`. Owner only; a second call answers 404 (`not_found`). */
  deleteThread: (threadId: string, options?: CallOptions) => Promise<MutationResult>;
  /** `PATCH /api/threads/{id}/visibility`. Owner only. */
  setThreadVisibility: (
    input: SetThreadVisibilityInput,
    options?: CallOptions,
  ) => Promise<VisibilityResult>;
  /**
   * The public share view: thread and messages, both **without** a token, so the result is what
   * any visitor sees (an owner opening their own link gets the real answer, not their private
   * view). A private thread rejects with `auth` or `forbidden`.
   */
  getSharedThread: (threadId: string, options?: CallOptions) => Promise<SharedThread>;
}

export function createThreadEndpoints(transport: Transport): ThreadEndpoints {
  const threadPath = (threadId: string) => `/api/threads/${pathSegment(threadId, 'threadId')}`;

  return {
    listThreads: async (input = {}, options) =>
      await transport.json(
        {
          method: 'GET',
          path: '/api/threads',
          query: {
            limit:
              optionalPositiveInt(input.limit, 'limit', MAX_THREAD_LIMIT) ?? DEFAULT_THREAD_LIMIT,
          },
          auth: 'required',
          schema: threadListSchema,
        },
        options,
      ),

    createThread: async (input = {}, options) =>
      await transport.json(
        {
          method: 'POST',
          path: '/api/threads',
          auth: 'required',
          body: compact({
            title: input.title?.trim() || undefined,
            mode: input.mode === undefined ? undefined : oneOf(input.mode, THREAD_MODES, 'mode'),
          }),
          schema: threadSchema,
        },
        options,
      ),

    getThread: async (threadId, options) =>
      await transport.json(
        { method: 'GET', path: threadPath(threadId), auth: 'optional', schema: threadSchema },
        options,
      ),

    listThreadMessages: async (threadId, options) =>
      await transport.json(
        {
          method: 'GET',
          path: `${threadPath(threadId)}/messages`,
          auth: 'optional',
          schema: threadMessageListSchema,
        },
        options,
      ),

    renameThread: async (input, options) =>
      await transport.json(
        {
          method: 'PATCH',
          path: threadPath(input.threadId),
          auth: 'required',
          body: { title: requireText(input.title, 'title').trim() },
          schema: mutationResultSchema,
        },
        options,
      ),

    deleteThread: async (threadId, options) =>
      await transport.json(
        {
          method: 'DELETE',
          path: threadPath(threadId),
          auth: 'required',
          schema: mutationResultSchema,
        },
        options,
      ),

    setThreadVisibility: async (input, options) =>
      await transport.json(
        {
          method: 'PATCH',
          path: `${threadPath(input.threadId)}/visibility`,
          auth: 'required',
          body: { visibility: oneOf(input.visibility, VISIBILITIES, 'visibility') },
          schema: visibilityResultSchema,
        },
        options,
      ),

    getSharedThread: async (threadId, options) => {
      const path = threadPath(threadId);
      const [thread, messages] = await Promise.all([
        transport.json({ method: 'GET', path, auth: 'none', schema: threadSchema }, options),
        transport.json(
          {
            method: 'GET',
            path: `${path}/messages`,
            auth: 'none',
            schema: threadMessageListSchema,
          },
          options,
        ),
      ]);
      return { thread, messages };
    },
  };
}
