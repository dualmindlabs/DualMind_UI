# BE-3: Rate limits with headers

Status: **proposed** (2026-10-21). Wave W1. Uses the Workers Rate Limiting binding ([research.md, part 3](../research.md)). Depends on the verifier from [BE-0](./BE-0-platform.md) and the problem registry; produces the `429` shape the typed client already understands.

## 1. Summary

A rate limiter runs in front of the v1 proxy and the v2 router. It counts requests per route group with the Workers Rate Limiting binding, keyed by the verified user id, or by an HMAC-hashed IP when there is no valid token. Over the limit, the request is answered with a `429` and `Retry-After` (problem+json for opted-in callers, a small legacy body otherwise) before any upstream is called, so abusers cost no model calls. Allowed requests carry a static `RateLimit-Policy` header so clients can see the rules.

## 2. Goals and non-goals

Goals: stop accidental floods and cheap abuse (loops, retries, scripts) on battle, chat, vote, speech and reads; give the UI a clear 429 with a wait time; never block real users because of a limiter fault; no raw IPs stored anywhere.

Non-goals: exact quotas, daily caps or billing (the binding is approximate, per Cloudflare location; exact counts need a Durable Object, later); vote-integrity analysis (BE-14); Turnstile (BE-23); a WAF rule at the zone (an optional extra layer Harsh can add, not required).

## 3. User-visible behaviour

- Normal use never hits a limit: limits are about 3 to 10 times what a person does (section 6.2).
- Over a limit the UI gets `429` and shows "Too many requests, try again in N seconds" from `Retry-After`.
- A burst of reads is retried automatically by the client after the wait (when the wait is at most 20 s); a battle, chat or vote is never retried automatically, so the user decides.

## 4. API

No new route. Headers on limited routes:

| Header | When | Value |
| --- | --- | --- |
| `RateLimit-Policy` | every response from a limited route | `"battle";q=6;w=60` (name, quota, window in seconds; RFC structured field, IETF draft `draft-ietf-httpapi-ratelimit-headers`) |
| `RateLimit` | only on 429 | `"battle";r=0;t=<seconds>` (remaining 0, seconds until the window resets) |
| `Retry-After` | only on 429 | integer seconds, same number as `t` |

Why not `RateLimit-Remaining` on success: the binding answers only `{ success: boolean }`, with no remaining count. Inventing one would lie. `RateLimit-Policy` is true and static; exact remaining counts come only if a Durable Object limiter replaces the binding for a group (open question 1). ADR 0007 listed `RateLimit-Limit/Remaining/Reset`; the draft's current form replaced those names, and this design keeps to what can be stated honestly.

429 for opted-in callers (`Accept: application/problem+json`, and always on `/api/v2`):

```json
{
  "type": "https://arena.dualmindlab.tech/problems/rate_limited",
  "title": "Too many requests",
  "status": 429,
  "detail": "Too many battles. Try again in 42 seconds.",
  "instance": "/api/arena/dualchat",
  "requestId": "6b0b2f64-5d0e-4a45-93a1-1f0f7d1d9a7e",
  "retryAfter": 42
}
```

