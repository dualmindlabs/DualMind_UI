# BE-4: Fast public leaderboard (`GET /api/v2/leaderboard`)

Status: **proposed** (2026-10-21). Wave W1. Depends on [BE-0](./BE-0-platform.md) (router, problems, contract folder, OpenAPI) and [BE-3](./BE-3-rate-limits.md) (`read` limit group). Source data: `GET /api/arena/model-stats` ([endpoints.md section 3.7](../../api/endpoints.md#37-arena-model-stats-leaderboard)).

## 1. Summary

A public, token-free route that returns the leaderboard from the edge cache. The Worker fetches the v1 `model-stats` list from the DualMind API, normalises it (one casing, no duplicate or alias fields, derived fields computed on the server), stores it in the Cache API and serves it with `ETag`, `If-None-Match` and stale-while-revalidate. A leaderboard view costs one cache lookup, survives API outages with the last good copy, and its response schema is shared with the web client.

## 2. Goals and non-goals

Goals: fast and cheap reads; the API is called at most about once a minute per Cloudflare location instead of once per page view; one clean schema; correct HTTP caching; graceful failure.

Non-goals: history, rank movement, confidence intervals, categories (BE-8, BE-9, BE-12 extend this schema additively); authentication; per-user data; changing Elo (the numbers are the API's); pagination (53 rows today; the list is a small fixed set, so it is returned whole and `nextCursor` is omitted, a deviation from the BE-0 list rule that the OpenAPI states).

## 3. User-visible behaviour

- The leaderboard page loads faster and works signed out; during a short API outage it still shows the last data, marked with its age.
- Models with fewer than 100 battles are flagged `provisional` (the same rule the leaderboard page uses today, `PROVISIONAL_BATTLES` in `web/src/features/leaderboard/lib/constants.ts`), so the UI can show a "preliminary" badge.
- Machine readers get a stable, documented JSON.

## 4. API

### `GET /api/v2/leaderboard` (also `HEAD`)

Public. Query parameters: none (unknown ones are ignored and not part of the cache key). Request headers used: `If-None-Match`.

Response `200`:

```json
{
  "items": [
    {
      "modelId": "fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5",
      "modelName": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "displayName": "llama-3.3-70b-instruct-fp8-fast",
      "providerName": "cloudflare",
      "eloScore": 1150,
      "eloRank": 1,
      "totalWins": 62,
      "totalLosses": 27,
      "totalTies": 9,
      "totalResponses": 96,
      "winRate": 64.58,
      "provisional": false
    },
    {
      "modelId": "2f2219b0-d1ce-402d-b6d0-29d1e67ef04b",
      "modelName": "@cf/meta/llama-3.1-70b-instruct",
      "displayName": "llama-3.1-70b-instruct",
      "providerName": "cloudflare",
      "eloScore": 1140,
      "eloRank": 2,
      "totalWins": 154,
      "totalLosses": 55,
      "totalTies": 36,
      "totalResponses": 250,
      "winRate": 61.6,
      "provisional": false
    }
  ],
  "meta": {
    "generatedAt": "2026-10-21T08:30:00.000Z",
    "count": 2,
    "provisionalBelow": 100,
    "source": "dualmind-api:model-stats"
  }
}
```

Field names are exactly the canonical camelCase names of v1 (`eloScore`, `eloRank`, `totalWins`...), so the web UI changes its schema import and nothing else. Units are unchanged: `winRate` is a percent from 0 to 100 with two decimals (ties count as non-wins, as in v1; stated in the OpenAPI description). New: `provisional` (`totalResponses < provisionalBelow`) and `meta`. `generatedAt` is when the data last changed (section 6.4), not when it was served.

Response headers:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json; charset=utf-8` |
| `Cache-Control` | `public, max-age=30, stale-while-revalidate=60, stale-if-error=86400` |
| `ETag` | strong, like `"lb-5e0c1b7a93d24f10"` |
| `Cache-Status` | RFC 9211, e.g. `DualMind; hit; ttl=42` or `DualMind; hit; stale; detail=revalidating` or `DualMind; fwd=miss` or `DualMind; hit; stale; detail=upstream-error` |
| `X-Request-Id` | as everywhere |

`304 Not Modified`: when `If-None-Match` matches (list of tags, weak or strong compare, `*` matches). Carries `ETag`, `Cache-Control`, `Cache-Status`, `X-Request-Id`, no body.

Errors (problem+json, BE-0 registry): `502 bad_gateway` (upstream unreachable or invalid and no cached copy), `504 gateway_timeout` (no answer within 8 s and no cached copy), `405 method_not_allowed` (`Allow: GET, HEAD`), `429 rate_limited` (BE-3). Error responses: `Cache-Control: no-store`, plus `Retry-After: 5` on 502 and 504.

## 5. Data model

None (no D1). State: Cache API entry per location, plus an in-isolate copy (section 6.2). The cache holds the final JSON body and three internal headers (`X-DM-Stored-At`, `X-DM-Content-Etag`, `X-DM-Generated-At`).

## 6. Design

### 6.1 Cache key and times

- Key: `new Request(new URL('/__cache/leaderboard/v1', request.url))`, a synthetic GET. Fixed path, no query, no headers. The `v1` suffix is the schema version of the stored body: bump it when the item shape changes so old entries are never served to new code.
- Times (constants in `server/v2/leaderboard/cache.ts`): `FRESH_SECONDS = 60`, `STALE_SECONDS = 600` (serve stale and refresh in the background), `HARD_SECONDS = 86400` (physical retention and the longest a stale copy may be served after an upstream failure).
- The entry is `put` with `Cache-Control: public, max-age=86400` so the platform keeps it, and the Worker decides freshness itself from `X-DM-Stored-At`. Outgoing `Cache-Control` is rewritten per response (section 4).

### 6.2 State machine

```text
read L1 (module variable) -> L2 (caches.default.match) -> entry or none
age = now - storedAt

entry and age < 60            -> serve (Cache-Status: hit)
entry and 60 <= age < 600     -> serve stale; ctx.waitUntil(refresh()) (single-flight)
entry and 600 <= age < 86400  -> refresh() now; on failure serve the entry (stale; detail=upstream-error)
entry and age >= 86400        -> treated as no entry
no entry                      -> refresh() now; on failure problem 502 or 504
```

- `refresh()` is single-flight per isolate (one shared promise), and after a failure no new attempt is made for 10 seconds (`lastFailureAt`), so an outage does not turn every request into an upstream call. Different locations still refresh independently; acceptable at this traffic.
- L1 is a module-scope `{ entry, storedAt }`. It is checked first (no Cache API call), and it is the only cache on `*.workers.dev` previews, where the Cache API does nothing. Local `wrangler dev` and Miniflare have a working Cache API.
- If `ctx.waitUntil` is absent (a test without ctx), the background refresh is skipped and the stale entry is served.

### 6.3 Upstream fetch

`GET {BACKEND_URL}/api/arena/model-stats`, headers `Accept: application/json` and `X-Request-Id` (the caller's), no `Authorization` (public). Timeout 8 s (`AbortController`). Accept only `200` with JSON; anything else, an unparsable body or zero valid rows is a failure and is never cached (an empty leaderboard must not replace a good one). The v1 proxy is not used; this is a direct internal fetch, so v1's rate limit and error rewrite do not apply to it.

### 6.4 Normalisation

Pure function `normaliseModelStats(raw): { items, dropped }` in `server/v2/leaderboard/normalise.ts`, using a tolerant upstream zod schema (`contract/leaderboard-upstream.ts`) that accepts the v1 canonical names and reads the snake_case and alias names (`model_id`, `elo_rating`, `elo`, `matches`, `wins`...) only as fallbacks. Output has the canonical names only.

1. Per row: required `modelId`, `modelName`, `providerName`, finite `eloScore`, non-negative integers for the counts; otherwise the row is dropped and counted in `dropped` (logged).
2. `displayName`: upstream value, else `modelName` without the provider prefix (everything up to the last `/`).
3. `winRate`: upstream value if finite and 0 to 100, else `round(totalWins / totalResponses * 10000) / 100` (0 when no responses). Two decimals.
4. `provisional = totalResponses < 100`.
5. Duplicate `modelId`: keep the row with more `totalResponses`.
6. `eloRank`: upstream if a positive integer on every row, else recomputed from `eloScore` descending with ties sharing a rank (1, 1, 3).
7. Sort by `eloRank`, then `eloScore` descending, then `displayName`.
8. `eloScore` rounded to one decimal; counts untouched.

Content hash: SHA-256 over the canonical JSON of `items` and `provisionalBelow` (not `generatedAt`), first 16 hex characters; `ETag` is `"lb-<hash>"`. When a refresh yields the same hash as the stored entry, the stored body (and its `generatedAt`) is kept and only `X-DM-Stored-At` moves. So the `ETag` and `generatedAt` change only when the data does, and clients keep getting `304`.

### 6.5 Response assembly

`server/v2/routes/leaderboard.ts` declares the route with `createRoute` (response schema `leaderboardResponseSchema` from `contract/leaderboard.ts`, 304, problem responses) and calls `getLeaderboard(env, ctx, requestId)` from `server/v2/leaderboard/service.ts`, which returns `{ body, etag, generatedAt, state, ageSeconds }`. The same service function feeds BE-5's `/leaderboard.md`.

### 6.6 Web client

`web/src/lib/api/schemas/leaderboard.ts` re-exports `leaderboardResponseSchema` from `@contract/leaderboard` (BE-0 alias) and keeps no alias or snake_case handling; `endpoints/leaderboard.ts` calls `/api/v2/leaderboard` with `auth: 'none'`. The query keeps its 15 s timeout; `getLeaderboard` still returns `ModelStat[]` (now with `provisional`). The browser's own HTTP cache handles `max-age=30` and `If-None-Match`. During rollout, one release keeps the old path as a fallback when `/api/v2/leaderboard` answers 404 or 501 (an older deploy), then the fallback is deleted. The mock adapter fixtures move to the v2 shape.

## 7. Auth

None. The route never reads `Authorization`, and a cached response contains no user data, so it is safe in a shared cache.

## 8. Limits and abuse

BE-3 `read` group (30 per 10 s per IP or user). A cache hit costs no upstream call, so the limit protects the Worker, not the API. The cache cannot be poisoned by a caller: the key has no user input and the body comes only from the upstream fetch. Response size is small (about 15 KB for 53 models); upstream bodies over 1 MiB are rejected.

## 9. Privacy

Public data about models only; no user or vote-level data. Logs hold no body.

## 10. Failure modes

| Failure | Behaviour |
| --- | --- |
| API slow or down, copy younger than 24 h | serve the copy (`stale; detail=upstream-error`), log the failure |
| API down, no copy (first request in a location after a long idle) | `502` or `504` problem with `Retry-After: 5` |
| API returns 200 with a changed shape | rows that fail the schema are dropped; if none remain it is a failure and the copy is kept; `leaderboard_row_dropped` shows in logs |
| API returns an empty `items` list | failure (never cached) |
| Cache API unavailable (workers.dev) | L1 only: works, but each isolate fetches by itself |
| Two locations disagree for up to 60 s | accepted; both are within the staleness bounds |
| Clock or `Date` oddities | all ages come from the Worker's own `Date.now()` stored at write time |

## 11. Observability

Log event `leaderboard` per request: `{ requestId, state: "hit" | "hit-l1" | "stale" | "miss" | "stale-error" | "error", ageSeconds, etag, status }`. Refresh events: `leaderboard_refresh` (`{ upstreamMs, items, dropped, changed }`) and `leaderboard_refresh_failed` (`{ reason: "timeout" | "status" | "parse" | "empty", upstreamStatus }`). Metric names (log fields until BE-20): `leaderboard_requests_total{state}`, `leaderboard_not_modified_total`, `leaderboard_upstream_duration_ms`, `leaderboard_upstream_failures_total{reason}`, `leaderboard_age_seconds`.

## 12. Implementation plan

```text
contract/leaderboard.ts               leaderboardItemSchema, leaderboardResponseSchema (shared with web)
contract/leaderboard-upstream.ts      tolerant v1 row schema (Worker only)
server/v2/leaderboard/normalise.ts    pure
server/v2/leaderboard/cache.ts        L1/L2 access, constants, state machine, single-flight
server/v2/leaderboard/service.ts      getLeaderboard(env, ctx, requestId)
server/v2/leaderboard/etag.ts         hash, If-None-Match matching
server/v2/routes/leaderboard.ts       route + OpenAPI
docs/api/openapi.v2.json              regenerated
web/src/lib/api/{schemas,endpoints,mock}/...  as in 6.6
docs/api/endpoints.md                 v2 section; CHANGELOG
```

## 13. Test plan

- Unit `normalise` (Node or Workers project): the two recorded rows from endpoints.md (with all duplicate and alias fields) produce exactly the example above; missing `displayName`; alias-only rows; negative or `NaN` numbers dropped; duplicate ids; missing or partial ranks recomputed with shared ranks; `winRate` recompute and 0 responses; provisional boundary (99, 100); stable order; 53-row fixture snapshot.
- Unit `etag`: hash is independent of key order and of `generatedAt`; `If-None-Match` with one tag, a list, weak `W/`, `*`, garbage.
- Cache state machine with an in-memory fake cache and a fake clock: fresh hit, stale hit plus one background refresh (two simultaneous stale requests cause one upstream call), expired refresh, refresh failure serves stale, cold failure gives 502 and 504 problems with `Retry-After`, the 10 s failure backoff, same-hash refresh keeps `ETag` and `generatedAt`, a 25-hour-old entry is ignored, empty upstream is not cached.
- Miniflare integration (`tests/api/leaderboard.test.ts`): real `caches.default`, MSW upstream: miss then hit (one upstream call for 10 requests), `304` on `If-None-Match`, `HEAD`, stale revalidation through `waitUntil` (`await` the waitUntil promises with the test helper), upstream 500 with and without a copy.
- Contract: every response (200, 304 headers, 502, 504, 429) validated against `docs/api/openapi.v2.json`; the response schema fixtures parse with the web `leaderboardSchema`; a web unit test imports the Worker's example JSON and parses it (guards the shared schema).
- End to end through `wrangler dev` with `BACKEND_URL` pointing at the repo's `mock-api-server.js` (which serves a `model-stats` fixture): headers, `ETag` round trip, leaderboard page renders from `/api/v2/leaderboard`. Playwright e2e keeps using the mock adapter for the UI.

## 14. Rollout

1. Merge the route and schema. It needs no binding or account resource, so there is no `not_enabled` case; with the pre-launch gate on, only preview-cookie visitors can reach it.
2. Switch the web client in the same or the next PR (section 6.6), with one release of fallback.
3. Check logs for `stale-error` and `dropped` counts for a few days, then delete the client fallback.
4. Kill switch: unregister the route (code removal) and the client falls back to v1.

## 15. Open questions

1. Provisional threshold: 5 battles, matching the leaderboard page today (research.md suggests 300 battles or a confidence-interval rule once BE-9 lands). One shared constant, published in `meta.provisionalBelow`; the web constant must import it from `contract/` when BE-0 lands.
2. Cache TTLs (fresh 60 s, stale 10 min): leaderboard changes slowly, so these are conservative; longer lowers API calls further. Harsh may prefer to see new votes sooner.
3. `winRate` counts ties as non-wins (v1 behaviour, kept to avoid a silent change). BE-9 can introduce a tie-aware figure under a new name.
4. Expose a `?provisional=false` filter or keep it client-side? Default: client-side; one list is easier to cache.
