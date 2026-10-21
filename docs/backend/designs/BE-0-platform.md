# BE-0: Platform (`/api/v2` router, request context, errors, OpenAPI, tests)

Status: **proposed** (2026-10-21). Wave W1. Part of the [backend roadmap](../feature-roadmap.md); architecture in [ADR 0007](../../adr/0007-backend-on-cloudflare.md). Every other backend feature builds on this one, so this is the longest design of the wave.

## 1. Summary

Add a small Hono application, mounted at `/api/v2/*` inside the existing `dualmind-arena` Worker, in front of the v1 proxy. It gives every later feature the same ground: a request context (request id, verified Supabase user), one error format (RFC 9457 `application/problem+json`), routes declared with zod schemas that produce a committed OpenAPI 3.1 document, a `not_enabled` guard for routes whose binding does not exist yet, and a test harness (Workers Vitest integration on Miniflare). `/api/*` (v1) is untouched.

## 2. Goals and non-goals

Goals:

- One router, one error shape, one auth path for everything under `/api/v2`.
- The contract (zod) is the source of the validation, the TypeScript types and the OpenAPI document. CI fails when the committed document is stale.
- Code can merge before its Cloudflare resource exists: a missing binding answers `501 not_enabled`.
- Tests run in GitHub Actions only; the existing Node-based Worker tests keep running unchanged.

Non-goals: D1, KV, queues (W2), `Idempotency-Key` handling (BE-6; this design only reserves the middleware slot), CORS for third-party sites (see open questions), any change to v1 behaviour (BE-1 to BE-3 change the proxy, not this router).

## 3. User-visible behaviour

- `GET /api/v2/health` and `GET /api/v2/me` exist so the platform is testable end to end (section 5). Everything else arrives with the features that need it.
- Any unknown path under `/api/v2/` answers a `404` problem; it never falls through to the v1 proxy.
- Every response carries `X-Request-Id`; every error body carries the same id as `requestId`.
- While `FORCE_WAITLIST` is on in `worker.js`, `/api/v2/*` is behind the same pre-launch gate as every other path (preview cookie). Nothing in this design changes the gate.

## 4. Conventions

| Topic | Rule |
| --- | --- |
| Media type | JSON in and out, UTF-8. Requests with a body need `Content-Type: application/json`, else `415 unsupported_media_type`. |
| Naming | camelCase fields only, ISO 8601 UTC times (`2026-10-21T08:30:00.000Z`), ids as strings. |
| Lists | Wrapped as `{ "items": [...] }`, plus `nextCursor` (string or null) when paginated (`?cursor=&limit=`, limit 1 to 100, default 25). Small fixed lists may omit pagination and say so in their design. |
| Errors | Always problem+json (section 6.3), also for 401, 404 and 405. |
| Body limit | 1 MiB for JSON bodies; larger answers `413 payload_too_large`. |
| Caching | Authenticated responses: `Cache-Control: private, no-store`. Public reads set their own policy (BE-4). |
| Methods | `HEAD` is answered for every `GET`; `OPTIONS` is not handled (same-origin only, as v1): `405` problem with `Allow`. |

### 4.1 Versioning and deprecation policy

- The major version is in the path. `/api/v2` changes only additively: new routes, new optional request fields, new response fields, new problem types. Clients must ignore unknown response fields.
- Breaking changes (removing or renaming a field, changing a type or a status code, tightening validation) need `/api/v3`.
- Deprecating a v2 route: announce in `docs/api/CHANGELOG.md`, send `Deprecation: @<unix seconds>` (RFC 9745) and `Sunset: <HTTP date>` (RFC 8594) with `Link: <url>; rel="deprecation"` on every response of the route, keep it working for at least 90 days after the announcement. The Worker's `GET /api/v2/openapi.json` marks the operation `deprecated: true`.
- Legacy v1 aliases the Worker adds (BE-2) get 30 days, because their only caller is the legacy app that is being removed.

## 5. API

### `GET /api/v2/health`

Public, never cached. Does not call the DualMind API (that is `/api/health`); it says only that the v2 router is alive.

```json
{ "status": "ok", "apiVersion": "2.0.0", "time": "2026-10-21T08:30:00.000Z" }
```

Headers: `Cache-Control: no-store`, `X-Request-Id`. `apiVersion` is the `info.version` of the OpenAPI document (semver; minor bump per additive release).

### `GET /api/v2/me`

