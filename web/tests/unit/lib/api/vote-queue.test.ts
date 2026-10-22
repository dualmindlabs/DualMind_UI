import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  type ApiErrorKind,
  createVoteQueue,
  type QueuedVote,
  type StorageLike,
  VOTE_QUEUE_STORAGE_KEY,
  type VoteInput,
  type VoteQueueOptions,
} from '@/lib/api';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: key => {
      data.delete(key);
    },
  };
  return { storage, data };
}

const failure = (kind: ApiErrorKind, status = 0) =>
  new ApiError({ kind, status, message: kind, code: kind.toUpperCase() });

const vote = (comparisonId: string, voteChoice: VoteInput['voteChoice'] = 'left'): VoteInput => ({
  comparisonId,
  voteChoice,
});

function setup(overrides: Partial<VoteQueueOptions> = {}) {
  const { storage, data } = memoryStorage();
  const send = vi.fn<(vote: VoteInput) => Promise<unknown>>(() =>
    Promise.resolve({ success: true }),
  );
  const events = new EventTarget();
  let online = true;
  let clock = Date.parse('2026-10-20T12:00:00Z');
  const queue = createVoteQueue({
    send,
    storage,
    eventTarget: events,
    isOnline: () => online,
    now: () => clock,
    random: () => 0,
    baseDelayMs: 1_000,
    maxDelayMs: 8_000,
    ...overrides,
  });
  return {
    queue,
    send,
    data,
    events,
    setOnline: (value: boolean) => {
      online = value;
    },
    advanceClock: (ms: number) => {
      clock += ms;
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('submit', () => {
  it('sends the vote and stores nothing when it succeeds', async () => {
    const { queue, send, data } = setup();
    await expect(queue.submit({ ...vote('c-1'), voteDurationMs: 1200 })).resolves.toEqual({
      status: 'sent',
    });
    expect(send).toHaveBeenCalledWith({
      comparisonId: 'c-1',
      voteChoice: 'left',
      voteDurationMs: 1200,
    });
    expect(data.size).toBe(0);
  });

  it('queues the vote in versioned storage on a transient failure', async () => {
    const { queue, send, data } = setup();
    const error = failure('network');
    send.mockRejectedValueOnce(error);

    await expect(queue.submit(vote('c-1', 'tie'))).resolves.toEqual({ status: 'queued', error });

    const stored = JSON.parse(data.get(VOTE_QUEUE_STORAGE_KEY) ?? 'null') as unknown;
    expect(VOTE_QUEUE_STORAGE_KEY).toBe('dm.voteQueue.v1');
    expect(stored).toEqual({
      version: 1,
      votes: [
        {
          comparisonId: 'c-1',
          voteChoice: 'tie',
          queuedAt: Date.parse('2026-10-20T12:00:00Z'),
          attempts: 1,
          lastError: 'NETWORK',
        },
      ],
    });
  });

  it('rethrows a permanent failure and queues nothing', async () => {
    const { queue, send } = setup();
    send.mockRejectedValueOnce(failure('validation', 400));
    await expect(queue.submit(vote('c-1'))).rejects.toMatchObject({ kind: 'validation' });
    send.mockRejectedValueOnce(new Error('a bug, not an API error'));
    await expect(queue.submit(vote('c-2'))).rejects.toBeInstanceOf(ApiError);
    expect(queue.size()).toBe(0);
  });

  it('shows a vote the API already counted (409) as sent, not as an error', async () => {
    const { queue, send } = setup();
    send.mockRejectedValueOnce(failure('validation', 409));
    await expect(queue.submit(vote('c-dup'))).resolves.toEqual({ status: 'sent' });
    expect(queue.size()).toBe(0);
  });

  it.each([
    ['forbidden', 403],
    ['not_found', 404],
    ['validation', 400],
  ] as const)(
    'rethrows a %s (%i) so the caller stops, and never queues it',
    async (kind, status) => {
      const { queue, send, setOnline } = setup();
      send.mockRejectedValue(failure(kind, status));
      await expect(queue.submit(vote('c-1'))).rejects.toMatchObject({ kind, status });
      expect(queue.size()).toBe(0);
      // Nothing is retried later either: no timer, no second send.
      setOnline(true);
      await queue.flush();
      expect(send).toHaveBeenCalledOnce();
    },
  );

  it('queues without sending while offline', async () => {
    const { queue, send, setOnline } = setup();
    setOnline(false);
    await expect(queue.submit(vote('c-1'))).resolves.toEqual({ status: 'queued', error: null });
    expect(send).not.toHaveBeenCalled();
    expect(queue.list()).toMatchObject([{ comparisonId: 'c-1', attempts: 0, lastError: null }]);
  });

  it('never sends a comparison twice', async () => {
    const { queue, send } = setup();
    expect(queue.enqueue(vote('c-1', 'left'))).toBe(true);
    expect(queue.enqueue(vote('c-1', 'right'))).toBe(false);
    await expect(queue.submit(vote('c-1', 'right'))).resolves.toEqual({
      status: 'queued',
      error: null,
    });
    expect(send).not.toHaveBeenCalled();
    expect(queue.list()).toMatchObject([{ comparisonId: 'c-1', voteChoice: 'left' }]);
  });

  it('keeps only the newest maxEntries votes', () => {
    const { queue } = setup({ maxEntries: 2 });
    for (const id of ['a', 'b', 'c']) queue.enqueue(vote(id));
    expect(queue.list().map(entry => entry.comparisonId)).toEqual(['b', 'c']);
  });
});

describe('flush', () => {
  it('sends queued votes oldest first and empties the queue', async () => {
    const { queue, send, data } = setup();
    queue.enqueue({ ...vote('a'), voteDurationMs: 900 });
    queue.enqueue(vote('b', 'both-bad'));

    await expect(queue.flush()).resolves.toEqual({ sent: 2, dropped: 0, remaining: 0 });
    expect(send.mock.calls.map(([sent]) => sent)).toEqual([
      { comparisonId: 'a', voteChoice: 'left', voteDurationMs: 900 },
      { comparisonId: 'b', voteChoice: 'both-bad' },
    ]);
    expect(data.has(VOTE_QUEUE_STORAGE_KEY)).toBe(false);
  });

  it('drops votes the API rejects for good, such as a duplicate', async () => {
    const { queue, send } = setup();
    queue.enqueue(vote('dup'));
    queue.enqueue(vote('gone'));
    queue.enqueue(vote('ok'));
    send
      .mockRejectedValueOnce(failure('validation', 400))
      .mockRejectedValueOnce(failure('not_found', 404));
    await expect(queue.flush()).resolves.toEqual({ sent: 1, dropped: 2, remaining: 0 });
  });

  it('drops a queued vote that comes back 409, 403 or 404 and goes on with the next', async () => {
    const { queue, send } = setup();
    for (const id of ['dup', 'not-yours', 'gone', 'ok']) queue.enqueue(vote(id));
    send
      .mockRejectedValueOnce(failure('validation', 409))
      .mockRejectedValueOnce(failure('forbidden', 403))
      .mockRejectedValueOnce(failure('not_found', 404));
    await expect(queue.flush()).resolves.toEqual({ sent: 1, dropped: 3, remaining: 0 });
    expect(send).toHaveBeenCalledTimes(4);
  });

  it('counts a 2xx with an unreadable body as sent', async () => {
    const { queue, send } = setup();
    queue.enqueue(vote('a'));
    send.mockRejectedValueOnce(failure('bad_response', 200));
    await expect(queue.flush()).resolves.toEqual({ sent: 1, dropped: 0, remaining: 0 });
  });

  it('stops at the first transient failure and counts the attempt', async () => {
    const { queue, send } = setup();
    queue.enqueue(vote('a'));
    queue.enqueue(vote('b'));
    send.mockRejectedValueOnce(failure('server', 503));

    await expect(queue.flush()).resolves.toEqual({ sent: 0, dropped: 0, remaining: 2 });
    expect(send).toHaveBeenCalledOnce();
    expect(queue.list()).toMatchObject([
      { comparisonId: 'a', attempts: 1, lastError: 'SERVER' },
      { comparisonId: 'b', attempts: 0 },
    ]);
  });

  it('keeps votes while signed out, without counting the attempt as fatal', async () => {
    const { queue, send } = setup({ maxAttempts: 1 });
    queue.enqueue(vote('a'));
    send.mockRejectedValueOnce(failure('auth', 401));
    await expect(queue.flush()).resolves.toEqual({ sent: 0, dropped: 0, remaining: 1 });
  });

  it('drops a vote after maxAttempts and votes older than maxAgeMs', async () => {
    const { queue, send, advanceClock } = setup({ maxAttempts: 2, maxAgeMs: 60_000 });
    queue.enqueue(vote('old'));
    advanceClock(61_000);
    queue.enqueue(vote('flaky'));
    send.mockRejectedValue(failure('timeout'));

    await expect(queue.flush()).resolves.toEqual({ sent: 0, dropped: 1, remaining: 1 });
    await expect(queue.flush()).resolves.toEqual({ sent: 0, dropped: 1, remaining: 0 });
  });

  it('stops when the browser goes offline', async () => {
    const { queue, send, setOnline } = setup();
    queue.enqueue(vote('a'));
    setOnline(false);
    await expect(queue.flush()).resolves.toEqual({ sent: 0, dropped: 0, remaining: 1 });
    expect(send).not.toHaveBeenCalled();
  });

  it('runs one flush at a time', async () => {
    const { queue, send } = setup();
    queue.enqueue(vote('a'));
    const [first, second] = await Promise.all([queue.flush(), queue.flush()]);
    expect(first).toBe(second);
    expect(send).toHaveBeenCalledOnce();
  });
});

describe('start, backoff and sign-out', () => {
  it('flushes on start and on every online event', async () => {
    const { queue, send, events } = setup();
    queue.enqueue(vote('a'));
    const stop = queue.start();
    await vi.waitFor(() => expect(queue.size()).toBe(0));

    queue.enqueue(vote('b'));
    events.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(queue.size()).toBe(0));
    expect(send).toHaveBeenCalledTimes(2);

    stop();
    stop();
    queue.enqueue(vote('c'));
    events.dispatchEvent(new Event('online'));
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('retries with exponential backoff while started', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { queue, send } = setup();
    send.mockRejectedValueOnce(failure('network')).mockRejectedValueOnce(failure('network'));
    const stop = queue.start();

    await expect(queue.submit(vote('a'))).resolves.toMatchObject({ status: 'queued' });
    // random() = 0: half of the exponential delay, 1 s then 2 s.
    await vi.advanceTimersByTimeAsync(499);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(send).toHaveBeenCalledTimes(3);
    expect(queue.size()).toBe(0);
    stop();
  });

  it('keeps a rate-limited vote and waits at least Retry-After before sending it again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { queue, send } = setup();
    const limited = new ApiError({
      kind: 'rate_limited',
      status: 429,
      message: 'rate_limited',
      code: 'RATE_LIMITED',
      retryAfterMs: 10_000,
    });
    send.mockRejectedValueOnce(limited);
    const stop = queue.start();

    await expect(queue.submit(vote('a'))).resolves.toMatchObject({ status: 'queued' });
    expect(queue.size()).toBe(1);
    // The plain backoff would be 500 ms; Retry-After holds the vote for 10 s.
    await vi.advanceTimersByTimeAsync(9_999);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(queue.size()).toBe(0);
    stop();
  });

  it('does not schedule anything until started', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { queue, send } = setup();
    send.mockRejectedValueOnce(failure('network'));
    await queue.submit(vote('a'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(send).toHaveBeenCalledOnce();
    expect(queue.size()).toBe(1);
  });

  it('clear() empties the queue and cancels a pending retry', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { queue, send, data } = setup();
    const stop = queue.start();
    send.mockRejectedValueOnce(failure('network'));
    await queue.submit(vote('a'));
    queue.clear();
    expect(data.has(VOTE_QUEUE_STORAGE_KEY)).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(send).toHaveBeenCalledOnce();
    stop();
  });

  it('tells subscribers about every change', () => {
    const { queue } = setup();
    const listener = vi.fn<(votes: readonly QueuedVote[]) => void>();
    const unsubscribe = queue.subscribe(listener);
    queue.enqueue(vote('a'));
    queue.clear();
    unsubscribe();
    queue.enqueue(vote('b'));
    expect(listener.mock.calls.map(([votes]) => votes.length)).toEqual([1, 0]);
  });
});

describe('storage', () => {
  it('drops a corrupt or unknown-version queue', () => {
    for (const raw of ['not json', '{"version":2,"votes":[]}', '{"version":1,"votes":[{"x":1}]}']) {
      const { storage, data } = memoryStorage({ [VOTE_QUEUE_STORAGE_KEY]: raw });
      const queue = createVoteQueue({ send: vi.fn(), storage });
      expect(queue.list(), raw).toEqual([]);
      expect(data.has(VOTE_QUEUE_STORAGE_KEY)).toBe(false);
    }
  });

  it('shares the queue through storage, as two tabs do', () => {
    const { storage } = memoryStorage();
    const tabA = createVoteQueue({ send: vi.fn(), storage });
    const tabB = createVoteQueue({ send: vi.fn(), storage });
    tabA.enqueue(vote('a'));
    expect(tabB.list().map(entry => entry.comparisonId)).toEqual(['a']);
    expect(tabB.enqueue(vote('a'))).toBe(false);
  });

  it('falls back to memory when storage throws', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const queue = createVoteQueue({ send: vi.fn(), storage: broken });
    expect(queue.enqueue(vote('a'))).toBe(true);
    expect(queue.size()).toBe(1);
  });

  it('works in memory only with storage: null', () => {
    const queue = createVoteQueue({ send: vi.fn(), storage: null });
    queue.enqueue(vote('a'));
    expect(queue.size()).toBe(1);
    expect(window.localStorage.getItem(VOTE_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it('uses localStorage and window by default', async () => {
    const send = vi.fn(() => Promise.resolve({ success: true }));
    const queue = createVoteQueue({ send });
    queue.enqueue(vote('a'));
    expect(window.localStorage.getItem(VOTE_QUEUE_STORAGE_KEY)).toContain('"comparisonId":"a"');
    const stop = queue.start();
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    window.dispatchEvent(new Event('online'));
    stop();
    expect(queue.size()).toBe(0);
  });
});