429 for other callers: `{ "error": "rate_limited", "requestId": "...", "retryAfter": 42 }` (the same style as the Worker's 502 body). Both: `Cache-Control: no-store`, `X-Request-Id`, `Retry-After`, `RateLimit`, `RateLimit-Policy`.

Window position: the binding does not tell when its window ends, so `t` and `Retry-After` are the full window length (a safe upper bound): 10 or 60.

## 5. Groups and limits

The binding takes one `limit` and one `period` (10 or 60 seconds) per binding, so each group is its own binding and namespace.

| Group (`name` in headers) | Binding | `namespace_id` | Limit per period | Routes |
| --- | --- | --- | --- | --- |
| `battle` | `RL_BATTLE` | `"1001"` | 6 per 60 s | `POST /api/arena/dualchat`, `/api/arena/chat`, `/api/arena/chat/stream` (a stream counts once, at its start) |
| `vote` | `RL_VOTE` | `"1002"` | 10 per 10 s | `POST /api/arena/model-vote` |
| `speech` | `RL_SPEECH` | `"1003"` | 10 per 60 s | `POST /api/speech/generate`, `/api/audio/tts` |
| `write` | `RL_WRITE` | `"1004"` | 30 per 60 s | other `POST`, `PATCH`, `DELETE` under `/api/` (threads, `users/sync`) |
| `read` | `RL_READ` | `"1005"` | 30 per 10 s | every other `GET` or `HEAD` under `/api/` and `/api/v2/` (models, threads, model-stats, leaderboard, openapi.json), and the Worker-generated `/leaderboard.md`, `/llms.txt`, `/problems/*` (BE-5) |

`namespace_id` values are account-wide positive integers chosen here; counters with the same id are shared across Workers in the account, so these numbers must not be reused elsewhere (e.g. the waitlist Worker). Limits are starting points; changing one is a one-line `wrangler.jsonc` edit. Reasoning: a person starts a battle every 20 s at best (6 per minute allows a fast user), votes after each battle, and a page load makes under 10 reads.

`wrangler.jsonc`:

```jsonc
"ratelimits": [
  { "name": "RL_BATTLE", "namespace_id": "1001", "simple": { "limit": 6,  "period": 60 } },
  { "name": "RL_VOTE",   "namespace_id": "1002", "simple": { "limit": 10, "period": 10 } },
  { "name": "RL_SPEECH", "namespace_id": "1003", "simple": { "limit": 10, "period": 60 } },
  { "name": "RL_WRITE",  "namespace_id": "1004", "simple": { "limit": 30, "period": 60 } },
  { "name": "RL_READ",   "namespace_id": "1005", "simple": { "limit": 30, "period": 10 } }
]
```

The header policy strings are derived from the same constants in `server/rate-limit.js` as the config comment, and a test fails when `wrangler.jsonc` and the constants disagree.

## 6. Design

### 6.1 Key

```text
key = verified user  ->  "u:" + userId
      otherwise      ->  "ip:" + hex(HMAC-SHA-256(PRIVACY_SALT, "ip:" + CF-Connecting-IP)).slice(0, 32)
```

- A token counts only after the BE-0 `CompositeVerifier` accepts it. An unverified token is **never** decoded to pick a key: otherwise a caller could rotate fake `sub` values and get a fresh counter every request. A bad or missing token, or no verifier configured, falls back to the IP key (and the upstream rejects the request with 401 anyway).
- The verification here is the same call BE-0's middleware makes; the result is cached on the request context (`c.var.user`; for v1 the proxy gets it from a small per-request memo) so a request verifies once.
- `PRIVACY_SALT` is a Worker secret (shared with BE-0 logging, domain-separated by prefix). The raw IP exists only inside the HMAC call and is never stored or logged. If the secret is missing, the IP key uses a fixed development salt and `ratelimit_unsalted` is logged once per isolate; limiting keeps working but the hash is guessable, so Harsh must set the secret before launch.
- Missing `CF-Connecting-IP` (local `wrangler dev`): key `ip:unknown`.

### 6.2 Flow

```text
classify(request) -> group | null        // null: not limited (section 7)
key = await limiterKey(request, env)
{ success } = await env[group.binding].limit({ key })
success  -> continue; add RateLimit-Policy to the final response
failure  -> 429 now (no upstream call)
```

Order: the limiter runs after the request id is known and before BE-1 negotiation and the upstream call; the 429 is built by the same problem helper as every other error. A request denied by a group still consumed that group's counter only.

### 6.3 Fail open

If a binding is missing (not configured yet, local test), `limit()` throws or takes longer than 50 ms, the request is allowed and `ratelimit_unavailable` is logged with the group. The limiter protects the service; it must never be the reason a good user cannot battle.

## 7. What is NOT limited

- `GET /api/health` (monitors) and any `OPTIONS`.
- Static files and HTML pages (served by the asset layer before any Worker code; a WAF rule is the right tool for those).
- `GET /api/v2/health`.
- Redirects and the pre-launch gate redirect.
- Any other request outside `/api/`, `/api/v2/` and the BE-5 text routes.

`HEAD` counts as `read`.

## 8. Interaction with the client's retry policy

`web/src/lib/api/http/retry.ts`: retries only `GET`, at most 2 times, only for retryable kinds (`rate_limited` is one), honours `Retry-After`, and never waits more than `maxRetryAfterMs` = 20 000. Consequences, all intended:

- `read` uses a 10 s window, so `Retry-After` is at most 10 and the client retries reads after the wait without bothering the user.
- `battle`, `speech` (60 s) and `write` exceed 20 s, and are `POST`s anyway: the error goes to the UI at once, with `retryAfterMs` set, so the UI can show a countdown.
- `vote` (10 s window) is a `POST` and not retried by the transport; the vote queue (`vote-queue.ts`) must keep the vote and re-send after `retryAfterMs`. The queue change is a client task in the BE-3 build PR (read `ApiError.retryAfterMs` on `rate_limited`).
- The problem body is parsed by the BE-1 client rule (`kind: 'rate_limited'`, `code: 'RATE_LIMITED'`).

## 9. Data model

None. Counters live in the platform.

## 10. Privacy

Key material is a salted HMAC; no IP, user agent or token is stored, logged or sent upstream. Logs hold the group, a short hash prefix of the key (8 hex chars) and the outcome.

## 11. Failure modes

| Failure | Behaviour |
| --- | --- |
| Binding missing or erroring | fail open, logged |
| Verifier unavailable (JWKS down) | IP key (a signed-in user briefly shares a counter with their NAT neighbours; acceptable) |
| User moves between Cloudflare locations | counter is per location, so the effective limit can be a multiple; acceptable for abuse control, documented as not a quota |
| Shared IP (office, school) | limits are per user when signed in; anonymous users on one IP share `read` and `write` counters, but anonymous users cannot battle or vote (401 upstream) |
| Clock or window drift | `Retry-After` is the full window, a slight over-wait |

## 12. Observability

Log events: `rate_limited` (`{ requestId, group, keyKind: "user" | "ip", keyHash8, route }`), `ratelimit_unavailable`, `ratelimit_unsalted`. Metric names (log fields until BE-20): `ratelimit_checks_total{group,outcome}` (`allowed`, `limited`, `skipped`), `ratelimit_unavailable_total{group}`. A group with more than 1% `limited` is the signal to retune.

## 13. Implementation plan

```text
server/rate-limit.js        GROUPS table (name, binding, limit, period, matcher), classify(request),
                            limiterKey(request, env, verify), checkRateLimit(...) -> { limited?, headers }
server/problem-rewrite.js   (BE-1) 429 uses the shared builder
server/api-proxy.js (edit)  call checkRateLimit before the upstream call; add RateLimit-Policy
server/v2/middleware/rate-limit.ts   Hono middleware calling the same function, per route group
wrangler.jsonc (edit)       ratelimits (above)
web/src/lib/api/vote-queue.ts (edit) honour retryAfterMs
docs/architecture.md (edit) bindings, the PRIVACY_SALT secret name, the groups table
```

## 14. Test plan

- Unit (Node project): `classify` for every route in the table plus negatives (`/api/health`, `OPTIONS`, `/api/v2/health`); `limiterKey` (verified user, bad token, no token, no `CF-Connecting-IP`, determinism, different salt gives a different hash, no raw IP in the output); header builders and the `t`/`Retry-After` values; a test that `wrangler.jsonc` limits equal the constants.
- Proxy tests with a fake binding (`{ limit: async ({key}) => ({ success }) }`): limited request never calls the upstream; allowed request has `RateLimit-Policy`; 429 body in both shapes; fail open on throw, on timeout (fake timers) and on a missing binding; keys are recorded and show that a forged unverified `sub` does not change the key.
- Miniflare integration (`tests/api/`): the real binding from `wrangler.jsonc`: the 7th battle in a minute gets 429 and the 6th does not; counters are separate per user; read group recovers after the window (use the 10 s group, with a real wait of about 11 s, or fake time if the runtime supports it); preview and production share namespaces, so tests use a random key per test.
- Client tests: a `429` problem parses to `rate_limited` with `retryAfterMs`; `GET` retry waits the header value when at most 20 s and surfaces the error beyond it; `POST` is not retried; the vote queue keeps the vote and retries after the wait.
- End to end through `wrangler dev`: a small loop of 8 requests to `/api/v2/health` is not limited (it is exempt), 8 `GET /api/v2/leaderboard` calls stay under 30 per 10 s; a script posting 7 battles to a fake backend sees the 429 on the 7th (CI only).

## 15. Rollout

1. Merge the code with the five `ratelimits` entries. The binding needs no account resource (only a `namespace_id` in the config), so this is a code-only deploy.
2. Harsh sets `PRIVACY_SALT` with `wrangler secret put PRIVACY_SALT` (any random 32-byte string). Until then keys use the development salt.
3. Watch `rate_limited` and `ratelimit_unavailable` for a few days; adjust numbers in `wrangler.jsonc`.
4. Kill switch: remove a binding from `wrangler.jsonc` (it then fails open) or raise its limit.

## 16. Open questions

1. Is approximate counting enough, or should battle get a Durable Object limiter later for exact `RateLimit` remaining counts and a daily quota? Default: approximate now, DO in a later wave if abuse appears.
2. Starting numbers (battle 6 per minute, vote 10 per 10 s) are guesses from normal use; Harsh may prefer stricter for anonymous visitors once guest battles exist (BE-23).
3. Add a WAF rate-limiting rule at the zone as the first layer for `/api/arena/*`? Needs a Cloudflare dashboard change by Harsh; not required for this design.