Needs `Authorization: Bearer <Supabase access token>`. Returns what the verified token says, nothing from a database. Used by the web app to debug sign-in and by contract tests of the auth path.

```json
{ "userId": "3f6c7f0e-5d2b-4f0a-9f3e-0b9a6a1d2c11", "role": "authenticated", "expiresAt": "2026-10-21T09:12:44.000Z" }
```

Errors: `401 unauthorized` (missing, malformed, expired, wrong issuer or audience, bad signature), `501 not_enabled` (neither verifier configured).

## 6. Design

### 6.1 Request flow

```text
worker.js  arena.fetch()
  /api/v2 or /api/v2/*  ->  await import('./server/v2/app.ts').handle(request, env, ctx)
  /api/*                ->  proxyApi()          (v1, unchanged; BE-1/2/3 extend it)
  everything else       ->  as today
withSecurityHeaders()   ->  kind 'api' for every /api/ path, so v2 gets the same headers as v1
```

Hono middleware order inside the app (`server/v2/app.ts`):

1. `requestContext`: resolves the request id and starts the timer.
2. `onError` and `notFound` handlers: produce problem+json.
3. (reserved) `idempotency`: no-op until BE-6.
4. Per route: `rateLimit(group)` (BE-3), `auth('required' | 'optional')`, `guard({ binding })`, then the handler.

`worker.js` loads the app with a dynamic `import()` so the existing Node tests, which import `worker.js` and never touch `/api/v2`, do not need Hono installed. Wrangler bundles the dynamic import normally. `fetch(request, env)` in `worker.js` gains the third `ctx` argument (needed for `ctx.waitUntil` in BE-4) and passes it down.

### 6.2 Request context

```ts
// server/v2/context.ts
export type AppEnv = {
  Bindings: Env;                       // wrangler bindings, vars and secrets
  Variables: { requestId: string; user: VerifiedUser | null; startedAt: number; route: string };
};
```

- `requestId`: the caller's `X-Request-Id` if it passes `sanitizeRequestId()` (8 to 128 characters of `[A-Za-z0-9._:-]`), else `crypto.randomUUID()`. The function moves from `server/api-proxy.js` to `server/request-id.js` and is re-exported by the proxy, so v1 and v2 share one rule. The id is set on the response in a `finally`-style wrapper so every path, including thrown errors, has it.
- `route`: the OpenAPI path template (`/api/v2/leaderboard`), used by logs and metrics; unmatched requests use `unmatched`.

### 6.3 Errors: RFC 9457 problem details

```json
{
  "type": "https://arena.dualmindlab.tech/problems/validation_error",
  "title": "Invalid request",
  "status": 400,
  "detail": "limit must be between 1 and 100",
  "instance": "/api/v2/leaderboard",
  "requestId": "6b0b2f64-5d0e-4a45-93a1-1f0f7d1d9a7e",
  "errors": [{ "path": "limit", "message": "Too big: expected number to be <=100" }]
}
```

Content type `application/problem+json; charset=utf-8`, `Cache-Control: no-store`. Fields: `type`, `title`, `status`, `detail` (user-safe, never an exception message or a stack), `instance` (the request path), `requestId`; extension members only where the registry says so (`errors`, `retryAfter`, `feature`).

Helper (`server/v2/problems.ts`): `problem(type, { detail, errors, headers })` returns a `Response`; `ProblemError extends Error` is thrown from handlers and middleware and turned into a response by `app.onError`. Any other thrown error is logged with its stack and answered as `500 internal_error` with a generic detail.

Type registry, one entry per type, kept in one file with `{ slug, status, title }` and published as a table in `docs/api/problems.md` (generated by the same script as OpenAPI). The URL `https://arena.dualmindlab.tech/problems/<slug>` is an identifier; it is served as a short HTML or Markdown page by BE-5 (`/problems/<slug>`), and clients must not depend on it resolving.

