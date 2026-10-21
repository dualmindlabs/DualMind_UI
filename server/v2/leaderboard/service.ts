// getLeaderboard(): the cache state machine of BE-4 (design sections 6.2 and 6.3). The same
// function feeds GET /api/v2/leaderboard and, in BE-5, /leaderboard.md and /llms.txt.
//
//   entry and age < 60            serve (hit)
//   entry and 60 <= age < 600     serve stale, refresh in the background (single-flight)
//   entry and 600 <= age < 86400  refresh now; on failure serve the entry (stale-error)
//   no entry                      refresh now; on failure a 502 or 504 problem

import type { ExecutionContext } from 'hono';
import { DEFAULT_BACKEND_URL } from '../../api-proxy.js';
import { LEADERBOARD_SOURCE, PROVISIONAL_BELOW, type LeaderboardResponse } from '../../../contract/leaderboard.ts';
import { upstreamResponseSchema } from '../../../contract/leaderboard-upstream.ts';
import type { Env } from '../env.ts';
import { log } from '../log.ts';
import { ProblemError } from '../problems.ts';
import {
  cacheApiStore,
  FAILURE_BACKOFF_SECONDS,
  FRESH_SECONDS,
  HARD_SECONDS,
  MAX_UPSTREAM_BYTES,
  STALE_SECONDS,
  UPSTREAM_TIMEOUT_MS,
  type CacheStore,
  type StoredEntry,
} from './cache.ts';
import { contentEtag } from './etag.ts';
import { normaliseModelStats } from './normalise.ts';

export type LeaderboardState = 'hit' | 'hit-l1' | 'stale' | 'miss' | 'stale-error';

export type LeaderboardResult = {
  /** The response body exactly as served. */
  text: string;
  data: LeaderboardResponse;
  etag: string;
  generatedAt: string;
  state: LeaderboardState;
  ageSeconds: number;
};

export type FailureReason = 'timeout' | 'status' | 'parse' | 'empty';

export class UpstreamError extends Error {
  reason: FailureReason;
  upstreamStatus: number | null;
  constructor(reason: FailureReason, upstreamStatus: number | null = null) {
    super(reason);
    this.name = 'UpstreamError';
    this.reason = reason;
    this.upstreamStatus = upstreamStatus;
  }
}

export type ServiceOptions = {
  /** The store for a location (tests pass an in-memory one). */
  store?: (requestUrl: string) => CacheStore;
  now?: () => number;
  timeoutMs?: number;
};

function problemFor(error: unknown): ProblemError {
  if (error instanceof UpstreamError && error.reason === 'timeout') {
    return new ProblemError('gateway_timeout', { detail: 'The DualMind API did not answer in time. Try again in a few seconds.', retryAfter: 5 });
  }
  return new ProblemError('bad_gateway', { detail: 'The leaderboard source is unavailable. Try again in a few seconds.', retryAfter: 5 });
}

