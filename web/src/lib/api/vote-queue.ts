/**
 * The offline vote queue. A vote is the one write the Arena must not lose: when it fails for a
 * transient reason (offline, timeout, 5xx, 429) it is kept in localStorage under
 * `dm.voteQueue.v1` and sent again when the browser comes back online, with backoff.
 *
 * - One entry per `comparisonId` (the API accepts one vote per battle), first vote wins.
 * - Storage is the source of truth, so a second tab sees the same queue; blocked or full storage
 *   falls back to memory for the session.
 * - A vote the API rejects for good (400, 403, 404, a duplicate) is dropped; one that keeps
 *   failing is dropped after `maxAttempts`, and any vote older than `maxAgeMs`.
 * - `clear()` on sign-out: queued votes belong to the user who cast them.
 */
import { z } from 'zod';

import type { VoteInput } from './endpoints/arena';
import { type ApiError, isApiError, isRetryableError, toApiError } from './errors';
import { VOTE_CHOICES } from './schemas/arena';

export const VOTE_QUEUE_STORAGE_KEY = 'dm.voteQueue.v1';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface QueuedVote {
  comparisonId: string;
  voteChoice: VoteInput['voteChoice'];
  voteDurationMs?: number | undefined;
  /** Epoch milliseconds. */
  queuedAt: number;
  /** Failed send attempts so far. */
  attempts: number;
  /** Code of the last failure, for diagnostics. */
  lastError: string | null;
}

export type VoteSubmitResult =
  | { status: 'sent' }
  | { status: 'queued'; error: ApiError | null };

export interface FlushResult {
  sent: number;
  dropped: number;
  remaining: number;
}

export interface VoteQueueOptions {
  /** Sends one vote: `vote => api.vote(vote)`. */
  send: (vote: VoteInput) => Promise<unknown>;
  /** Where the queue lives. Default `window.localStorage`; `null` keeps it in memory only. */
  storage?: StorageLike | null | undefined;
  /** Default `navigator.onLine` (true when unknown). */
  isOnline?: (() => boolean) | undefined;
  /** Receives `online` events; default `window`. */
  eventTarget?: EventTarget | null | undefined;
  maxEntries?: number | undefined;
  maxAgeMs?: number | undefined;
  maxAttempts?: number | undefined;
  /** First retry delay after a failed flush; doubles each time, with jitter. */
  baseDelayMs?: number | undefined;
  maxDelayMs?: number | undefined;
  now?: (() => number) | undefined;
  random?: (() => number) | undefined;
}

export interface VoteQueue {
  /** Sends now; queues on a transient failure or when offline. Rethrows a permanent error. */
  submit: (vote: VoteInput) => Promise<VoteSubmitResult>;
  /** Adds a vote without sending it. False when one for this comparison is already queued. */
  enqueue: (vote: VoteInput, error?: ApiError | null) => boolean;
  /** Sends every queued vote, oldest first. Concurrent calls share one run. */
  flush: () => Promise<FlushResult>;
  list: () => readonly QueuedVote[];
  size: () => number;
  /** Empties the queue (sign-out). */
  clear: () => void;
  /** Flushes now and on every `online` event, with backoff while it keeps failing. Returns stop. */
  start: () => () => void;
  /** Called with the queue after every change. Returns unsubscribe. */
  subscribe: (listener: (votes: readonly QueuedVote[]) => void) => () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const storedQueueSchema = z.object({
  version: z.literal(1),
  votes: z.array(
    z.object({
      comparisonId: z.string().min(1),
      voteChoice: z.enum(VOTE_CHOICES),
      voteDurationMs: z.number().nonnegative().optional(),
      queuedAt: z.number(),
      attempts: z.number().int().nonnegative(),
      lastError: z.string().nullable(),
    }),
  ),
});

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null; // Access itself can throw when storage is blocked.
  }
}