| Slug | Status | Used for |
| --- | --- | --- |
| `validation_error` | 400 | body, query or header failed its zod schema (`errors[]` lists issues) |
| `unauthorized` | 401 | no token, bad token; sends `WWW-Authenticate: Bearer error="invalid_token"` (or plain `Bearer` when no token was sent) |
| `forbidden` | 403 | verified user may not do this |
| `not_found` | 404 | unknown path or resource |
| `method_not_allowed` | 405 | sets `Allow` |
| `not_acceptable` | 406 | `Accept` cannot be satisfied |
| `conflict` | 409 | state conflict (BE-6 uses it for a reused idempotency key with another body) |
| `payload_too_large` | 413 | body over the limit |
| `unsupported_media_type` | 415 | not JSON |
| `rate_limited` | 429 | BE-3; carries `retryAfter` (seconds) and `Retry-After` |
| `internal_error` | 500 | unexpected exception |
| `not_enabled` | 501 | the route's binding or secret is missing; carries `feature` |
| `bad_gateway` | 502 | upstream (the DualMind API) unreachable or answered nonsense |
| `gateway_timeout` | 504 | upstream did not answer in time |

BE-1 reuses this registry for v1 errors. It lives in one plain-JS file, `server/problem-types.js` (data and JSDoc types only, no TypeScript syntax), imported by both the JS proxy and the TypeScript v2 code.

### 6.4 Auth: Supabase JWT behind a verifier interface

```ts
// server/v2/auth/verifier.ts
export type VerifiedUser = { id: string; role: string; expiresAt: number; };
export interface TokenVerifier {
  /** Throws AuthError('invalid_token' | 'expired' | 'unsupported') ; never returns an unverified user. */
  verify(token: string): Promise<VerifiedUser>;
}
```

Implementations, chosen per token by the `alg` in the JWT header (`decodeProtectedHeader` from `jose`):

- `JwksVerifier` (`ES256`, `RS256`, `EdDSA`): `createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`), { cacheMaxAge: 600_000, cooldownDuration: 30_000, timeoutDuration: 3_000 })` created once at module scope (reused across requests in an isolate). `jwtVerify(token, jwks, { issuer: `${SUPABASE_URL}/auth/v1`, audience: 'authenticated', algorithms: [...], clockTolerance: 5 })`. Supabase caches its JWKS for 10 minutes, so the Worker must not cache longer.
- `SharedSecretVerifier` (`HS256` only): `jwtVerify(token, new TextEncoder().encode(SUPABASE_JWT_SECRET), { issuer, audience, algorithms: ['HS256'], clockTolerance: 5 })`. Used while the Supabase project still signs with the legacy secret.
- `CompositeVerifier` dispatches on `alg`; `none` and anything else is rejected. The algorithm allow-list per verifier prevents algorithm-confusion attacks (an HS256 token "signed" with the public key).

Config: `SUPABASE_URL` is a plain `vars` entry in `wrangler.jsonc` (public); `SUPABASE_JWT_SECRET` is a Worker secret set with `wrangler secret put` (name only in `docs/architecture.md`). If neither a URL nor a secret is configured, `auth('required')` answers `501 not_enabled` (`feature: "auth"`), and `auth('optional')` treats the caller as anonymous. The `sub` claim must be a UUID string; `role` comes from the token's `role` claim. Tokens are never logged; a user is logged as a salted hash (section 6.8).

Banned or deleted users stay valid until `exp` (about one hour). Features that need immediate revocation (W2+) add a deny-list check; not in this design.

### 6.5 Contract: zod to OpenAPI 3.1

Choice: **`@hono/zod-openapi`** (with zod 4, the version the web app already uses). Reasons: routes are declared once with `createRoute({ method, path, request, responses })`, and the same declaration validates input, types the handler and feeds the document; `app.doc31()` emits OpenAPI 3.1 (JSON Schema 2020-12, nullable as `type: [..., 'null']`). The alternative, `@asteasolutions/zod-to-openapi`, generates a document from schemas but leaves validation and routing to hand-written glue, which is exactly where code and document drift. Cost: one more dependency tied to Hono's release cadence; it is mitigated by pinning exact versions and by the CI check below.

Layout:

```text
contract/                      pure zod schemas, only `import { z } from 'zod'`; no Worker code
  common.ts                    problemSchema, cursor/limit query, healthSchema
  leaderboard.ts               (BE-4)
