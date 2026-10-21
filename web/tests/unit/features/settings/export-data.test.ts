import { describe, expect, it, vi } from 'vitest';

import { type ExportSource, streamExport } from '@/features/settings/lib/export-data';
import { EXPORT_THREAD_LIMIT } from '@/features/settings/lib/export-format';
import type { CallOptions, Thread, ThreadMessage } from '@/lib/api';

// Slice S12: reading an export from the threads API: the list, then the messages a few at a
// time, handed on in list order, with progress, cancellation and a clear failure.

function threads(count: number): Thread[] {
  return Array.from({ length: count }, (_, index) => ({
    threadId: `t-${index}`,
    userId: 'u-1',
    title: `Thread ${index}`,
    mode: 'battle' as const,
    visibility: 'private' as const,
    messageCount: 1,
    createdAt: null,
    updatedAt: null,
  }));
}

function messagesFor(threadId: string): ThreadMessage[] {
  return [
    {
      messageId: `${threadId}-m`,
      threadId,
      position: 0,
      promptText: `Prompt of ${threadId}`,
      model1Name: 'a',
      model2Name: 'b',
      model1Response: 'A',
      model2Response: 'B',
      model1TimeMs: null,
      model2TimeMs: null,
      comparisonId: null,
      voteChoice: null,
      hasVoted: false,
      createdAt: null,
    },
  ];
}

/** Answers out of order on purpose: later threads arrive first. */
function source(list: Thread[], options: { failOn?: string } = {}) {
  let inFlight = 0;
  let maxInFlight = 0;
  const api: ExportSource = {
    listThreads: vi.fn(() => Promise.resolve(list)),
    listThreadMessages: vi.fn(async (threadId: string, callOptions?: CallOptions) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const index = Number(threadId.slice(2));
      await new Promise(resolve => setTimeout(resolve, (list.length - index) * 2));
      inFlight -= 1;
      if (callOptions?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (threadId === options.failOn) throw new Error(`boom ${threadId}`);
      return messagesFor(threadId);
    }),
  };
  return { api, maxInFlight: () => maxInFlight };
}

describe('streamExport', () => {
  it('asks for the most threads the API lists and hands them on in list order', async () => {
    const list = threads(9);
    const { api, maxInFlight } = source(list);
    const seen: string[] = [];
    const progress: Array<[number, number]> = [];
    const onList = vi.fn();
    const listing = await streamExport(api, {
      concurrency: 3,
      onList,
      onThread: (entry, index) => {
        expect(entry.thread.threadId).toBe(`t-${index}`);
        expect(entry.messages[0]?.promptText).toBe(`Prompt of t-${index}`);
        seen.push(entry.thread.threadId);
      },
      onProgress: (done, total) => progress.push([done, total]),
    });
    expect(api.listThreads).toHaveBeenCalledWith(
      { limit: EXPORT_THREAD_LIMIT },
      expect.objectContaining({ signal: expect.any(AbortSignal) as unknown }),
    );
    expect(onList).toHaveBeenCalledWith({ threads: list, truncated: false });
    expect(seen).toEqual(list.map(item => item.threadId));
    expect(progress[0]).toEqual([0, 9]);
    expect(progress.at(-1)).toEqual([9, 9]);
    expect(maxInFlight()).toBeLessThanOrEqual(3);
    expect(maxInFlight()).toBeGreaterThan(1);
    expect(listing.truncated).toBe(false);
  });

  it('says the list may be cut when it comes back full', async () => {
    const { api } = source(threads(EXPORT_THREAD_LIMIT));
    const listing = await streamExport(api, { concurrency: 8 });
    expect(listing.truncated).toBe(true);
  });

  it('finishes at once with no threads', async () => {
    const { api } = source([]);
    const onThread = vi.fn();
    const listing = await streamExport(api, { onThread });
    expect(listing.threads).toEqual([]);
    expect(onThread).not.toHaveBeenCalled();
    expect(api.listThreadMessages).not.toHaveBeenCalled();
  });

  it('fails the whole export when one thread fails, and stops the rest', async () => {
    const { api } = source(threads(12), { failOn: 't-2' });
    await expect(streamExport(api, { concurrency: 2 })).rejects.toThrow('boom t-2');
    // Not every thread was asked for: the failure stopped the queue.
    expect(vi.mocked(api.listThreadMessages).mock.calls.length).toBeLessThan(12);
  });

  it('stops when the caller cancels', async () => {
    const { api } = source(threads(20));
    const controller = new AbortController();
    const run = streamExport(api, {
      signal: controller.signal,
      concurrency: 2,
      onProgress: done => {
        if (done === 2) controller.abort();
      },
    });
    await expect(run).rejects.toBeDefined();
    expect(vi.mocked(api.listThreadMessages).mock.calls.length).toBeLessThan(20);
  });

  it('rejects at once when the signal is already cancelled', async () => {
    const { api } = source(threads(3));
    const controller = new AbortController();
    controller.abort();
    await expect(streamExport(api, { signal: controller.signal })).rejects.toBeDefined();
    expect(api.listThreads).not.toHaveBeenCalled();
  });
});