export function createVoteQueue(options: VoteQueueOptions): VoteQueue {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const isOnline =
    options.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const eventTarget =
    options.eventTarget === undefined
      ? typeof window === 'undefined'
        ? null
        : window
      : options.eventTarget;
  const maxEntries = options.maxEntries ?? 50;
  const maxAgeMs = options.maxAgeMs ?? 7 * DAY_MS;
  const maxAttempts = options.maxAttempts ?? 10;
  const baseDelayMs = options.baseDelayMs ?? 2_000;
  const maxDelayMs = options.maxDelayMs ?? 60_000;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;

  let memory: QueuedVote[] = [];
  const listeners = new Set<(votes: readonly QueuedVote[]) => void>();
  let running: Promise<FlushResult> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let started = 0;

  function load(): QueuedVote[] {
    if (storage === null) return memory;
    let raw: string | null;
    try {
      raw = storage.getItem(VOTE_QUEUE_STORAGE_KEY);
    } catch {
      return memory;
    }
    if (raw === null) return [];
    try {
      const parsed = storedQueueSchema.safeParse(JSON.parse(raw) as unknown);
      if (parsed.success) return parsed.data.votes;
    } catch {
      // Not JSON: fall through and drop it.
    }
    try {
      storage.removeItem(VOTE_QUEUE_STORAGE_KEY);
    } catch {
      // Nothing more to do.
    }
    return [];
  }

  function save(votes: QueuedVote[]): void {
    memory = votes;
    if (storage !== null) {
      try {
        if (votes.length === 0) storage.removeItem(VOTE_QUEUE_STORAGE_KEY);
        else storage.setItem(VOTE_QUEUE_STORAGE_KEY, JSON.stringify({ version: 1, votes }));
      } catch {
        // Quota or blocked storage: the in-memory copy still holds the queue for this session.
      }
    }
    for (const listener of listeners) listener(votes);
  }

  function toEntry(vote: VoteInput, error: ApiError | null): QueuedVote {
    const entry: QueuedVote = {
      comparisonId: vote.comparisonId,
      voteChoice: vote.voteChoice,
      queuedAt: now(),
      attempts: error === null ? 0 : 1,
      lastError: error === null ? null : error.code,
    };
    if (vote.voteDurationMs !== undefined) entry.voteDurationMs = vote.voteDurationMs;
    return entry;
  }

  function enqueue(vote: VoteInput, error: ApiError | null = null): boolean {
    const votes = load();
    if (votes.some(entry => entry.comparisonId === vote.comparisonId)) return false;
    save([...votes, toEntry(vote, error)].slice(-maxEntries));
    return true;
  }

  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function scheduleRetry(): void {
    clearTimer();
    if (started === 0) return;
    const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** failures);
    failures += 1;
    const delay = Math.round(exponential / 2 + random() * (exponential / 2));
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delay);
  }

  /** What to do with a queued vote after `send` failed. */
  function outcome(error: ApiError): 'sent' | 'drop' | 'retry' | 'wait' {
    // A 2xx whose body did not parse: the vote was recorded.
    if (error.kind === 'bad_response' && error.status >= 200 && error.status < 300) return 'sent';
    if (error.kind === 'auth') return 'wait'; // needs a session; sign-out clears the queue
    if (isRetryableError(error) || error.kind === 'bad_response') return 'retry';
    return 'drop'; // validation (incl. a duplicate vote), forbidden, not found: final
  }

  async function runFlush(): Promise<FlushResult> {
    const result: FlushResult = { sent: 0, dropped: 0, remaining: 0 };
    const all = load();
    const fresh = all.filter(entry => now() - entry.queuedAt <= maxAgeMs);
    if (fresh.length !== all.length) {
      result.dropped += all.length - fresh.length;
      save(fresh);
    }

    let blocked: 'retry' | 'wait' | null = null;
    for (const entry of fresh) {
      if (!isOnline()) {
        blocked = 'retry';
        break;
      }
      const vote: VoteInput = { comparisonId: entry.comparisonId, voteChoice: entry.voteChoice };
      if (entry.voteDurationMs !== undefined) vote.voteDurationMs = entry.voteDurationMs;
      let next: 'sent' | 'drop' | 'retry' | 'wait';
      let failure: ApiError | null = null;
      try {
        await options.send(vote);
        next = 'sent';
      } catch (error) {
        failure = toApiError(error);
        next = outcome(failure);
      }
      const current = load();
      if (next === 'sent' || next === 'drop') {
        if (next === 'sent') result.sent += 1;
        else result.dropped += 1;
        save(current.filter(item => item.comparisonId !== entry.comparisonId));
        continue;
      }
      // Keep it, count the attempt, and stop: the next votes would fail the same way.
      const attempts = entry.attempts + 1;
      if (next === 'retry' && attempts >= maxAttempts) {
        result.dropped += 1;
        save(current.filter(item => item.comparisonId !== entry.comparisonId));
      } else {
        save(
          current.map(item =>
            item.comparisonId === entry.comparisonId
              ? { ...item, attempts, lastError: failure?.code ?? null }
              : item,
          ),
        );
      }
      blocked = next;
      break;
    }

    result.remaining = load().length;
    if (result.remaining > 0 && blocked === 'retry') scheduleRetry();
    if (result.remaining === 0 || blocked === null) {
      failures = 0;
      clearTimer();
    }
    return result;
  }

  function flush(): Promise<FlushResult> {
    running ??= runFlush().finally(() => {
      running = null;
    });
    return running;
  }

  async function submit(vote: VoteInput): Promise<VoteSubmitResult> {
    if (load().some(entry => entry.comparisonId === vote.comparisonId)) {
      return { status: 'queued', error: null };
    }
    if (!isOnline()) {
      enqueue(vote);
      scheduleRetry();
      return { status: 'queued', error: null };
    }
    try {
      await options.send(vote);
      return { status: 'sent' };
    } catch (error) {
      const apiError = toApiError(error);
      if (!isApiError(error) || !isRetryableError(apiError)) throw apiError;
      enqueue(vote, apiError);
      scheduleRetry();
      return { status: 'queued', error: apiError };
    }
  }

  function clear(): void {
    clearTimer();
    failures = 0;
    save([]);
  }

  function start(): () => void {
    started += 1;
    const onOnline = () => {
      failures = 0;
      void flush();
    };
    eventTarget?.addEventListener('online', onOnline);
    if (load().length > 0) void flush();
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      started -= 1;
      eventTarget?.removeEventListener('online', onOnline);
      if (started === 0) clearTimer();
    };
  }

  return {
    submit,
    enqueue: (vote, error) => enqueue(vote, error ?? null),
    flush,
    list: () => load(),
    size: () => load().length,
    clear,
    start,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