server/v2/routes/*.ts          createRoute() declarations + handlers
docs/api/openapi.v2.json       generated, committed
scripts/generate-openapi.ts    imports the app, writes the document (run with `node scripts/generate-openapi.ts`; Node 22.18+ strips types)
```

`contract/` is shared with the web app (alias `@contract` in `web/tsconfig.json` and `web/vite.config.ts`, with `resolve.dedupe: ['zod']` so there is one zod instance). The web's typed client parses v2 responses with the very schemas the Worker serves.

Every route declares its 4xx and 5xx responses with `problemSchema` under `application/problem+json`, so the document describes errors as well. `info.version` follows semver, `servers: [{ url: 'https://arena.dualmindlab.tech' }]`.

CI check (`pnpm run api:openapi:check`): runs the generator to a temp file and fails if it differs from `docs/api/openapi.v2.json` (`git diff --exit-code` after regenerating in place). The failure message says `run pnpm run api:openapi and commit`.

### 6.6 `not_enabled` guard

```ts
guard({ feature: 'ledger', bindings: ['DB'] })   // middleware factory
```

Checks `c.env[name]` for each binding (and secrets by name) and throws `ProblemError('not_enabled', { feature })`. Body: `{ "type": ".../not_enabled", "title": "Feature not enabled", "status": 501, "detail": "The ledger is not enabled on this deployment.", "feature": "ledger", "requestId": "..." }`. The typed client already treats 501 as non-retryable. The OpenAPI operation lists `501` so clients know. Rate limiting is deliberately not guarded this way: a missing limiter binding fails open (BE-3).

### 6.7 Headers and CSP

Unchanged. `withSecurityHeaders()` already applies the `api` header set (`Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`) to every `/api/` response, so v2 inherits it; no CSP on JSON. No CORS headers are added. The v2 router strips nothing, because it never forwards a backend response except where a feature says so (BE-4 builds its own response).

## 7. Data model

None. Bindings used in W1: none beyond `ASSETS`, `BACKEND_URL`, and the optional `RL_*` bindings of BE-3.

## 8. Limits and abuse

Body limit 1 MiB (checked by `Content-Length` and by a counting stream, because `Content-Length` can be absent). Rate limits come from BE-3 and are attached per route group. The JWKS fetch has a 3 s timeout and a 30 s cooldown so a broken Supabase endpoint cannot make every request fetch it.

## 9. Privacy

No request or response body is logged. Logs hold the request id, method, route template, status, duration and a salted hash of the user id (`hashId(env, 'user', id)` = first 16 hex chars of HMAC-SHA-256 with the `PRIVACY_SALT` secret). Raw IPs and tokens are never logged. `PRIVACY_SALT` is shared with BE-3 (domain-separated by the `user:` and `ip:` prefixes).

## 10. Failure modes

| Failure | Behaviour |
| --- | --- |
| JWKS endpoint down, key already cached | verification continues with the cached key set |
| JWKS endpoint down, nothing cached | `401 unauthorized` with `detail: "token could not be verified"`, logged as `auth_jwks_unavailable` (an outage must not look like a bad token in the metrics) |
| Unknown `kid` | one refresh (jose does it within its cooldown), then 401 |
| Clock skew | 5 s tolerance |
| Handler throws | `500 internal_error`, stack in logs only |
| Dynamic import of the app fails | `worker.js` catches it and answers `503` problem JSON built by hand; v1 and static files are unaffected |
| `ctx` missing (old tests) | handlers that need `waitUntil` call it only when present |

## 11. Observability

One JSON log line per request (`console.log(JSON.stringify(...))`, picked up by Workers Logs once enabled in `wrangler.jsonc`):

```json
{ "event": "api_request", "requestId": "...", "method": "GET", "route": "/api/v2/me", "status": 200, "durationMs": 4, "user": "9a41c0de77b2e1f0", "cache": null }
```

Further events: `api_error` (problem type, status, no detail), `auth_failed` (reason: `missing|malformed|expired|bad_signature|jwks_unavailable`), `not_enabled` (feature). Metric names reserved for BE-20 (Analytics Engine uses the same names; until then they are log fields): `api_v2_requests_total{route,status}`, `api_v2_request_duration_ms{route}`, `api_v2_errors_total{route,type}`, `auth_failures_total{reason}`.

## 12. Implementation plan

Files (new unless noted):

```text
server/request-id.js                moved from api-proxy.js (sanitizeRequestId, resolveRequestId)
server/problem-types.js             registry data (plain JS), imported by v1 proxy and v2
server/v2/app.ts                    OpenAPIHono app, middleware order, handle(request, env, ctx)
server/v2/context.ts                AppEnv, request context middleware
server/v2/problems.ts               problem(), ProblemError, onError, notFound, validation hook
server/v2/auth/{verifier,jwks,shared-secret,composite,middleware}.ts
server/v2/guard.ts                  not_enabled guard
server/v2/log.ts                    log(), hashId()
server/v2/routes/{health,me}.ts
contract/common.ts
docs/api/openapi.v2.json, docs/api/problems.md, docs/api/CHANGELOG.md
scripts/generate-openapi.ts
vitest.api.config.ts                Workers project (below)
tests/api/                          Miniflare tests
tsconfig.json (root)                strict, allowJs, noEmit; includes server/, contract/, scripts/, tests/api/
.github/workflows/api.yml           typecheck, tests, openapi check
worker.js (edit)                    route /api/v2, pass ctx
package.json (edit)                 dependencies: hono, @hono/zod-openapi, zod, jose; scripts api:*
wrangler.jsonc (edit)               vars.SUPABASE_URL
```

Dependencies go in the root `package.json` (pnpm; Workers Builds installs root dependencies before `node build.js`), pinned to exact versions like `web/package.json`. `typescript`, `vitest` (same major as `web/`), `@cloudflare/vitest-plugin` and `@msw/cloudflare` are dev dependencies. Scripts: `api:typecheck` (`tsc -p .`), `api:test` (`vitest run -c vitest.api.config.ts`), `api:openapi` (generate), `api:openapi:check`.

## 13. Test plan

Harness: `vitest.api.config.ts` uses `cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })` from `@cloudflare/vitest-plugin`, includes only `tests/api/**/*.test.ts`. It is a separate Vitest config from `web/vitest.config.ts`, which keeps its Node `worker` project (`web/tests/worker/*`) that tests the JS modules (proxy, caching, redirects, headers) with fakes; those tests are fast, need no Workers runtime and stay as they are. New proxy behaviour from BE-1 to BE-3 is tested in both places: pure logic in the Node project, binding behaviour in the Workers project. `api.yml` runs the Workers project; `web.yml` keeps running the Node project (its path filter already includes `server/**` and `worker.js`; add `contract/**`).

- Unit: `sanitizeRequestId`, `problem()` shape for every registry entry, `hashId`, `guard`, each verifier with generated keys.
- Auth integration: generate an ES256 key pair with `jose`, serve a local JWKS through `@msw/cloudflare`, and cover valid, expired, wrong issuer, wrong audience, wrong `alg` (HS256 signed with the public key must fail), unknown `kid` then rotation, JWKS down with and without cache, HS256 secret path, nothing configured (501).
- Miniflare integration: call `SELF.fetch('https://arena.dualmindlab.tech/api/v2/me')` through the real `worker.js`: request-id reuse and generation, unknown path 404 problem (and that the v1 fake upstream is never called), 405 with `Allow`, 415, 413, `HEAD`, security headers present, `FORCE_WAITLIST` gate still redirects without the preview cookie.
- Contract: a helper `expectMatchesOpenApi(response, method, path)` validates status, content type and body against the committed `docs/api/openapi.v2.json` (Ajv 2020-12 over the operation's response schema). Every route test uses it; one meta test fails if a registered route is missing from the document.
- OpenAPI freshness: the CI step above.
- End to end: in the existing `e2e` job (`wrangler dev` serving the composed `dist/`), a Playwright API test calls `GET /api/v2/health` with the preview cookie and checks status, `X-Request-Id` and the security headers.

## 14. Rollout

1. PR 1 (this design is its spec): router, context, errors, auth, guard, OpenAPI, harness, `health` and `me`. Safe to deploy: no existing path changes.
2. Harsh sets `SUPABASE_URL` (a var, committed) and, only if the project still uses the legacy signing secret, `wrangler secret put SUPABASE_JWT_SECRET` and `wrangler secret put PRIVACY_SALT`. Without them `me` answers 501 and everything else works.
3. Flags: none. A route is switched off by removing it. The `not_enabled` guard is the only runtime switch.

## 15. Open questions

1. Does Arena's Supabase project use asymmetric signing keys? (Dashboard: Project Settings, JWT Keys.) If not, `SUPABASE_JWT_SECRET` is needed until it migrates.
2. CORS: keep v2 same-origin only (this design), or allow `GET` on public routes from any origin so third parties can use the leaderboard API from a browser?
3. `contract/` shared with the web app through an alias (this design) versus a published workspace package. The alias is simpler; revisit if the duplicate-zod risk shows up.
4. Should `GET /api/v2/me` stay after the app uses real user endpoints (BE-15)? Default: keep, it is the cheapest auth probe.
