# src/lib/api

The typed client for the DualMind API: one function per endpoint, Zod schemas that normalise every response, one error model, request ids, timeouts, a retry policy that never repeats a battle, an SSE parser, an offline vote queue, a mock adapter and the TanStack Query bindings. The contract it implements is [docs/api/endpoints.md](../../../../docs/api/endpoints.md); its "Client mapping" section lists every endpoint with its function, schema and retry policy.

Import everything from `@/lib/api` (the `index.ts` public API), never from the folders below.

```ts
import { createApiClientFromEnv, getUserMessage, leaderboardQuery } from '@/lib/api';

const api = createApiClientFromEnv({ getAccessToken: () => session?.access_token ?? null });
const rows = await api.getLeaderboard(); // ModelStat[]
const query = useQuery(leaderboardQuery(api)); // or through TanStack Query
```

## Structure

```text
lib/api/
├── index.ts            the public API
├── client.ts           createApiClient(), createApiClientFromEnv(): composes the endpoint groups
├── errors.ts           ApiError, kinds, the body normaliser, type guards, getUserMessage()
├── sse.ts              SSE parser and the chat stream reader (async generators)
├── vote-queue.ts       the offline vote queue (localStorage `dm.voteQueue.v1`)
├── http/               transport (fetch, headers, request ids, timeouts, retries), retry policy, URLs, timeouts
├── endpoints/          one module per group: health, models, arena, leaderboard, threads, users, speech, flags
├── schemas/            Zod schemas per group, plus the normalising helpers in common.ts
├── mock/               the mock adapter: a fetch that answers every route from memory, and its scenarios
└── query/              QueryClient factory, query keys, query and mutation option builders
```

Tests live in `web/tests/unit/lib/api/`; recorded and synthetic response bodies in `web/tests/fixtures/api/`.

## Requests

- **Base URL:** same-origin by default: every path starts with `/api/`, and the Worker proxies it to the API (ADR 0006), so the CSP needs only `connect-src 'self'`. `/api/health` works both through the Worker (which maps it to `/health`) and against the API directly. `VITE_API_BASE_URL` points the app at another API for local work (`src/config/api.ts`).
- **Headers:** `Accept` (`application/json`, `text/event-stream` for the stream, `audio/*` for speech), `Content-Type: application/json` only when there is a body, `Authorization: Bearer <token>` and `x-request-id`. Callers can add headers (`CallOptions.headers`) but cannot replace these.
- **Auth:** the client takes a token provider (`getAccessToken`, wired to Supabase in S6) and never falls back to the anon key. Each endpoint declares `required` (no token: fails locally with kind `auth`, no request), `optional` (owner or visitor: shared threads) or `none` (health, leaderboard, feature flags, the public share view).
- **Request ids:** one UUID v4 per call, reused by its retries. The Worker echoes it as `X-Request-Id`; the API answers with its own `x-correlation-id`. Both are on every `ApiError` and in the `onRequest`/`onResponse` hooks, which never see the token.
- **Timeouts:** `TIMEOUTS` in `http/timeouts.ts`: 5 s health, 15 s reads and small writes, 60 s battle and chat, 30 s speech; a stream has no total limit but fails after 30 s without data. `CallOptions.timeoutMs` overrides per call. `CallOptions.signal` cancels a call at any point, including a wait between retries.
- **Redirects** are not followed (`redirect: 'manual'`): while the waitlist gate is on, `/api/*` answers 302, which becomes a `bad_response` with code `UNEXPECTED_REDIRECT` instead of an HTML page parsed as JSON.

## Error model

Every failure is an `ApiError` with a `kind`:

| Kind | From | Retryable |
| --- | --- | --- |
| `network` | fetch rejected (offline, DNS, dropped connection); a stream that ended early | yes |
| `timeout` | client timeout, 408, the Worker's 504, a quiet stream | yes |
| `aborted` | the caller's signal | no |
| `auth` | 401, no token for a `required` call | no |
| `forbidden` | 403 | no |
| `not_found` | 404, 410 | no |
| `validation` | 400, 422 and other 4xx; local input checks (`INVALID_ARGUMENT`) | no |
| `rate_limited` | 429 (`retryAfterMs` from `Retry-After`) | yes |
| `server` | 5xx except 504 (501 is never retried); `ai.error` events and bodies | yes |
| `bad_response` | invalid JSON, a body that fails its schema (`SCHEMA_MISMATCH`, with the issues in `details`), a redirect, an unexpected content type | no |

`status` (0 without a response), `code` (from the body, or a default per kind), `message` (for developers), `requestId`, `correlationId`, `retryAfterMs` and `details` complete it; `toJSON()` is safe to log. The normaliser (`parseErrorBody`) reads every body shape the API and the Worker send: arena `{ object: "ai.error", code, message }`, `{ success: false, error, code }`, the Worker's `{ error: "bad_gateway" | "gateway_timeout", requestId }`, the legacy Worker 502, ASP.NET ProblemDetails, the proposed nested `{ error: { code, message } }`, and empty bodies. An `ai.error` body with status 200 is an error too.

In the UI: branch on `kind` (`isAuthError`, `isConnectivityError`, `isAbortError`, `isRateLimitError`, `isApiErrorKind(error, ...)`), show `getUserMessage(error)` (only short validation messages from the server pass through), and ignore `aborted`.

