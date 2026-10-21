# BE-2: Text-to-speech route alias

Status: **built** (2026-10-21, PR #49; PR awaiting merge). Wave W1. Fixes [KNOWN_ISSUES #7](../../../KNOWN_ISSUES.md) for any caller that still uses the old path.

## 1. Summary

The legacy app posts `{ "text": "..." }` to `/api/audio/tts`, which does not exist (404 from the API, endpoints.md section 3.8), so every user hears the browser voice. The real route is `POST /api/speech/generate` with `{ text, voice? }`, answering `audio/wav`. The proxy gets a tiny alias table: `/api/audio/tts` is forwarded to `/api/speech/generate`, with a light body check, a guaranteed audio content type and deprecation headers. The new typed client already calls the real route (`web/src/lib/api/endpoints/speech.ts`), so the alias exists only for the legacy app and old cached clients, and has a removal date.

## 2. Goals and non-goals

Goals: legacy "Read aloud" works without touching the legacy JavaScript; the alias is visibly deprecated; it is removed cleanly.

Non-goals: adding `/api/speech/generate` to the published OpenAPI of the DualMind API (a change in the private repository, listed in endpoints.md gap 7); a v2 speech route (not planned; the real route is already reachable through the v1 proxy); voice selection UI; caching audio.

## 3. User-visible behaviour

- Legacy app: "Read aloud" now plays the server voice instead of the browser voice. If the call fails, the existing `speechSynthesis` fallback still runs.
- New app: no change; it calls `/api/speech/generate` directly.
- `curl -X POST -H 'Content-Type: application/json' -d '{"text":"hello"}' .../api/audio/tts` returns `200 audio/wav` with `Deprecation` and `Link` headers.

## 4. API

### `POST /api/audio/tts` (deprecated alias)

Request: `Authorization: Bearer <token>`, `Content-Type: application/json`.

```json
{ "text": "Paris is the capital of France.", "voice": "alloy" }
```

- `text`: required, string, 1 to 5000 characters after trimming (the API's own limit is not documented; this cap protects provider quota and is the open question below).
- `voice`: optional, string, 1 to 64 characters of `[A-Za-z0-9._-]`; passed through unchanged.
- Unknown fields are dropped (the alias forwards exactly `{ text, voice? }`).

Forwarding: `POST {BACKEND_URL}/api/speech/generate` with the body re-serialised as JSON, `Content-Type: application/json`, the usual forwarded headers (BE-0/ADR 0006 allow-list) and `Accept: audio/wav, audio/*;q=0.9, application/json;q=0.5`.

Response `200`: the upstream audio body streamed unchanged.

```http
HTTP/1.1 200 OK
Content-Type: audio/wav
Cache-Control: no-store
Deprecation: @1792540800
Link: </api/speech/generate>; rel="successor-version"
X-Request-Id: 6b0b2f64-5d0e-4a45-93a1-1f0f7d1d9a7e
```

- `Content-Type`: kept if the upstream sends `audio/*`; set to `audio/wav` if it sends `application/octet-stream` or nothing and the body starts with the bytes `RIFF....WAVE` (checked on the first 12 bytes through a one-chunk peek, then the rest is streamed); any other type on a 2xx is treated as an upstream fault (502 below).
- `Cache-Control: no-store` always (audio costs provider quota and may contain user text).
- `Deprecation: @<unix seconds>` (RFC 9745) is the merge date of the alias PR; the exact value is a constant in `server/audio-alias.js`. `Sunset` is added in the last 30 days (section 14).

Errors (shapes follow v1 today; with `Accept: application/problem+json` BE-1 turns them into problems):

| Case | Status | Legacy body | Problem type (BE-1) |
| --- | --- | --- | --- |
| body is not JSON or not an object | 400 | `{ "error": "invalid_request", "requestId": "..." }` | `validation_error` |
| `text` missing, empty, too long, or not a string; bad `voice` | 400 | same | `validation_error` |
| `Content-Type` is not JSON | 415 | `{ "error": "unsupported_media_type", "requestId": "..." }` | `unsupported_media_type` |
| body over 16 KiB | 413 | `{ "error": "payload_too_large", "requestId": "..." }` | `payload_too_large` |
| upstream 401, 403, 429, 5xx | same status | upstream body untouched | by BE-1 table |
| upstream unreachable | 502 | `{ "error": "bad_gateway", ... }` | `bad_gateway` |
| upstream timeout (30 s) | 504 | `{ "error": "gateway_timeout", ... }` | `gateway_timeout` |
| upstream 2xx with a non-audio type | 502 | `{ "error": "bad_gateway", ... }` | `bad_gateway` |

`POST /api/speech/generate` itself needs no change; the generic proxy already forwards it. Other methods on `/api/audio/tts` answer `405` with `Allow: POST`.

## 5. Data model

None.

## 6. Auth

The token is forwarded; the API decides (401 stays 401). The alias does not verify the token itself, except that BE-3 verifies it to choose the rate-limit key.

## 7. Limits and abuse

- Body at most 16 KiB (read with a counting reader, not trusted `Content-Length`).
- Text at most 5000 characters.
- BE-3 puts both paths in the `speech` limit group (10 requests per 60 s per user), so the alias cannot be used to bypass the limit of the real route.
- No retry by the Worker; the typed client does not retry it either.

## 8. Privacy

The text is a model answer or a user prompt. It is not logged, not cached and not stored. Logs hold the request id, status, text length and voice name only.

## 9. Failure modes

| Failure | Behaviour |
| --- | --- |
| API has no speech provider configured | the upstream error is passed on; the legacy app falls back to `speechSynthesis`, as before |
| Upstream sends a truncated stream | passed on as is (nothing to repair); the browser reports a decode error and falls back |
| Alias code throws | caught in `proxyApi`; request is forwarded as a plain v1 call to `/api/audio/tts` (so the outcome is the old 404, not a crash) and `tts_alias_failed` is logged |

## 10. Observability

Log events: `tts_alias_used` (`{ requestId, textLength, hasVoice, status, durationMs }`) on every alias call; this is the data that decides removal (section 14). Metric names (log fields until BE-20): `tts_alias_requests_total{status}`, `tts_alias_duration_ms`.

## 11. Implementation plan

```text
server/audio-alias.js     AUDIO_ALIAS = { from: '/api/audio/tts', to: '/api/speech/generate' },
                          parseAliasBody(request) -> { ok, body } | { ok:false, status, error },
                          DEPRECATION constant, audioResponse(upstream) wrapper
server/api-proxy.js       (edit) before the normal path mapping: if pathname is the alias,
                          validate, rewrite target path and body, and wrap the response
web/tests/worker/audio-alias.test.ts   (new)
web/tests/worker/api-proxy.test.ts     (edit) a row proving the generic proxy is unchanged
docs/api/endpoints.md     (edit) section 3.8: alias, deprecation, removal date
KNOWN_ISSUES.md           (edit) #7 note: alias in the Worker, client fix still advised
```

`backendPathFor()` stays a pure path function; the alias is a separate step because it also changes the body and the response.

## 12. Test plan

- Unit (Node project): `parseAliasBody` for every error row (empty text, 5001 characters, array body, invalid JSON, bad voice, non-JSON content type, over 16 KiB with and without `Content-Length`); unknown fields dropped; `voice` passed through.
- Proxy tests with a fake upstream: the upstream receives `POST /api/speech/generate`, JSON body exactly `{"text":"...","voice":"..."}`, `Authorization` and `X-Request-Id` forwarded, nothing else; response keeps the WAV bytes (compare a 1 KiB fixture), sets `Content-Type: audio/wav` when the upstream says `application/octet-stream` with a RIFF header, sets `Deprecation`, `Link`, `Cache-Control: no-store`; non-RIFF octet-stream becomes 502; upstream 401 passes through; `GET` returns 405 with `Allow: POST`; 504 on a stalled upstream (fake timers).
- Rate-limit interplay (with BE-3): alias and real route share the `speech` counter.
- Miniflare integration (`tests/api/`): the same through `SELF.fetch` with an MSW upstream, including streaming a 5 MiB body without buffering it (assert the first chunk arrives before the upstream finishes).
- End to end: the legacy "Read aloud" Playwright case, if one exists, is extended to assert the request to `/api/audio/tts` returns 200 `audio/wav` against the mock server; otherwise a `wrangler dev` request with a fake `BACKEND_URL` (the mock API server in the repo, `mock-api-server.js`) checks the same.

## 13. Rollout

No flag: the alias only changes a path that returned 404. Deploy with the normal Workers Builds flow. After deploy, check `tts_alias_used` in Workers Logs (or the `Deprecation` header with `curl -i`).

## 14. Removal plan

1. The legacy app is removed at the cutover (slice S13). From the day it is gone, nothing first-party calls the alias.
2. 30 days after S13 lands, check the `tts_alias_used` count for the last 7 days. If it is zero, add `Sunset: <date 30 days ahead>` for those 30 days (in case of stragglers), then delete `server/audio-alias.js`, its tests and the proxy branch in one PR.
3. After removal the path returns the API's 404 again; `docs/api/endpoints.md` records the removal date.
4. If usage is not zero after step 2, extend by 30 days once; if it is still not zero, remove anyway (the only known caller is first-party).

## 15. Open questions

1. What is the API's own maximum length for `text`? The alias caps at 5000 characters; if the API accepts more, raise the cap rather than silently cutting answers.
2. Which voices does `/api/speech/generate` accept? The alias passes `voice` through without a list; confirm with the API owner (Harsh) whether to validate against names.
3. Does the API ever answer `audio/mpeg`? The alias accepts any `audio/*`; the RIFF check applies only to the octet-stream repair.