export function createLeaderboardService(options: ServiceOptions = {}) {
  const makeStore = options.store ?? cacheApiStore;
  const now = options.now ?? (() => Date.now());
  const timeoutMs = options.timeoutMs ?? UPSTREAM_TIMEOUT_MS;

  let l1: StoredEntry | undefined;
  let inflight: Promise<StoredEntry> | undefined;
  let lastFailure: { at: number; error: unknown } | undefined;

  const ageOf = (entry: StoredEntry) => Math.max(0, (now() - entry.storedAt) / 1000);

  async function fetchRows(env: Env, requestId: string): Promise<unknown[]> {
    const base = (env.BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetch(`${base}/api/arena/model-stats`, {
          headers: { Accept: 'application/json', 'X-Request-Id': requestId },
          signal: controller.signal,
        });
      } catch (error) {
        const aborted = controller.signal.aborted || ((error as { name?: string } | null)?.name === 'AbortError');
        throw new UpstreamError(aborted ? 'timeout' : 'status');
      }
      if (response.status !== 200) throw new UpstreamError('status', response.status);
      const declared = Number(response.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > MAX_UPSTREAM_BYTES) throw new UpstreamError('parse', 200);
      let text: string;
      try {
        text = await response.text();
      } catch (error) {
        throw new UpstreamError(controller.signal.aborted || ((error as { name?: string } | null)?.name === 'AbortError') ? 'timeout' : 'parse', 200);
      }
      if (text.length > MAX_UPSTREAM_BYTES) throw new UpstreamError('parse', 200);
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new UpstreamError('parse', 200);
      }
      const parsed = upstreamResponseSchema.safeParse(json);
      if (!parsed.success) throw new UpstreamError('parse', 200);
      return Array.isArray(parsed.data) ? parsed.data : (parsed.data as { items: unknown[] }).items;
    } finally {
      clearTimeout(timer);
    }
  }

  async function doRefresh(env: Env, requestId: string, store: CacheStore, previous: StoredEntry | undefined): Promise<StoredEntry> {
    const started = now();
    const rows = await fetchRows(env, requestId);
    const upstreamMs = now() - started;
    const { items, dropped } = normaliseModelStats(rows);
    if (dropped > 0) log({ event: 'leaderboard_row_dropped', requestId, dropped });
    // An empty leaderboard must never replace a good one.
    if (items.length === 0) throw new UpstreamError('empty', 200);

    const etag = await contentEtag(items, PROVISIONAL_BELOW);
    const changed = !previous || previous.etag !== etag;
    let entry: StoredEntry;
    if (!changed && previous) {
      // Same data: keep the stored body, ETag and generatedAt; only the storage time moves.
      entry = { ...previous, storedAt: now() };
    } else {
      const generatedAt = new Date(now()).toISOString();
      const data: LeaderboardResponse = {
        items,
        meta: { generatedAt, count: items.length, provisionalBelow: PROVISIONAL_BELOW, source: LEADERBOARD_SOURCE },
      };
      entry = { text: JSON.stringify(data), data, etag, generatedAt, storedAt: now() };
    }
    l1 = entry;
    try {
      await store.write(entry);
    } catch {
      // The Cache API is optional (workers.dev, tests without it); L1 still has the entry.
    }
    log({ event: 'leaderboard_refresh', requestId, upstreamMs, items: items.length, dropped, changed });
    return entry;
  }

  /** Single-flight refresh with a failure back-off. */
  function refresh(env: Env, requestId: string, store: CacheStore, previous: StoredEntry | undefined): Promise<StoredEntry> {
    if (inflight) return inflight;
    if (lastFailure && now() - lastFailure.at < FAILURE_BACKOFF_SECONDS * 1000) return Promise.reject(lastFailure.error);
    const run = doRefresh(env, requestId, store, previous).then(
      entry => {
        lastFailure = undefined;
        inflight = undefined;
        return entry;
      },
      error => {
        lastFailure = { at: now(), error };
        inflight = undefined;
        if (error instanceof UpstreamError) {
          log({ event: 'leaderboard_refresh_failed', requestId, reason: error.reason, upstreamStatus: error.upstreamStatus });
        } else {
          log({ event: 'leaderboard_refresh_failed', requestId, reason: 'status', upstreamStatus: null });
        }
        throw error;
      },
    );
    inflight = run;
    return run;
  }

  async function getLeaderboard(env: Env, ctx: ExecutionContext | undefined, requestId: string, requestUrl: string): Promise<LeaderboardResult> {
    const store = makeStore(requestUrl);
    let entry = l1;
    let source: 'l1' | 'l2' = 'l1';
    if (!entry || ageOf(entry) >= FRESH_SECONDS) {
      // L1 is missing or no longer fresh: another isolate may have stored a newer copy.
      let shared: StoredEntry | undefined;
      try {
        shared = await store.read();
      } catch {
        shared = undefined;
      }
      if (shared && (!entry || shared.storedAt > entry.storedAt)) {
        entry = shared;
        source = 'l2';
        l1 = shared;
      }
    }
    if (entry && ageOf(entry) >= HARD_SECONDS) entry = undefined;

    const result = (found: StoredEntry, state: LeaderboardState): LeaderboardResult => ({
      text: found.text,
      data: found.data,
      etag: found.etag,
      generatedAt: found.generatedAt,
      state,
      ageSeconds: Math.floor(ageOf(found)),
    });

    if (entry) {
      const age = ageOf(entry);
      if (age < FRESH_SECONDS) return result(entry, source === 'l1' ? 'hit-l1' : 'hit');
      if (age < STALE_SECONDS) {
        if (ctx?.waitUntil) {
          const previous = entry;
          ctx.waitUntil(refresh(env, requestId, store, previous).then(() => undefined, () => undefined));
        }
        return result(entry, 'stale');
      }
    }

    try {
      const fresh = await refresh(env, requestId, store, entry);
      return result(fresh, 'miss');
    } catch (error) {
      if (entry) return result(entry, 'stale-error');
      throw problemFor(error);
    }
  }

  return {
    getLeaderboard,
    /** Forgets the in-isolate state (tests). */
    reset() {
      l1 = undefined;
      inflight = undefined;
      lastFailure = undefined;
    },
  };
}

const defaultService = createLeaderboardService();

export const getLeaderboard = defaultService.getLeaderboard;
export const resetLeaderboardState = defaultService.reset;

/** RFC 9211 `Cache-Status` value for a result. */
export function cacheStatus(result: Pick<LeaderboardResult, 'state' | 'ageSeconds'>): string {
  switch (result.state) {
    case 'hit':
    case 'hit-l1':
      return `DualMind; hit; ttl=${Math.max(0, FRESH_SECONDS - result.ageSeconds)}`;
    case 'stale':
      return 'DualMind; hit; stale; detail=revalidating';
    case 'stale-error':
      return 'DualMind; hit; stale; detail=upstream-error';
    default:
      return 'DualMind; fwd=miss';
  }
}
