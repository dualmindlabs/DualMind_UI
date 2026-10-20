import { vi } from 'vitest';

import type { FetchLike } from '@/lib/api';

export interface RecordedCall {
  url: string;
  init: RequestInit;
  headers: Headers;
  body: unknown;
}

type Reply = Response | Error | ((call: RecordedCall) => Response | Promise<Response>);

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  return new Response(body === undefined ? null : JSON.stringify(body), { ...init, headers });
}

/**
 * A fetch that answers with `replies` in order (the last one repeats) and records every call.
 * A reply can be a Response, an Error to reject with, or a function of the call.
 */
export function scriptedFetch(...replies: Reply[]) {
  const calls: RecordedCall[] = [];
  const fetch = vi.fn<FetchLike>(async (url, init) => {
    const call: RecordedCall = {
      url,
      init,
      headers: new Headers(init.headers),
      body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    };
    calls.push(call);
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply === undefined) throw new Error('scriptedFetch: no reply configured');
    if (reply instanceof Error) throw reply;
    if (typeof reply === 'function') return reply(call);
    return reply.clone();
  });
  return { fetch, calls };
}

/** A fetch that never answers, until its signal aborts (then rejects like the real one). */
export function hangingFetch() {
  return vi.fn<FetchLike>(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        const { signal } = init;
        const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal?.aborted) abort();
        signal?.addEventListener('abort', abort, { once: true });
      }),
  );
}

/** A byte stream from string or byte chunks; `cancelled` turns true when the reader cancels it. */
export function byteStream(chunks: readonly (string | Uint8Array)[], options: { hang?: boolean } = {}) {
  const encoder = new TextEncoder();
  const state = { cancelled: false };
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index];
      index += 1;
      if (chunk === undefined) {
        if (options.hang === true) return new Promise<void>(() => undefined);
        controller.close();
        return undefined;
      }
      controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      return undefined;
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return { stream, state };
}

export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

/** The rejection of `promise`, failing the test when it resolves. */
export async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the promise to reject');
}

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
