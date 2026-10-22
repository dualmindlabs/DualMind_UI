/**
 * Reads everything an export needs from the API: the thread list (`GET /api/threads`, at most
 * EXPORT_THREAD_LIMIT, newest first), then each thread's messages, a few at a time. Threads are
 * handed on in list order as soon as they and every thread before them have arrived, so a writer
 * can stream the file and memory holds only the threads still waiting for an earlier one.
 *
 * One failed thread fails the export (after the transport's own retries of a GET): a file that
 * silently misses conversations would be worse than a clear error and a retry. Cancelling the
 * signal stops every request in flight.
 */
import type { ApiClient, Thread } from '@/lib/api';

import { EXPORT_THREAD_LIMIT, type ExportThread } from './export-format';

/** Messages requests in flight at once: quick for 100 threads, gentle on the rate limits. */
export const EXPORT_CONCURRENCY = 4;

export type ExportSource = Pick<ApiClient, 'listThreads' | 'listThreadMessages'>;

export interface ExportListing {
  threads: Thread[];
  /** The list came back full: older threads may exist that the API did not list. */
  truncated: boolean;
}

export interface StreamExportOptions {
  signal?: AbortSignal;
  /** The thread list is known (before any messages are read). */
  onList?: (listing: ExportListing) => void;
  /** One thread with its messages, in list order. */
  onThread?: (entry: ExportThread, index: number) => void;
  /** After each thread's messages arrive: how many are read so far. */
  onProgress?: (done: number, total: number) => void;
  concurrency?: number;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The export was canceled.', 'AbortError');
}

/** Reads the threads and their messages; resolves with the listing once every thread is out. */
export async function streamExport(
  source: ExportSource,
  {
    signal,
    onList,
    onThread,
    onProgress,
    concurrency = EXPORT_CONCURRENCY,
  }: StreamExportOptions = {},
): Promise<ExportListing> {
  // Our own controller: a failed thread stops the others, and so does the caller's signal.
  const controller = new AbortController();
  const stop = () => controller.abort(signal ? abortReason(signal) : undefined);
  if (signal?.aborted) throw abortReason(signal);
  signal?.addEventListener('abort', stop, { once: true });

  try {
    const threads = await source.listThreads(
      { limit: EXPORT_THREAD_LIMIT },
      { signal: controller.signal },
    );
    const listing: ExportListing = {
      threads,
      truncated: threads.length >= EXPORT_THREAD_LIMIT,
    };
    onList?.(listing);
    onProgress?.(0, threads.length);

    const waiting = new Map<number, ExportThread>();
    let nextOut = 0;
    let nextIn = 0;
    let done = 0;

    const flush = () => {
      for (let entry = waiting.get(nextOut); entry; entry = waiting.get(nextOut)) {
        waiting.delete(nextOut);
        onThread?.(entry, nextOut);
        nextOut += 1;
      }
    };

    const worker = async () => {
      while (nextIn < threads.length) {
        if (controller.signal.aborted) throw abortReason(controller.signal);
        const index = nextIn;
        nextIn += 1;
        const thread = threads[index];
        if (!thread) continue;
        const messages = await source.listThreadMessages(thread.threadId, {
          signal: controller.signal,
        });
        waiting.set(index, { thread, messages });
        done += 1;
        onProgress?.(done, threads.length);
        flush();
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(Math.max(1, concurrency), threads.length) }, worker),
      );
    } catch (error) {
      controller.abort(error);
      throw error;
    }
    return listing;
  } finally {
    signal?.removeEventListener('abort', stop);
  }
}
