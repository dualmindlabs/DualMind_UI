# BE-1: One error shape (opt-in problem+json for v1 errors)

Status: **proposed** (2026-10-21). Wave W1. Depends on the problem type registry from [BE-0](./BE-0-platform.md) (`server/problem-types.js`). Fixes gap 6 of [docs/api/endpoints.md](../../api/endpoints.md#5-gaps-and-proposals-for-the-backend-phase).

## 1. Summary

The v1 API answers errors in at least five shapes plus empty bodies. The proxy learns to rewrite any non-2xx v1 answer into RFC 9457 `application/problem+json`, but only for callers that ask for it with `Accept: application/problem+json`. The new web client asks; the legacy app does not and sees byte-identical responses to today.

## 2. Goals and non-goals

Goals: one error body for the new client on every `/api/*` route (including the Worker's own 502 and 504); no leak of internal exception text; the same problem types as `/api/v2`; zero change for callers that do not opt in.

Non-goals: changing success bodies; changing status codes (the status is always the upstream's, except where the Worker itself fails); rewriting errors that arrive inside an event stream after HTTP 200 (`ai.error` events, endpoints.md section 3.5); fixing the API's own error shapes (that is a change in the private ASP.NET repository; this feature makes it unnecessary for the UI).

## 3. User-visible behaviour

For a request with `Accept` containing `application/problem+json`:

- A non-2xx response from `/api/*` (except `101`, redirects and `text/event-stream` bodies) is replaced by a problem body, with the same status, `X-Request-Id`, and the headers listed in section 6.3.
- Success responses are untouched, streams are untouched.
- The user sees the problem's `detail` (the web client already shows `message || ...`; see section 5).

Callers without that `Accept` token see exactly what they see today, including the 401 with an empty body.

## 4. API

No new route. Negotiation rule: opt in if any media range in `Accept` has the type `application/problem+json` (case-insensitive, parameters and `q` ignored; `q=0` counts as not accepted). `*/*` and `application/json` alone do not opt in, so tools such as `curl` and the legacy app keep the old shapes. Responses that were rewritten add `Vary: Accept` (all responses on error statuses add it, rewritten or not, so a shared cache cannot mix them up).

### 4.1 Mapping table

`code` is the member the problem keeps from the upstream body so the client's existing code checks (`INVALID_REQUEST`) keep working; it is an extension member, not the `type`.

| # | Observed v1 shape (endpoints.md) | Status | Problem `type` slug | `detail` | Extension members |
| --- | --- | --- | --- | --- | --- |
| 1 | Arena: `{ object: "ai.error", code, message, timestamp }` | 400 | `validation_error` | `message` | `code` |
| 1b | same | 5xx (`API_ERROR`, `STREAM_ERROR`) | by status: 500 `internal_error`, 502 `bad_gateway`, 504 `gateway_timeout` | generic: "The model service failed." | `code` |
| 2 | Others: `{ success: false, error, code }` | 400, 422 | `validation_error` | `error` | `code` |
| 2b | same | 403 | `forbidden` | `error` | `code` |
| 2c | same | 404 | `not_found` | `error` | `code` |
| 2d | same | 409 | `conflict` | `error` | `code` |
| 2e | same | 5xx | `internal_error` | generic: "The service failed." | `code` |
| 3 | Empty body, `www-authenticate: Bearer` | 401 | `unauthorized` | "Sign in again." | none; `WWW-Authenticate` kept |
| 4 | Empty body | 404 | `not_found` | "No such resource." | none |
| 5 | Worker: `{ error: "bad_gateway", requestId }` | 502 | `bad_gateway` | "The API could not be reached." | none |
| 6 | Worker: `{ error: "gateway_timeout", requestId }` | 504 | `gateway_timeout` | "The API did not answer in time." | none |
| 7 | ASP.NET ProblemDetails `{ title, status, detail?, errors{}, traceId }` | 400 | `validation_error` | `detail` or `title` | `errors[]` converted from the field map to `[{ path, message }]` |
| 8 | Legacy 502 `{ success:false, message:"Backend API Error: ...", error }` | 502 | `bad_gateway` | generic (never the original text) | none |
| 9 | Anything else non-2xx: not JSON, or JSON that matches no row | any | by status: 400 `validation_error`, 401 `unauthorized`, 403 `forbidden`, 404 `not_found`, 408 `gateway_timeout`, 409 `conflict`, 413 `payload_too_large`, 429 `rate_limited`, other 4xx `validation_error`, 5xx `internal_error` | generic by type | none |

Row 1b: an `ai.error` 5xx means the model provider failed, not the Worker; it maps to the generic type for its status, so the registry needs no extra type.

Rules for `detail`:

- 4xx: the upstream `message` or `error` text is passed on if it is plain text of at most 300 characters; longer text is cut with an ellipsis. These messages are written for users ("Model not found") and the UI already shows them.
- 5xx: always a fixed generic sentence per type. Upstream text for 5xx can hold stack fragments or provider errors, so it goes to the log only.
- 401 and 404 with empty bodies get the fixed sentences in the table.

### 4.2 Example

Upstream (`POST /api/arena/dualchat`, 400):

```json
{ "object": "ai.error", "code": "INVALID_REQUEST", "message": "prompt is required", "timestamp": "2026-10-21T08:30:00Z" }
```

With `Accept: application/json, application/problem+json`:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json; charset=utf-8
X-Request-Id: 6b0b2f64-5d0e-4a45-93a1-1f0f7d1d9a7e
Vary: Accept
Cache-Control: no-store
```

```json
{
  "type": "https://arena.dualmindlab.tech/problems/validation_error",
  "title": "Invalid request",
  "status": 400,
  "detail": "prompt is required",
  "instance": "/api/arena/dualchat",
  "requestId": "6b0b2f64-5d0e-4a45-93a1-1f0f7d1d9a7e",
  "code": "INVALID_REQUEST"
}
```

## 5. How the typed client consumes it

`web/src/lib/api/errors.ts` `parseErrorBody` currently handles seven shapes; ProblemDetails (shape 5 there) is only recognised when the body has `errors` or `traceId`, so a plain problem+json would lose its message. Changes (small, in the same PR as the Worker change or the next web PR):

1. Add a first rule: if `typeof body.type === 'string'` starts with `https://arena.dualmindlab.tech/problems/`, return `message: detail ?? title`, `code: body.code ?? slug.toUpperCase()` (`validation_error` becomes `VALIDATION_ERROR`; the retained `code` wins, so `INVALID_REQUEST` still arrives), `details: { errors, requestId, retryAfter }` for those members that exist.
2. `kindFromStatus` is unchanged: the kind still comes from the HTTP status, so retry rules (`retryable`) do not move.
3. `transport` sends `Accept: application/json, application/problem+json;q=0.9` on JSON calls and `audio/*, application/problem+json;q=0.9` on blob calls (the `accept` option in `endpoints/speech.ts` already exists; the problem type is appended). `text/event-stream` calls append it too, because their pre-stream errors are normal responses.
4. `Retry-After` is still read from the header, as today; the problem's `retryAfter` is informational.
5. The old shapes stay parseable: mock mode, local development against the API, and any response from a cache that predates the change.

## 6. Design

### 6.1 Where

`server/problem-rewrite.js` (new, plain JS, no dependencies) exports `wantsProblemJson(request)` and `rewriteErrorResponse({ response, request, requestId })`. `proxyApi` calls it as the last step before returning, for non-2xx responses only. The Worker-generated 502 and 504 (`errorResponse()` in `api-proxy.js`) go through the same function, so the table above has one implementation.

### 6.2 Reading the upstream body safely

Read at most 64 KiB (`response.body` reader with a counter; stop and treat as "not JSON" beyond it). Parse as JSON only if the content type says JSON or the first non-space byte is `{`. Never throw: any failure falls to row 9. The upstream body is consumed, so the original response is not returned afterwards; the rewritten response is built from scratch.

### 6.3 Headers on a rewritten response

Kept from upstream: `WWW-Authenticate`, `Retry-After`, `x-correlation-id` (surfaced to the client as before), `Allow`. Dropped: `Content-Length`, `Content-Encoding`, `ETag`, `Last-Modified`. Set: `Content-Type: application/problem+json; charset=utf-8`, `Cache-Control: no-store`, `Vary: Accept`, `X-Request-Id`. The `Access-Control-*` stripping stays (it happens before).

## 7. Data model

None.

## 8. Auth

None; the rewrite runs after the upstream decided about auth. A 401 stays a 401.

## 9. Limits and abuse

The 64 KiB read cap bounds memory. The rewrite adds one body read and one `JSON.stringify` on error paths only, never on success.

## 10. Privacy

Upstream text is exposed to the client only for 4xx and only when short plain text; 5xx text is logged (as `upstreamDetail`, truncated to 300 characters, no request data) and never forwarded. This also closes the leak of `error.toString()` in the legacy 502 shape (row 8).

## 11. Failure modes

| Failure | Behaviour |
| --- | --- |
| Upstream body is not JSON, is huge, or is malformed | row 9, by status |
| Upstream error body already is problem+json | passed through unchanged except `requestId` is added when missing |
| The rewrite function throws | caught; the original response is returned untouched (logged `problem_rewrite_failed`) |
| Request has no opt-in | untouched path, no body read |

## 12. Observability

Log event `problem_rewrite` per rewrite: `{ requestId, route (the v1 path), status, row (1..9), type, upstreamCode }`. Metric names (log fields until BE-20): `v1_errors_total{route,status,type}`, `v1_error_rewrites_total{row}`. A rising share of row 9 means the API added a new shape; it is the signal to extend the table.

## 13. Implementation plan

```text
server/problem-types.js        (from BE-0; add titles used here)
server/problem-rewrite.js      wantsProblemJson, classifyUpstream (rows 1-9), rewriteErrorResponse
server/api-proxy.js (edit)     call it for non-2xx and for the Worker's own 502/504
web/src/lib/api/errors.ts (edit)           problem+json rule in parseErrorBody
web/src/lib/api/http/transport.ts (edit)   Accept header
docs/api/endpoints.md (edit)   error model section: opt-in shape, mapping table link
```

## 14. Test plan

- Unit (Node project, `web/tests/worker/problem-rewrite.test.ts`): `wantsProblemJson` for `application/problem+json`, with `q`, mixed case, `*/*`, `application/json`, `q=0`, missing header; every table row with a fixture taken from endpoints.md (rows 1 to 9, including ProblemDetails field-map conversion and a 400 KiB body); 5xx detail is generic; long 4xx message is cut; no `error.toString()` text ever appears in output (fixture row 8).
- Proxy tests (`api-proxy.test.ts`, extended): without opt-in the response is byte-identical to the fake upstream's (status, headers, body); with opt-in the status and `X-Request-Id` are kept, `Vary: Accept` is set, a stream (`text/event-stream` 200) and a 200 JSON are untouched, Worker 502 and 504 become problems.
- Client tests (`web/tests/unit/lib/api`): `parseErrorBody` on problem+json with and without `code`; `ApiError.kind` and `retryable` unchanged per status; the mock adapter gains a `problem` scenario.
- Miniflare integration (`tests/api/`): `SELF.fetch` of a v1 path against an MSW-mocked upstream returning each shape.
- Contract: problem bodies are validated against `problemSchema` from `contract/common.ts` (BE-0).
- End to end: existing Playwright run with the mock API still passes; one e2e case forces a 401 and checks the UI's sign-in prompt appears.

## 15. Rollout

Ship the Worker change first (inert: nobody opts in), then the client change that sends the `Accept` token. Rollback of either side alone is safe. No flag; the opt-in header is the switch. Legacy-app compatibility is guaranteed by the "untouched path" test above. `docs/api/endpoints.md` keeps documenting the raw v1 shapes, since they are what a caller without the header sees.

## 16. Open questions

1. Keep the retained `code` extension member (this design) or drop it once the client reads only the `type`? Default: keep; it costs nothing and eases the transition.
2. Should the Worker also rewrite for callers that send `Accept: application/json` only, after the legacy app is removed (slice S13)? Default: yes, as a later, separately announced change.
