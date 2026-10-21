# DualMind API: endpoint map for the Arena web UI

The contract of every backend endpoint the Arena web UI calls, as it behaves today. It is the single source of truth for the typed API client in the React rewrite (see [migration plan, section 5](../redesign/migration-plan.md#5-api-client-and-worker)) and for the later backend and API-testing phase.

- **Checked against:** DualMind_UI `master` at `cee9356` on 2026-10-20.
- **Method:** read from the client code (`js/api/`, `js/ui/app.js`, `components/`, `worker.js`), cross-checked with the published OpenAPI document (<https://dev-doc.dualmindlab.tech/api-reference/openapi.json>) and with `GET` probes of the live API. Every row says whether it was verified live or only read from code.
- **Not covered:** the admin API (`/api/admin/*`). The Arena UI never calls it; see the [Admin API docs](https://dev-doc.dualmindlab.tech/api-reference/admin/overview.md).

The endpoint pages are indexed at <https://dev-doc.dualmindlab.tech/llms.txt>.

Legend for **Status**: `used` (called by the UI and works), `broken` (called but fails or has no effect), `unused` (client method exists, nothing calls it), `proposed` (does not exist yet).

---

## 1. Overview

### Base URLs

| Environment | Base URL | Notes |
| --- | --- | --- |
| Production API | `https://api.dualmindlab.tech` | What the browser calls directly today (cross-origin, CORS `*`). |
| Local API | `http://localhost:5079` | Default in `js/api/config/ApiConfig.js` and `js/apiInstance.js` when no config is set. |
| Same-origin via the Worker | `/api/*` on the Arena origin | The `dualmind-arena` Worker proxies `/api/*` to `BACKEND_URL` (default production API) and maps `/api/health` to `/health`. The current UI does **not** use it (it always sets an absolute base URL). The new client will. While `FORCE_WAITLIST` is `true` in `worker.js`, every request to the Arena origin, `/api/*` included, gets a 302 to the waitlist. |
| Supabase | `window.DUALMIND_CONFIG.supabase.url` | Project URL and anon key come from `config.js` / environment. They are not repeated here. |

The base URL is resolved from `window.DUALMIND_CONFIG` (`apiBaseUrl`, `backendUrl` or `serverUrl`), then `localStorage['dualmind.api.baseUrl']`, then `http://localhost:5079`.

### Authentication

The API authenticates with a **Supabase access token (JWT) sent as `Authorization: Bearer <token>`**. The API reads the user's role from `public.users` on each authenticated call.

Token lookup in `js/api/utils/authProvider.js`, first hit wins: `window._DUALMIND_AUTH.getAccessToken()`, `window.DualMindAuth.getAccessToken()`, `window.getSupabaseAccessToken()`, then localStorage keys (`dualmind.auth.supabase`, `dualmind.auth.token`, `supabase.auth.token`, `sb-access-token`, any `sb-*-auth-token`). If none is found and `DUALMIND_CONFIG.auth.allowGuest` is on (it is `true` in `js/apiInstance.js`), the **Supabase anon key is sent as the bearer token**. It is not a user token, so protected routes should reject it (not tested, it needs a protected call); the new client should drop guest mode.

| Public (no token needed) | Needs a token |
| --- | --- |
| `GET /health` (and `/api/health`), `GET /api/arena/model-stats`, `GET /api/settings/feature-flag/{key}`, `GET /api/threads/{id}` and `/messages` for `public` or `unlisted` threads while the `public_sharing` flag is on | everything else: models, battle, chat, vote, thread list/create/rename/delete/visibility, `users/sync` |

The leaderboard modal source comment says model-stats "requires auth". It does not (verified live), but `js/leaderboardPage.js:165` still shows "Login required" before calling it. The public waitlist site uses it without a token.

### Common headers

| Header | Direction | Value | Notes |
| --- | --- | --- | --- |
| `Content-Type` | request | `application/json` | Set on every request by `HttpClient.buildHeaders`, including `GET`s. |
| `Accept` | request | `text/event-stream` | Only for `/api/arena/chat/stream`. Other calls send no `Accept`. |
| `Authorization` | request | `Bearer <supabase access token>` | See above. |
| `x-request-id` | request | UUID | **Proposed** for the new client. Not sent today. Lets one id follow a call through the Worker, the API and logs. |
| `x-correlation-id` | response | short hex, e.g. `471afe95` | Returned by the API (seen live). Log it next to errors. |
| `www-authenticate` | response | `Bearer` | On 401. |
| `Retry-After` | response | seconds | Read on 429 by `errors.js`. Never seen live (no rate limit was triggered). |
| `access-control-allow-origin` | response | `*` | API and Worker proxy. |

### Response envelope quirks

| Quirk | Where | What the client does today |
| --- | --- | --- |
| Lists are `{ items: T[] }` | models, threads, messages, model-stats | Services unwrap with `data.items \|\| data \|\| []`, so a bare array also works. |
| Some lists add `success: true` | model-stats (live) | Ignored. |
| camelCase is canonical (`maxTokens`, `threadId`, `comparisonId`) | requests and most responses | Backend uses a camelCase contract resolver. |
| **model-stats returns every field twice, camelCase and snake_case, plus aliases** | live | See section 3.7. Documented in OpenAPI as camelCase only. |
| Thread id is `threadId` in responses | threads | UI also accepts `id` and `thread_id` (`app.js:1688`, `Sidebar.js:63`). |
| Chat text lives in three places: `output.content[].text` (type `output_text`), `message`, `text` | chat, dualchat | `extractors.js` tries them in that order. |
| `model` is an object `{ name, displayName, provider }` in chat responses, a UUID or name string elsewhere | chat vs request | Request `model1`, `model2`, `model` take a model **id (UUID)** or `auto`; response `model` is an object. |
| Success flag: `success: boolean` on most bodies, absent on thread objects and on `feature-flag` | mixed | Never relied on by the UI; HTTP status is. |
| Mutations return `{ success, message }` only | PATCH/DELETE threads, vote | The UI does not read the body. |

### Error model observed

| Status | When | Body shape | Client class (`errors.js`) | Retried today |
| --- | --- | --- | --- | --- |
| 400 | invalid body | arena chat routes: `{ object: "ai.error", code: "INVALID_REQUEST", message, timestamp }`; other routes: `{ success: false, error, code }` | `ValidationError` | no |
| 401 | missing, expired or invalid token | **empty body**, header `www-authenticate: Bearer` (verified live on `GET /api/models`) | `AuthError` ("Request failed (401)") | no |
| 403 | not the owner of the thread | `{ success: false, error, code }` (per OpenAPI) | `AuthError` | no |
| 404 | unknown route or thread | `GET /api/users/me` gives an empty 404 (live); threads give `{ success, error, code }` | `ApiError` | no |
| 408 | client timeout (synthetic) | none | `TimeoutError` | yes |
| 422 | not used by the API as far as seen; client maps it like 400 | n/a | `ValidationError` | no |
| 429 | rate limit | unknown shape; `Retry-After` read if present | `RateLimitError` | yes, with the backoff below (the header is read but ignored for delay) |
| 5xx | provider or server failure | arena routes: `{ object: "ai.error", code: "API_ERROR" or "STREAM_ERROR", message }`; others `{ success: false, error, code }` | `ApiError` | yes |
| 502 | Worker could not reach the backend | `{ error: "bad_gateway", requestId }` since the proxy hardening (#24); before it `{ success: false, message: "Backend API Error: ...", error: "<error.toString()>" }` | `ApiError` | yes |
| 504 | Worker got no answer from the backend in time (30 s; 65 s for `dualchat` and `chat`, per #30; event streams are never cut) | `{ error: "gateway_timeout", requestId }` | n/a (new) | n/a |

#### One error shape, on request (BE-1)

The table above is what a caller sees **without** the opt-in, and it stays unchanged (the legacy app is such a caller; error statuses add `Vary: Accept`, nothing else). A caller that sends `Accept: application/problem+json` (the typed client does, as `application/json, application/problem+json;q=0.9`) gets an RFC 9457 body on every non-2xx `/api/*` answer, including the Worker's 502 and 504, with the same status, `X-Request-Id` and `WWW-Authenticate`, `Retry-After`, `x-correlation-id` and `Allow` kept. Event streams and success bodies are never rewritten. Design: [BE-1](../backend/designs/BE-1-error-shape.md); code: `server/problem-rewrite.js`.

```json
{ "type": "https://arena.dualmindlab.tech/problems/validation_error", "title": "Invalid request", "status": 400,
  "detail": "prompt is required", "instance": "/api/arena/dualchat", "requestId": "...", "code": "INVALID_REQUEST" }
```

| Row | Observed shape | Status | Problem type | `detail` |
| --- | --- | --- | --- | --- |
| 1 | arena `ai.error` | 400 | `validation_error` | upstream `message` |
| 1b | arena `ai.error` | 5xx | by status (`internal_error`, `bad_gateway`, `gateway_timeout`) | fixed: "The model service failed." |
| 2 | `{ success: false, error, code }` | 400, 422 / 403 / 404 / 409 / 5xx | `validation_error` / `forbidden` / `not_found` / `conflict` / `internal_error` | upstream `error` (5xx: fixed) |
| 3 | empty body | 401 | `unauthorized` | "Sign in again." |
| 4 | empty body | 404 | `not_found` | "No such resource." |
| 5, 6 | Worker `{ error, requestId }` | 502, 504 | `bad_gateway`, `gateway_timeout` | fixed |
| 7 | ASP.NET ProblemDetails | 400 | `validation_error` | `detail` or `title`, plus `errors: [{ path, message }]` |
| 8 | legacy `Backend API Error` 502 | 502 | `bad_gateway` | fixed (the exception text is logged, never sent) |
| 9 | anything else (not JSON, over 64 KiB, unknown shape) | any | by status (400 `validation_error`, 401 `unauthorized`, 403 `forbidden`, 404 `not_found`, 408 `gateway_timeout`, 409 `conflict`, 413 `payload_too_large`, 415 `unsupported_media_type`, 429 `rate_limited`, other 4xx `validation_error`, 5xx `internal_error`) | fixed per type |

4xx `detail` is the upstream text when it is plain and at most 300 characters (longer is cut with an ellipsis); 5xx `detail` is always a fixed sentence. The upstream `code` is kept as an extension member. Each rewrite logs `problem_rewrite` with `requestId`, `route`, `status`, `row`, `type`.
| network | offline, CORS, DNS | `TypeError` | `NetworkError` | yes |

The error message the UI shows is `data.message || data.error || "Request failed (status)"`. Two error shapes (`message` vs `error`) plus an empty 401 body are why that fallback chain exists.

### Timeouts and retries

| | Today (`HttpClient`) | Proposed for the new client |
| --- | --- | --- |
| Timeout | 30 s for every non-stream call, including `dualchat` (two models in parallel). `stream()` has **no** timeout. Health check: 5 s. | 15 s for reads, 60 s for `dualchat` and `chat`, no total timeout on a stream but an idle timeout (for example 30 s without an event). |
| Retries | **Every method retries by default**: 2 retries (3 attempts), exponential backoff 1 s, 2 s with up to 30 % jitter, capped at 30 s, on 408, 429, 5xx, timeouts and network errors. Only the health check passes `retry: false`. | `GET`: retry up to 2 times with backoff, honour `Retry-After`. `POST dualchat`, `POST chat`, `POST chat/stream`, `POST model-vote`, `POST threads`: **no automatic retry** (a retry after a timeout can create a second battle). User-initiated retry only. |
| Streams | Not retried (`stream()` makes one attempt). | Same. |

Consequence today: a `POST /api/arena/dualchat` that times out at 30 s while the API is still working is sent again, and the API creates a second comparison. See [Gaps](#5-gaps-and-proposals-for-the-backend-phase).

---

## 2. Endpoint index

`Used by` points at the code that triggers the call (file:line at `cee9356`). "Live" means verified with a real `GET`; no `POST`, `PATCH` or `DELETE` was sent to production.

| Group | Method | Path | Auth | Used by | Status |
| --- | --- | --- | --- | --- | --- |
| Health | GET | `/health` (Worker alias `/api/health`) | public | `js/api/DualMindApi.js:74-83`, `js/ui/app.js:184` | used (live) |
| Models | GET | `/api/models` | token | `js/api/services/ModelService.js:23`, `js/ui/app.js:291` | used (401 live) |
| Models | GET | `/api/models/{id}` | token | `ModelService.js:33` | unused, 404 (KNOWN_ISSUES N7) |
| Arena | POST | `/api/arena/dualchat` | token | `ArenaService.js:79`, `js/ui/app.js:885` | used |
| Arena | POST | `/api/arena/chat` | token | `ArenaService.js:35`, `js/ui/app.js:1048` | used |
| Arena | POST | `/api/arena/chat/stream` | token | `ArenaService.js:58` | unused (no UI caller; parser exists) |
| Arena | POST | `/api/arena/model-vote` | token | `ArenaService.js:127`, `js/ui/app.js:1194`, `app.js:1653` (queue flush) | used |
| Arena | GET | `/api/arena/model-stats` | public | `ArenaService.js:134`, `js/leaderboardPage.js:174`, `js/ui/leaderboardModal.js:267` | used (live) |
| Arena | POST | `/api/audio/tts` | token | `ArenaService.js:90`, `js/ui/app.js:1414` | deprecated alias of `/api/speech/generate` at the Worker (BE-2); 404 on the API itself |
| Arena | POST | `/api/speech/generate` | token | none yet | proposed (the real route, KNOWN_ISSUES #7) |
| Arena | POST | `/api/arena/dualchat/stream` | token | none | proposed (new-features B-1) |
| Threads | GET | `/api/threads?limit=` | token | `ThreadService.js:29`, `components/Sidebar.js:60` | used |
| Threads | POST | `/api/threads` | token | `ThreadService.js:65`, `js/ui/app.js:1687`, `app.js:1714` | used |
| Threads | GET | `/api/threads/{id}` | public if shared, else token | `components/SharedThreadView.js:64`, `share/index.html:106` | used |
| Threads | GET | `/api/threads/{id}` (owner view) | token | `js/ui/app.js:1761` calls `api.fetchThread`, which does not exist on the client | broken (always falls back to `private`) |
| Threads | PATCH | `/api/threads/{id}` | token | `ThreadService.js:75`, `components/Sidebar.js:417` | used |
| Threads | DELETE | `/api/threads/{id}` | token | `ThreadService.js:84`, `components/Sidebar.js:447` | used |
| Threads | GET | `/api/threads/{id}/messages` | public if shared, else token | `ThreadService.js:48`, `js/ui/app.js:1750`, `components/SharedThreadView.js:71`, `share/index.html:114` | used |
| Threads | PATCH | `/api/threads/{id}/visibility` | token | `components/ShareModal.js:270` (direct `fetch` fallback) | used |
| Users | POST | `/api/users/sync` | token | `UserService.js:28`, `js/ui/app.js:1504`, `app.js:1586`, `js/feature-flags.js:174` | used (not in OpenAPI) |
| Users | GET | `/api/users/me` | token | `UserService.js:36` | unused, 404 (KNOWN_ISSUES N7) |
| Settings | GET | `/api/settings/feature-flag/{key}` | public | `js/auth/api-service.js:563` (deprecated file, not loaded) | unused (live) |
| Misc | GET | `/api/version` | none | `DualMindApi.js:93` | unused, 404 (N7) |
| Legacy | POST | `/api/auth/login`, `/api/auth/signup` | none | `js/auth.js:40`, `js/auth.js:86` (file is not loaded by any HTML page) | unused |
| Supabase | various | Supabase Auth methods (`signUp`, `signInWithPassword`, `signInWithOtp`, `verifyOtp`, `signInWithOAuth`, `updateUser`, `resetPasswordForEmail`, `refreshSession`, `signOut`) | anon key + session | `js/auth/supabase-auth.js` | used |
| Supabase | GET | `<supabase>/rest/v1/users?select=role,user_id,energy_balance&user_id=eq.{id}&limit=1` | anon key + token | `js/feature-flags.js:197`, `:209` | used (role lookup) |
| Supabase | POST | `<supabase.authEmailFunctionUrl>` (edge function) | token | `js/resend-auth-email.js:154` | used |
| Waitlist | POST | `/api/signup` on `early.dualmindlab.tech` | none | `waitlist-worker/` (not the Arena UI) | used by the waitlist site |

Counts: 14 Arena API routes work and are used by the UI, 1 is broken (TTS) and 1 more is called through a client method that does not exist (owner `GET /api/threads/{id}`). Beyond those, 7 client methods or files are unused, and 2 routes are proposed.

---

## 3. Endpoint groups

TypeScript-style types below use `?` for optional and `|` for unions. Ids are UUID strings. Fields marked "(code)" come from reading the client; the rest match the OpenAPI document.

### 3.1 Health

**`GET /health`** (alias `GET /api/health`, which the Worker rewrites to `/health`; the API also answers `/api/health` itself, verified live).

- Purpose: liveness. The UI calls it at boot (`app.js:184`) to set `backendAvailable`. Primary path is `/health` when a base URL is set, then falls back to `/api/health`. 5 s timeout, no retry.
- Auth: none.
- Response 200:

```ts
type Health = { status: string; message: string; timestamp: string; version: string; instanceId: string };
```

Recorded 2026-10-20 (live):

```json
{"status":"healthy","message":"DualMind API is running","timestamp":"2026-10-20T20:41:38.3608632Z","version":"1.0.0","instanceId":"67c5fc5b5352c545a3db2d7e0cb56b5b16fb0b1c0c9d12853a22b8c1f2c486d7"}
```

- Errors: any failure counts as "backend unavailable" and switches the UI to mock mode.
- Known issues: the UI treats mock mode as success (canned answers). The new app shows an offline state instead.

### 3.2 Models

**`GET /api/models`**

- Purpose: model catalogue for the model picker. Active models, newest first.
- Auth: token. Unauthenticated: `401`, empty body, `www-authenticate: Bearer` (live).
- Request: no body, no params.
- Response 200:

```ts
type ModelSummary = {
  modelId: string; modelName: string; displayName: string;
  providerName: 'groq' | 'google' | 'cloudflare'; isFree: boolean; status: string;
};
type ModelsResponse = { items: ModelSummary[] };
```

- Errors: 401, 500 `{ success, error, code }`.
- Known issues: the UI stores the list in `window._DUALMIND_MODELS` and matches `m.modelId`. `modelName` can carry a provider prefix such as `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, so always show `displayName`.

**`GET /api/models/{id}`**: unused, returns 404 (KNOWN_ISSUES N7). Remove or implement before use.

### 3.3 Arena: battle (`dualchat`)

**`POST /api/arena/dualchat`**

- Purpose: one prompt to two models in parallel; returns both answers plus a `comparisonId` that the vote refers to. Leave `model1` and `model2` empty for a blind Battle; set both for Side by Side.
- Auth: token.
- Request (what `ArenaService.dualChat` actually sends):

```ts
type DualChatRequest = {
  prompt: string;
  maxTokens: number;                 // client default 4096
  selectionMode: 'random' | 'topper'; // client default 'random'
  model1?: string;                   // model id
  model2?: string;
  system?: string;
  threadId?: string;
  userId?: string;                   // ignored by the API, identity comes from the token
};
```

`temperature` and `battleId` are passed by `app.js:885` but `dualChat()` drops them, so they never reach the API. OpenAPI lists `temperature` as accepted.

- Response 200:

```ts
type AgentReply = {
  object?: string; success?: boolean;
  message: string;                                   // reply text
  output?: { type: string; content: { type: string; text: string }[] };
  model: { name: string; displayName: string; provider: 'groq' | 'google' | 'cloudflare' };
  prompt?: string; selectionMode?: 'automatic' | 'manual' | 'random' | 'topper';
  responseTimeMs?: number;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  timestamp?: string;
};
type DualChatResponse = {
  success?: boolean;
  comparisonId: string;
  agent1: AgentReply; agent2: AgentReply;
  arena?: { comparison: { winnerByLength: 'agent1' | 'agent2' | 'tie'; winnerByTokens: 'agent1' | 'agent2' | 'tie'; verdict: string; userWinner: string | null; agent1MessageLength: number; agent2MessageLength: number; agent1Tokens: number; agent2Tokens: number };
            models: { agent1: string; agent2: string } };
  timestamp?: string; totalResponseTimeMs?: number;
};
```

- Streaming: none. The UI "pseudo-streams" the finished text with a typing animation (`streamText`, `app.js:~925`).
- Blind battle rule: the UI must not show `model.displayName` before the vote. The response includes it, so hiding it is the client's job (`turn.left.modelName` is set after the response and revealed on vote).
- Errors: 400 and 500 as `{ object: "ai.error", code, message, timestamp }`; 401 empty.
- Idempotency: **not idempotent, no key.** Each successful call stores a new comparison. `HttpClient` retries it (see section 1) which can create duplicates.
- Known issues: 30 s client timeout is short for two models; `battleId` is ignored by the API (the UI comment says so at `app.js:~896`); not recorded live (would require a `POST`).

### 3.4 Arena: single chat

**`POST /api/arena/chat`**

- Purpose: Direct Chat with one model, or `auto` for a random one. Full reply in one response.
- Auth: token.
- Request:

```ts
type ChatRequest = {
  prompt: string;
  model: string;        // model id or 'auto' (client default 'auto')
  maxTokens: number;    // client default 4096
  system?: string; threadId?: string; temperature?: number;
  userId?: string;      // ignored by the API
};
```

- Response 200: an `AgentReply` (see 3.3) at the top level. The client normalises it to `{ text, message, model, usage, finishReason, responseTimeMs, timestamp }` (`extractors.js`); `finishReason` is read from `finishReason` or `finish_reason` but the OpenAPI shape has no such field.
- Errors: as 3.3. `data.object === 'ai.error'` can arrive with a 200 in the deprecated `api-service.js`; the live client checks HTTP status only.
- Idempotency: none; the same retry risk as 3.3.

### 3.5 Arena: chat stream

**`POST /api/arena/chat/stream`**

- Purpose: same request as `/api/arena/chat`, reply streamed as Server-Sent Events. **No UI screen uses it today** (`ArenaService.chatStream` has no caller); it is the building block for streamed Direct mode and for B-1.
- Auth: token. Request headers: `Accept: text/event-stream`.
- Request: `ChatRequest` (3.4).
- Response 200, `content-type: text/event-stream`. Each event is one line `data: <json>`; blank lines separate events. Parse with `fetch` and a `ReadableStream`, not `EventSource` (it needs a POST body and a header).

```ts
type StreamEvent =
  | { object: 'ai.stream.delta'; delta: { type: string; text: string } }
  | { object: 'ai.stream.done'; finishReason: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }
  | { object: 'ai.error'; code: 'INVALID_REQUEST' | 'API_ERROR' | 'STREAM_ERROR'; message: string; timestamp: string };
// The stream can also end with the literal line: data: [DONE] (the client ignores it)
```

Example body:

```text
data: {"object":"ai.stream.delta","delta":{"type":"text","text":"Hel"}}

data: {"object":"ai.stream.delta","delta":{"type":"text","text":"lo"}}

data: {"object":"ai.stream.done","finishReason":"stop","usage":{"promptTokens":9,"completionTokens":2,"totalTokens":11}}
```

(Illustrative, built from the OpenAPI schema: not recorded live, because it needs an authenticated `POST`.)

Client rules in `HttpClient.stream()`:

1. Only lines starting with `data: ` are read; `[DONE]` is ignored.
2. Append `delta.text` for `ai.stream.delta`.
3. Stop on `ai.stream.done`.
4. Throw `ApiError(message, 500)` on `ai.error` (the status is hard-coded, whatever the real cause).
5. If the response is not `text/event-stream`, the body is yielded as raw text.
6. Abort exits silently (no error).

- Errors before the stream starts: normal status codes and bodies (401 empty). After it starts, errors arrive as `ai.error` events with HTTP 200.
- Known issues: lines are split on `\n` only and the last partial line is dropped at end of stream; unparseable JSON is skipped silently; no idle timeout; no retry (correct).

### 3.6 Arena: vote

**`POST /api/arena/model-vote`**

- Purpose: record the user's pick for a battle. Voting marks the comparison as revealed. One vote per user per comparison.
- Auth: token.
- Request:

```ts
type VoteRequest = {
  comparisonId: string;
  voteChoice: 'left' | 'right' | 'tie' | 'both-bad';
  voteDurationMs?: number;     // ms between answers finishing and the vote (client-measured)
  userId?: string;             // ignored by the API
  winnerModelName?: string;    // legacy positional-argument form of submitVote, not used by the app
};
```

- Response 200: `{ success: boolean; message: string }`. It does **not** return the new Elo ratings or the revealed model names; the UI already has the names from `dualchat`.
- Errors: 400 and 500 as `{ success: false, error, code }`; 401 empty. A second vote on the same comparison is expected to be a 400 (not verified live).
- Offline behaviour: when the backend is unavailable, the UI stores the vote in `localStorage` (pending vote queue, `app.js:1630`) and re-sends on reconnect (`app.js:1653`); entries that still fail stay queued.
- Idempotency: the API enforces one vote per comparison, so a replay is safe in effect, but the client's blind retry plus the queue can surface confusing 400s. Treat a "duplicate vote" 400 as success once the API documents its code.

### 3.7 Arena: model stats (leaderboard)

**`GET /api/arena/model-stats`**

- Purpose: ranked models with Elo and win/loss/tie counts. Used by the leaderboard page and modal, and publicly by the waitlist site.
- Auth: **none** (verified live without a token).
- Request: no params.
- Response 200:

```ts
type ModelStat = {
  // canonical (documented)
  modelId: string; modelName: string; displayName: string; providerName: string;
  eloScore: number; eloRank: number;
  totalWins: number; totalLosses: number; totalTies: number; totalResponses: number;
  winRate: number;               // percent, 0-100 (64.58 means 64.58 %), not a fraction
  // undocumented duplicates and aliases (live)
  model_id: string; model_name: string; display_name: string; provider_name: string;
  elo_rating: number; elo: number;
  total_matches: number; matches: number;
  wins: number; win_rate: number;
};
type ModelStatsResponse = { success: true; items: ModelStat[] };
```

Recorded 2026-10-20 (live): 53 items, ordered by rank. Trimmed to 2:

```json
{"success":true,"items":[
 {"modelId":"fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5","modelName":"@cf/meta/llama-3.3-70b-instruct-fp8-fast","displayName":"llama-3.3-70b-instruct-fp8-fast","providerName":"cloudflare","eloScore":1150.0,"eloRank":1,"totalWins":62,"totalLosses":27,"totalTies":9,"totalResponses":96,"winRate":64.58,"model_id":"fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5","model_name":"@cf/meta/llama-3.3-70b-instruct-fp8-fast","display_name":"llama-3.3-70b-instruct-fp8-fast","provider_name":"cloudflare","elo_rating":1150.0,"elo":1150.0,"total_matches":96,"matches":96,"wins":62,"win_rate":64.58},
 {"modelId":"2f2219b0-d1ce-402d-b6d0-29d1e67ef04b","modelName":"@cf/meta/llama-3.1-70b-instruct","displayName":"llama-3.1-70b-instruct","providerName":"cloudflare","eloScore":1140.0,"eloRank":2,"totalWins":154,"totalLosses":55,"totalTies":36,"totalResponses":250,"winRate":61.6,"model_id":"2f2219b0-d1ce-402d-b6d0-29d1e67ef04b","model_name":"@cf/meta/llama-3.1-70b-instruct","display_name":"llama-3.1-70b-instruct","provider_name":"cloudflare","elo_rating":1140.0,"elo":1140.0,"total_matches":250,"matches":250,"wins":154,"win_rate":61.6}
]}
```

- Errors: 500 `{ success: false, error, code }`.
- Idempotent, cacheable. The new client should read only the camelCase fields and validate the snake_case ones away with Zod.
- Known issues: `winRate` is `totalWins / totalResponses` as a percent (62 / 96 = 64.58), so ties count as non-wins. `modelName` includes the provider prefix.

### 3.8 Arena: text to speech

**`POST /api/audio/tts`** (what the legacy client calls): **404 on the API itself** (KNOWN_ISSUES #7, confirmed live by its author on 2026-10-18; not re-sent here). **Fixed at the Worker (BE-2, [design](../backend/designs/BE-2-tts-route.md)):** `https://arena.dualmindlab.tech/api/audio/tts` is a deprecated alias. The proxy validates the body (JSON object, `text` 1 to 5000 characters after trimming, optional `voice` of `[A-Za-z0-9._-]{1,64}`, at most 16 KiB; 400, 413, 415 and, for other methods, 405 with `Allow: POST`), forwards exactly `{ text, voice? }` to `POST /api/speech/generate`, and answers `200 audio/*` with `Cache-Control: no-store`, `Deprecation: @1792540800` and `Link: </api/speech/generate>; rel="successor-version"`. An `application/octet-stream` or untyped body is accepted when it starts with `RIFF....WAVE` and served as `audio/wav`; any other 2xx content type is a 502. Upstream errors pass through like any v1 call (and become problems on request). Removal plan: design section 14.

**`POST /api/speech/generate`** (the real route per KNOWN_ISSUES #7; not in the published OpenAPI document):

```ts
type SpeechRequest = { text: string; voice?: string };
// 200: audio/wav (binary body)
```

- Client behaviour: `responseType: 'blob'`; on any error `app.js:1438-1441` falls back to `window.speechSynthesis`, so users hear the browser voice. A 404 is not retryable, so the failure is immediate.
- Auth: token. Idempotent (same text gives equivalent audio) but costs provider quota.
- Fix: point the client at `/api/speech/generate` (new client does), and add the route to OpenAPI.

### 3.9 Threads, messages and visibility

Thread object (from OpenAPI):

```ts
type Visibility = 'private' | 'unlisted' | 'public';
type Thread = {
  threadId: string; userId: string; title: string;
  mode: 'battle' | 'arena' | 'direct';
  visibility: Visibility; messageCount: number;
  createdAt: string; updatedAt: string | null;
};
```

| Call | Request | Response | Notes |
| --- | --- | --- | --- |
| `GET /api/threads?limit=20` | query `limit` (client sends 20) | `{ items: Thread[] }` | The user comes from the token. The client no longer sends `userId`. Newest first. |
| `POST /api/threads` | `{ title?: string; mode?: 'battle' \| 'arena' \| 'direct' }` | `Thread` | Title is the first prompt cut to 40 chars plus `...`. New threads are `private`. On failure the UI syncs the user and retries once (`app.js:1706`). Not idempotent. |
| `GET /api/threads/{threadId}` | none | `Thread` | Public for `public` and `unlisted` threads while `public_sharing` is on, otherwise owner only. 403 not allowed, 404 unknown. |
| `PATCH /api/threads/{threadId}` | `{ title: string }` | `{ success, message }` | Owner only. Idempotent. |
| `DELETE /api/threads/{threadId}` | none | `{ success, message }` | Owner only. Idempotent in effect (second call is 404). |
| `GET /api/threads/{threadId}/messages` | none | `{ items: ThreadMessage[] }` | Oldest first. With a token, `voteChoice` and `hasVoted` reflect the caller's own votes. |
| `PATCH /api/threads/{threadId}/visibility` | `{ visibility: Visibility }` | `{ success, message, visibility }` | Owner only. Share link is `https://arena.dualmindlab.tech/share/{threadId}` (but see KNOWN_ISSUES #3). Idempotent. |

```ts
type ThreadMessage = {
  messageId: string; threadId: string; position: number;
  promptText: string;
  model1Name: string; model2Name: string;
  model1Response: string; model2Response: string;
  model1TimeMs: number; model2TimeMs: number;
  comparisonId: string;
  voteChoice?: 'left' | 'right' | 'tie' | 'both-bad'; hasVoted: boolean;
  createdAt: string;
};
```

- Messages are battle-shaped (two responses per row). Direct-chat turns are rebuilt from the same rows (`app.js:1752+`, simplified).
- Auth detail: shared views call `GET /api/threads/{id}` and `/messages` **without** a token (`SharedThreadView.js:64`, `share/index.html:106`), so a private thread returns 401 or 403 there and the page shows "Failed to load thread".
- Base URL for shared views: `https://api.dualmindlab.tech` on `dualmindlab.tech` and `workers.dev` hosts, config value or `http://localhost:5079` elsewhere (`SharedThreadView.js:getBaseUrl`).
- **Broken: owner-side visibility read.** `app.js:1761` calls `this.api.fetchThread(threadId)`, but `DualMindApi` has no `fetchThread` (only the deprecated `js/auth/api-service.js` does). The call throws, the `catch` sets `currentThreadVisibility = 'private'`, so a thread that is already public shows as private after reload. `ThreadService.getThread` is the right method.
- **Direct `fetch` for visibility.** `ShareModal.js:262` looks for `api.updateThreadVisibility`, which also does not exist on `DualMindApi`, so it always takes the direct `fetch` fallback. That path reads the base URL from `DUALMIND_CONFIG.apiBaseUrl` or `serverUrl` (not `backendUrl`) and the token from `DualMindAuth`. The new client should have `setThreadVisibility`.
- Errors: 400 invalid body, 401 empty, 403 not owner, 404 unknown thread, 500; bodies `{ success: false, error, code }`.

Request shapes were read from code and OpenAPI. No thread endpoint was probed live (all need a token).

### 3.10 Users: sync and profile

**`POST /api/users/sync`**

- Purpose: create or update the `public.users` row for the signed-in Supabase user. Called on every app boot and after login, and again before a thread create fails.
- Auth: token.
- Request (`app.js:1481`, `feature-flags.js:buildSyncFallbackPayload`):

```ts
type UserSyncRequest = {
  id: string; email: string; phone: string | null; name: string;
  avatar_url: string | null; provider: string;   // snake_case avatar_url, others camelCase-ish
};
```

- Response: a user object. Fields read by `feature-flags.js` (`normalizeMeResponse`, `extractRole`, `extractEnergyBalance`): `role`, `user_id` or `userId` or `id`, `energy_balance`. The exact shape is **not documented** (the route is missing from the published OpenAPI).
- Idempotent (upsert). Offline sync requests are queued (`app.js:1586`).
- Known issues: undocumented; the request body mixes `avatar_url` (snake) with `phone`, `name`, `provider` (neutral); the response id key varies. `feature-flags.js` uses this route as its primary "me" call and, when the response lacks `role` or `energy_balance`, falls back to the Supabase REST read in 3.12.

**`GET /api/users/me`**: unused and returns 404 (verified live, empty body; KNOWN_ISSUES N7). The comment in `feature-flags.js` still mentions it.

### 3.11 Settings and feature flags

**`GET /api/settings/feature-flag/{key}`** (public)

```ts
type FeatureFlag = { key: string; enabled: boolean };
```

Recorded 2026-10-20 (live): `GET /api/settings/feature-flag/public_sharing`

```json
{"key":"public_sharing","enabled":true}
```

- Only the deprecated `js/auth/api-service.js:563` calls it; the UI does not. When `public_sharing` is off, shared threads are not readable without a token, so the share modal should check it.
- Errors: 500 `{ success: false, error, code }`.

### 3.12 Supabase direct calls

These do not go to the DualMind API. The URL and anon key come from `window.DUALMIND_CONFIG.supabase` (`config.js`); they are not recorded here.

| Call | Where | Purpose | Notes |
| --- | --- | --- | --- |
| Supabase Auth methods: `signUp`, `signInWithPassword`, `signInWithOtp`, `verifyOtp`, `signInWithOAuth`, `updateUser`, `resetPasswordForEmail`, `refreshSession`, `signOut`, `onAuthStateChange` | `js/auth/supabase-auth.js` (lines 45-645) | Sign-in, sign-up, one-time codes, password reset | The session's `access_token` is what the DualMind API calls use as the bearer token. |
| `GET {supabase.url}/rest/v1/users?select=role,user_id,energy_balance&user_id=eq.{authUserId}&limit=1`, with headers `apikey: <anon key>`, `Authorization: Bearer <token>` | `js/feature-flags.js:197` | Read the user's `role` and `energy_balance` to unlock tester features | Returns an array (0 or 1 row). If `energy_balance` is not exposed the call fails and the client retries without it (`feature-flags.js:209`). Row-level security must allow a user to read their own row. |
| `POST {supabase.authEmailFunctionUrl}` with `Authorization: Bearer <access_token>` | `js/resend-auth-email.js:154` | Send the welcome or login notification email through a Supabase edge function | Body `{ type: 'welcome' \| 'login', timezone: string, userAgent: string, ...opts }`. Response is read as JSON (`{ success, error? }`). Debounced client-side (30 s default for login emails). If the config key is missing the client returns `{ success: false, error: "Missing config: supabase.authEmailFunctionUrl" }`. |
| `GET https://api.pwnedpasswords.com/range/{prefix}` | `js/auth-modern.js:182` | Breached-password check on sign-up | Third-party, k-anonymity (only a 5-char hash prefix leaves the browser). Listed for completeness. |

---

## 3b. The Worker's own API: `/api/v2`

Everything above is the DualMind API (v1) behind the Worker's same-origin proxy. `/api/v2` is the Worker's own API (BE-0, [design](../backend/designs/BE-0-platform.md)); it is answered by `server/v2/` and never reaches the v1 proxy. The machine-readable contract is [`openapi.v2.json`](./openapi.v2.json) (OpenAPI 3.1, generated from the zod routes, served at `GET /api/v2/openapi.json`); the error types are in [`problems.md`](./problems.md).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v2/health` | public | `{ status, apiVersion, time, environment, bindings }`: the router is alive, and which backend bindings (`DB`, `CACHE`, `EVENTS`, `PUBLIC_BUCKET`) this host has. `environment` is `production` for `arena.dualmindlab.tech` and `preview` for every other host. Never cached. |
| GET | `/api/v2/me` | Bearer (Supabase access token) | `{ userId, role, expiresAt }` from the verified token, no database. 401 for a missing or bad token, 501 `not_enabled` when the deployment cannot verify tokens. |
| GET | `/api/v2/openapi.json` | public | The OpenAPI document. |

Conventions: JSON in and out; camelCase fields and ISO 8601 UTC times; bodies must be `application/json` (415) and at most 1 MiB (413); every response carries `X-Request-Id` (the caller's when it is 8 to 128 characters of `[A-Za-z0-9._:-]`, else a UUID) and every error body repeats it as `requestId`; authenticated responses are `Cache-Control: private, no-store`; no CORS. Errors are always RFC 9457 `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`, `requestId`, plus `errors`, `retryAfter` or `feature` where the type says so), also for 404 (unknown path under `/api/v2/`, never forwarded to v1) and 405 (with `Allow`). `/api/v2` changes only additively; breaking changes need `/api/v3`.

Auth: tokens are verified with the Supabase project's JWKS (`ES256`, `RS256`, `EdDSA`) from `SUPABASE_URL`, and with the legacy secret (`HS256`) when the optional `SUPABASE_JWT_SECRET` secret is set. Without a configured verifier, authenticated routes answer `501 not_enabled` (`feature: "auth"`).

## 4. Not part of the UI, but relevant: the waitlist worker

The pre-launch waitlist (`waitlist-worker/`, served at `early.dualmindlab.tech`) has its own tiny API:

| Method | Path | Auth | Request | Responses |
| --- | --- | --- | --- | --- |
| POST | `/api/signup` | none; same-origin `Origin` required | `{ email: string; ref?: string }` (+ hidden honeypot field `website`) | `201 {status:"created"}`, `200 {status:"exists"}`, `400 {error:"invalid_email"\|"invalid_body"}`, `429 {error:"rate_limited"}`, `403`, `405`, `413`, `415`, `500` |

Details (validation, D1 storage, abuse guards, rate limit) are in [`waitlist-worker/README.md`](../../waitlist-worker/README.md#signups). The same site reads the public `GET /api/arena/model-stats` from section 3.7 without a token.

---

## 5. Gaps and proposals for the backend phase

Feature numbers refer to [new-features.md](../redesign/new-features.md).

| # | Gap observed | Proposal | Ref |
| --- | --- | --- | --- |
| 1 | Battles are one blocking call; the UI fakes streaming | Add `POST /api/arena/dualchat/stream`: SSE events tagged `a` or `b` (`delta`, `done`, `error`), first event carries `comparisonId`. Reuse the `ai.stream.*` object names. | B-1 |
| 2 | Vote response is `{ success, message }`, so the reveal cannot show a rating change | Return `{ success, comparisonId, revealed: { model1, model2 }, eloBefore, eloAfter }` per model | B-2 |
| 3 | No idempotency; `HttpClient` retries POSTs and can create duplicate battles; the vote queue can resend | Accept `Idempotency-Key: <uuid>` on `dualchat`, `chat`, `model-vote` and `POST /api/threads`; replay returns the first response. Client side: stop auto-retrying these POSTs (already planned in the migration plan). | B-8 |
| 4 | Mixed casing: `model-stats` repeats every field in camelCase and snake_case plus aliases (`elo`, `elo_rating`, `matches`...); `users/sync` takes `avatar_url`; `feature-flag` and others differ | Pick camelCase for all new and existing JSON, drop the duplicate fields from `model-stats` after the client moves to the camelCase ones, accept both on `users/sync` for one release | n/a |
| 5 | Lists are `{ items }` today but the client also accepts bare arrays, and only `threads` takes `limit` (no cursor) | One envelope `{ items, nextCursor? }` for every list, and cursor paging on `threads` and `messages` (today only `limit`) | n/a |
| 6 | (Worker side done by BE-1: opt-in problem+json at the proxy. The API's own shapes are unchanged.) Three error shapes (`{object:'ai.error',code,message}`, `{success:false,error,code}`, empty 401/404) plus the Worker's 502 shape that leaks `error.toString()` | One error body: `{ error: { code, message, requestId, details? } }` on every non-2xx, including 401 and 404. Return `Retry-After` on 429 and 503. | n/a |
| 7 | (Worker alias done by BE-2.) TTS: client calls `/api/audio/tts` (404); real route `/api/speech/generate` is not in OpenAPI | New client uses the real route; publish it in OpenAPI with the `voice` parameter and the `audio/wav` response; keep one name | KNOWN_ISSUES #7 |
| 8 | `users/sync` is missing from OpenAPI; `users/me`, `models/{id}`, `version` are called by unused client methods | Document `users/sync` (request and response); either implement or delete the other three | N7 |
| 9 | Request id: only `x-correlation-id` is returned; the client sends none | Client sends `x-request-id`; API echoes it as `x-correlation-id` and includes it in error bodies | n/a |
| 10 | Worker CORS: `Access-Control-Allow-Methods` omits `PATCH` and `Allow-Headers` omits `Accept` and `X-Request-Id`; `Allow-Origin: *` on `/api/*` | Moot for same-origin calls; if the Worker ever serves cross-origin callers, add `PATCH` and the new headers. The hardening list in the migration plan covers the rest. | migration plan s5 |
| 11 | Per-user model-stats and personal stats | `GET /api/users/me/stats` (this also gives `/users/me` a reason to exist) | B-7 |
| 12 | `dualchat` ignores `temperature` the UI sends; `battleId` is ignored | Either accept and document them, or the UI stops sending them | n/a |
| 13 | Leaderboard history, head-to-head, confidence intervals | `model-stats/history`, `head-to-head` and interval fields | B-3, B-5, B-6 |

Contract tests for the backend phase should use recorded responses from a **local** API, never production `POST`s (see new-features, "Backend and API testing phase").

---

## 6. Client mapping

How the typed client in `web/src/lib/api/` (redesign slice S5) implements this contract. Every function is on the object `createApiClient()` returns and takes `CallOptions` (`signal`, `timeoutMs`, `retry`, `headers`) as its last argument. Paths are same-origin (`/api/...` through the Worker); responses go through the Zod schema in the table, which normalises the quirks in section 1 and fails with `bad_response` when a body does not fit. Details: [`web/src/lib/api/README.md`](../../web/src/lib/api/README.md).

Retry policies: **GET** = up to 2 retries on `network`, `timeout` (incl. 408 and the Worker's 504), `429` and `5xx` except 501, exponential backoff from 500 ms with jitter, at least `Retry-After`, no retry when `Retry-After` is over 20 s; done by the transport for direct calls and by the QueryClient for queries, never by both. **Never** = no automatic retry; a retry is a user action.

| Method and path | Function | Schema (output type) | Auth | Timeout | Retry |
| --- | --- | --- | --- | --- | --- |
| `GET /api/health` (Worker: `/health`) | `getHealth()` | `healthSchema` (`Health`, adds `healthy`) | none | 5 s | never (a health check reports) |
| `GET /api/models` | `listModels()` | `modelListSchema` (`ModelSummary[]`) | required | 15 s | GET |
| `GET /api/models/{id}` | `getModel(id)` | `modelSummarySchema` (`ModelSummary`) | required | 15 s | GET; 404 today (N7) |
| `POST /api/arena/dualchat` | `startBattle(input)` | `battleSchema` (`Battle`: `comparisonId`, `agent1`, `agent2`, `comparison`) | required | 60 s | never |
| `POST /api/arena/chat` | `sendChat(input)` | `answerSchema` (`Answer`: `text`, `model`, `usage`, `finishReason`...) | required | 60 s | never |
| `POST /api/arena/chat/stream` | `streamChat(input)`, async generator | `streamEventSchema` per event (`ChatStreamEvent`) | required | 60 s until headers, then 30 s idle | never |
| `POST /api/arena/model-vote` | `vote(input)`, or `createVoteQueue().submit()` | `voteResultSchema` (`VoteResult`) | required | 15 s | never; the vote queue resends transient failures on reconnect |
| `GET /api/arena/model-stats` | `getLeaderboard()` | `leaderboardSchema` (`ModelStat[]`, camelCase only) | none | 15 s | GET |
| `POST /api/speech/generate` | `textToSpeech(input)` | `audio/*` `Blob` | required | 30 s | never (costs quota) |
| `GET /api/threads?limit=` | `listThreads({ limit })` | `threadListSchema` (`Thread[]`) | required | 15 s | GET |
| `POST /api/threads` | `createThread(input)` | `threadSchema` (`Thread`) | required | 15 s | never |
| `GET /api/threads/{id}` | `getThread(id)` | `threadSchema` (`Thread`) | optional | 15 s | GET |
| `PATCH /api/threads/{id}` | `renameThread({ threadId, title })` | `mutationResultSchema` (`MutationResult`) | required | 15 s | never |
| `DELETE /api/threads/{id}` | `deleteThread(id)` | `mutationResultSchema` (`MutationResult`) | required | 15 s | never |
| `GET /api/threads/{id}/messages` | `listThreadMessages(id)` | `threadMessageListSchema` (`ThreadMessage[]`) | optional | 15 s | GET |
| `PATCH /api/threads/{id}/visibility` | `setThreadVisibility({ threadId, visibility })` | `visibilityResultSchema` (`VisibilityResult`) | required | 15 s | never |
| `GET /api/threads/{id}` + `/messages`, without a token | `getSharedThread(id)` | both of the above (`SharedThread`) | none | 15 s | GET |
| `POST /api/users/sync` | `syncUser(input)` | `userProfileSchema` (`UserProfile`) | required | 15 s | never |
| `GET /api/users/me` | `getMe()` | `userProfileSchema` (`UserProfile`) | required | 15 s | GET; 404 today (N7) |
| `GET /api/settings/feature-flag/{key}` | `getFeatureFlag(key)` | `featureFlagSchema` (`FeatureFlag`) | none | 15 s | GET |

Not mapped: `POST /api/audio/tts` (does not exist; replaced by `/api/speech/generate`), `GET /api/version` (404), the legacy `/api/auth/*` routes (unused), and the Supabase calls of section 3.12 (slice S6).

What changes against the legacy client:

- `POST` calls are never retried automatically (the legacy `HttpClient` retried every call, which could create duplicate battles), and the battle and chat timeout is 60 s instead of 30 s.
- No guest mode: without a user token a protected call fails locally with an `auth` error instead of sending the Supabase anon key.
- Every request carries an `x-request-id`; errors keep it and the API's `x-correlation-id`.
- Text to speech calls the real route; the owner's thread read (`getThread`) and `setThreadVisibility` exist, so a shared thread no longer shows as private after a reload.
- The leaderboard is read without a token and without a sign-in check.
- The stream parser handles CR/CRLF, partial lines and multi-byte characters across chunks, fails on an unreadable event or a stream that ends without `done`, and has an idle timeout.
- Redirects are reported (`UNEXPECTED_REDIRECT`) instead of being followed to the waitlist page.

TanStack Query: `createQueryClient()`, `apiKeys`, query builders (`healthQuery`, `modelsQuery`, `modelQuery`, `leaderboardQuery`, `threadsQuery`, `threadQuery`, `threadMessagesQuery`, `sharedThreadQuery`, `meQuery`, `featureFlagQuery`) and mutation builders (`startBattleMutation`, `sendChatMutation`, `voteMutation`, `textToSpeechMutation`, `createThreadMutation`, `renameThreadMutation`, `deleteThreadMutation`, `setThreadVisibilityMutation`, `syncUserMutation`).

The mock adapter (`VITE_API_MOCK=1`, Playwright, unit tests) implements every row above, in the wire format of this document, with error scenarios selected by the `x-mock-scenario` header.

---

## 7. Change log

| Date | Checked against | Change |
| --- | --- | --- |
| 2026-10-20 | `b921669` (DualMind_UI `master`) | Section 6, client mapping for the typed client (S5). 502/504 bodies of the hardened Worker proxy in the error table. |
| 2026-10-20 | `cee9356` (DualMind_UI `master`) | First version. Live `GET` probes: `/health`, `/api/health`, `/api/arena/model-stats`, `/api/settings/feature-flag/public_sharing`, unauthenticated `/api/models` (401) and `/api/users/me` (404). All other behaviour read from code and the published OpenAPI document. |
