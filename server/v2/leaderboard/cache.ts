// Storage for the leaderboard (BE-4 design, section 6.1): the Cache API entry per location. The
// in-isolate copy (L1) lives in service.ts. The entry holds the final JSON text and three
// internal headers; freshness is decided by the Worker from `X-DM-Stored-At`, not by the platform.

import { leaderboardResponseSchema, type LeaderboardResponse } from '../../../contract/leaderboard.ts';

/** Fresh: served as is. */
export const FRESH_SECONDS = 60;
/** Stale but servable while a background refresh runs. */
export const STALE_SECONDS = 600;
/** Physical retention, and the longest a copy may be served after an upstream failure. */
export const HARD_SECONDS = 86_400;
/** After a failed refresh, no new upstream attempt for this long. */
export const FAILURE_BACKOFF_SECONDS = 10;
export const UPSTREAM_TIMEOUT_MS = 8000;
export const MAX_UPSTREAM_BYTES = 1024 * 1024;

/** The schema version of the stored body: bump it when the item shape changes. */
export const CACHE_KEY_PATH = '/__cache/leaderboard/v1';

export type StoredEntry = {
  /** The response body exactly as served. */
  text: string;
  data: LeaderboardResponse;
  etag: string;
  generatedAt: string;
  /** Epoch milliseconds from the Worker's own clock when the entry was last confirmed. */
  storedAt: number;
};

export type CacheStore = {
  read(): Promise<StoredEntry | undefined>;
  write(entry: StoredEntry): Promise<void>;
};

const HEADER_STORED_AT = 'X-DM-Stored-At';
const HEADER_ETAG = 'X-DM-Content-Etag';
const HEADER_GENERATED_AT = 'X-DM-Generated-At';

function defaultCache(): Cache | undefined {
  if (typeof caches === 'undefined') return undefined;
  return (caches as unknown as { default?: Cache }).default;
}

/** The Cache API store for the location serving `requestUrl` (a synthetic GET key, no user input). */
export function cacheApiStore(requestUrl: string): CacheStore {
  const key = new Request(new URL(CACHE_KEY_PATH, requestUrl));
  return {
    async read() {
      const cache = defaultCache();
      if (!cache) return undefined;
      const hit = await cache.match(key);
      if (!hit) return undefined;
      const storedAt = Number(hit.headers.get(HEADER_STORED_AT));
      const etag = hit.headers.get(HEADER_ETAG);
      const generatedAt = hit.headers.get(HEADER_GENERATED_AT);
      if (!Number.isFinite(storedAt) || !etag || !generatedAt) return undefined;
      const text = await hit.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return undefined;
      }
      const parsed = leaderboardResponseSchema.safeParse(json);
      if (!parsed.success) return undefined;
      return { text, data: parsed.data, etag, generatedAt, storedAt };
    },
    async write(entry) {
      const cache = defaultCache();
      if (!cache) return;
      await cache.put(
        key,
        new Response(entry.text, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': `public, max-age=${HARD_SECONDS}`,
            [HEADER_STORED_AT]: String(entry.storedAt),
            [HEADER_ETAG]: entry.etag,
            [HEADER_GENERATED_AT]: entry.generatedAt,
          },
        }),
      );
    },
  };
}