## Retry policy

One policy (`http/retry.ts`), used by exactly one layer per request:

- Only `GET`. A `POST` battle, chat, stream, vote or thread create is **never** retried automatically: the API stores a comparison per call, so a retry after a timeout would create a second battle (endpoints.md, gap B-8). Retries of those are a user action.
- Only transient kinds (`network`, `timeout`, `rate_limited`, `server` except 501); never another 4xx.
- At most 2 retries, exponential backoff from 500 ms with equal jitter, capped at 8 s; never sooner than `Retry-After`, and not at all when `Retry-After` is longer than 20 s (the error goes to the caller, which can say "try again in N seconds").
- Direct calls retry in the transport. TanStack Query calls pass `retry: false` to the transport and let the QueryClient retry with the same policy (`queryRetry`, `queryRetryDelay`), so nothing is retried twice. Mutations never retry.
- Votes go through `createVoteQueue()`: a vote that fails for a transient reason is stored and sent again on `online` events with backoff; one the API rejects for good is dropped; `clear()` on sign-out.

## Streaming

`api.streamChat(input)` is an async generator of `{ type: 'delta', text }` events followed by one `{ type: 'done', finishReason, usage }`. The parser in `sse.ts` follows the SSE spec (LF, CR and CRLF, lines and multi-byte characters split across chunks, multi-line `data:`, comments) and the chat protocol (`ai.stream.delta`, `ai.stream.done`, `ai.error`, `[DONE]`; unknown event types are skipped). Leaving the loop or aborting the signal cancels the request.

## Mock mode

`createApiClient({ mock: true })` (or `VITE_API_MOCK=1` with `createApiClientFromEnv`) answers every call from `mock/mock-fetch.ts`, an in-memory `fetch`, so headers, errors, schemas and the SSE parser run as in production. It is loaded with a dynamic import, so it is not in the main bundle, and it is off unless the variable is set.

- Data: the recorded live leaderboard (seven rows, in the API's duplicate-casing wire format), its models, two seeded threads, a fake battle with two labelled demo answers, a streamed chat answer cut into 48-byte chunks, a small WAV for speech. Threads, votes and visibility changes are kept per adapter instance. The mock serves the documented contract, including `GET /api/models/{id}` and `GET /api/users/me`, which answer 404 live today (KNOWN_ISSUES N7).
- Without a token provider it uses a demo token; it answers 401 like the API when a protected call has none.
- Error scenarios (`MOCK_SCENARIOS`), per request with the `x-mock-scenario` header or for all requests with the `scenario`/`getScenario` options: `unauthorized`, `forbidden`, `not-found`, `validation`, `rate-limited`, `server-error`, `bad-gateway`, `gateway-timeout`, `malformed`, `network-error`, `timeout`, `stream-error`, `empty`. An unknown name answers 400, so a typo fails loudly.
- **Mock answers are never real ones.** Every canned answer starts with "Demo mode: this answer is canned, no model was called.", and `api.isMock` tells the UI to label the screen as a demo.

## TanStack Query

`createQueryClient()` sets the defaults (30 s stale time, 5 min garbage collection, the retry policy above, no mutation retries). `apiKeys` is the key factory: hierarchical, so `invalidateQueries({ queryKey: apiKeys.threads.all })` covers every thread query; the share view has its own keys. Query builders (`leaderboardQuery(api)`, `threadsQuery(api)`, `threadQuery(api, id)`, ...) carry the key, the function (with TanStack's abort signal) and a stale time per resource (`STALE_TIMES`). Mutation builders (`startBattleMutation(api)`, `voteMutation(queue)`, `createThreadMutation(api, queryClient)`, ...) keep the thread cache in step. The `<QueryClientProvider>` is added to `root.tsx` by the first slice that renders server data.

## Zod

The schemas use Zod 4 (the classic API). They normalise more than they validate: aliases (`withAliases`), numeric strings (`numeric`), `{ items }` or arrays (`listOf`), nullable fields, safe fallbacks for unknown enum values. Only output types leave `schemas/` (`ModelStat`, `Battle`, `Thread`...). `zod/mini` would save a few kilobytes but reads worse for transform-heavy schemas; the client loads on app routes (the arena budget is 260 KB gzip), so the classic API stays unless a bundle budget says otherwise.

## Adding an endpoint

1. Document it in `docs/api/endpoints.md` (request, response, auth, errors, quirks), with a recorded response when it is a public `GET` (never `POST` to production).
2. Add or extend the schema in `schemas/<group>.ts`: normalise, export the output type.
3. Add the function to `endpoints/<group>.ts`: path under `/api/`, `auth`, a timeout from `TIMEOUTS`, local input checks, JSDoc with the method and path. Path params go through `pathSegment()`.
4. Export the function's types and helpers from `index.ts`; check that `client.ts` spreads the group (new groups only).
5. Add the route to `mock/mock-fetch.ts`, in the API's wire format.
6. Add a query key and a query or mutation builder in `query/` when screens will use it.
7. Tests: the schema against a fixture in `web/tests/fixtures/api/`, the request body or path in `client.test.ts`, parity in `mock.test.ts`.
8. Add a row to the "Client mapping" table in `docs/api/endpoints.md`.

Owner: @harshbhx
