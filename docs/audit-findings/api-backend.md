# API Clients & Backend Integration Audit

**Audit Date:** 2026-08-14  
**Domain:** API Clients & Backend Integration  
**Auditor:** Senior Frontend/JS SaaS Auditor

---

## Scope

Files reviewed in this audit (source files, not `node_modules` or generated build copies unless noted):

- `js/api-client.js`
- `js/apiInstance.js`
- `js/api/apiClient.js`
- `js/api/index.js`
- `js/api/DualMindApi.js`
- `js/api/config/ApiConfig.js`
- `js/api/core/HttpClient.js`
- `js/api/services/ArenaService.js`
- `js/api/services/ThreadService.js`
- `js/api/services/ModelService.js`
- `js/api/services/UserService.js`
- `js/api/utils/authProvider.js`
- `js/api/utils/errors.js`
- `js/api/utils/errorHandler.js`
- `js/api/utils/errorMessages.js`
- `js/api/utils/extractors.js`
- `js/api/examples.js`
- `js/mockArena.js`
- `js/ui/app.js`
- `js/ui/leaderboardModal.js`
- `js/leaderboardPage.js`
- `js/auth.js`
- `js/auth/api-service.js`
- `js/feature-flags.js`
- `js/resend-auth-email.js`
- `mock-api-server.js`
- `worker.js`
- `config.js`
- `config.example.js`
- `wrangler.jsonc`
- `components/SharedThreadView.js`
- `components/ShareModal.js`
- `share/index.html`
- `admin-email-system/backend/supabase-edge-function/send-admin-email.ts`
- `admin-email-system/frontend/admin-email-panel.js`
- `admin-email-system/frontend/AdminEmailPanel.html`
- `admin-email-system/DEPLOYMENT_GUIDE.md`
- `admin-email-system/docs/README.md`
- `admin-email-system/docs/ENV_SETUP.md`

---

## Overview

The DualMind UI uses a **vanilla ES-module frontend** talking to a .NET/Azure backend (`https://api.dualmindlab.tech`) through a **Cloudflare Worker proxy** (`worker.js`). The preferred abstraction is:

```
index.html
  └── js/ui/app.js
        └── js/apiInstance.js
              └── js/api/DualMindApi.js
                    ├── js/api/core/HttpClient.js
                    ├── js/api/services/ArenaService.js
                    ├── js/api/services/ThreadService.js
                    ├── js/api/services/ModelService.js
                    └── js/api/services/UserService.js
```

`js/api/core/HttpClient.js` is the strongest piece of the domain: it centralizes auth-token injection via `js/api/utils/authProvider.js`, request timeouts, exponential-backoff retries, abort-signal propagation, and SSE streaming normalization.

However, this layer is **partially abandoned**. Several parallel API clients exist (`js/api-client.js`, `js/api/apiClient.js`, `js/auth/api-service.js`) and multiple production components still call `fetch()` directly instead of using the canonical `api` instance. The result is duplicated auth logic, inconsistent error handling, and a high risk of shipping stale code paths.

Auth is **100% client-side Supabase**. The API client reads the Supabase token from `window._DUALMIND_AUTH`, `window.DualMindAuth`, a global hook, or `localStorage`, then sends it as a `Bearer` token to the backend. The backend is never involved in the auth handshake.

---

## Strengths

1. **Centralized retry & timeout logic** in `js/api/core/HttpClient.js` (lines 106-110, 142-234). Exponential backoff with jitter is implemented once.
2. **Typed error taxonomy** in `js/api/utils/errors.js` provides `ApiError`, `AuthError`, `NetworkError`, `TimeoutError`, `ValidationError`, and `RateLimitError`.
3. **Facade architecture** in `js/api/DualMindApi.js` exposes `api.arena`, `api.threads`, `api.models`, `api.users`—the right shape for a growing API surface.
4. **Auth-provider abstraction** in `js/api/utils/authProvider.js` tries several token sources and falls back to `localStorage`, isolating auth retrieval.
5. **Cloudflare Worker proxying** decouples the origin-vercel/deploy asset path from the API host, simplifying CORS and allowing backend URL rotation via `env.BACKEND_URL`.
6. **Response normalization** in `js/api/utils/extractors.js` insulates UI code from backend payload shape drift.

---

## Dead / Unused / Duplicate Files

Confidence levels: **High** = no reachable production import/link; **Medium** = referenced only in documentation or verification-only HTML; **Low** = reachable under unusual paths.

### `js/api-client.js` — Deprecated API shim
- **Why it appears unused:** It is not imported by `index.html`, `js/ui/app.js`, `js/ui/leaderboardModal.js`, or `js/leaderboardPage.js`. It only appears in docs (`AGENTS.md`, older audit files) and as a global legacy export (`window.APIClient`). The script tag `<script src="/js/supabase-auth.js">` it dynamically loads does not exist; the real auth module lives at `js/auth/supabase-auth.js`.
- **Confidence:** Medium-High.
- **Recommended action:** Delete. If any legacy HTML still loads it, migrate callers to `js/apiInstance.js` first.

### `js/api/apiClient.js` — Broken legacy shim
- **Why it appears unused:** It imports from `./api/index.js` (line 6) while sitting inside `js/api/`, which resolves to a non-existent `js/api/api/index.js`. Importing this file will throw a module-resolution error. No HTML/JS file imports it.
- **Confidence:** High.
- **Recommended action:** Delete. The internal deprecation warning even tells callers to use `js/apiInstance.js`.

### `js/auth/api-service.js` — Standalone duplicate API client
- **Why it appears unused:** It is not imported by any production HTML or script. It defines its own `DualMindAPIService` class with hand-written `fetch()` calls, its own auth-header building, and hundreds of lines of logging. It only surfaces as `window.DualMindAPIService`.
- **Confidence:** High.
- **Recommended action:** Delete after confirming no admin panels or bookmarklets reference `window.DualMindAPIService`.

### `js/auth.js` — Old custom auth service
- **Why it appears unused:** It authenticates against `/api/auth/login` and `/api/auth/signup`, endpoints that only exist in `mock-api-server.js`. The production app (`index.html`) loads Supabase auth (`js/auth/supabase-auth.js`). No production file imports `js/auth.js` except legacy docs.
- **Confidence:** High.
- **Recommended action:** Delete.

### `js/api/utils/errorHandler.js` — Duplicate/error-class file
- **Why it appears unused:** It redefines `ApiError`, `AuthError`, `NetworkError`, `ValidationError`, and `TimeoutError` that already exist in `js/api/utils/errors.js`. It is not exported from `js/api/index.js` and is not imported anywhere else.
- **Confidence:** High.
- **Recommended action:** Delete and fix `AGENTS.md` line 342 which incorrectly points to it for "centralised error processing."

### `mock-api-server.js` — Dev-only mock backend
- **Why it appears unused:** It is an Express server not started by the app. It is explicitly ignored in `package.json` lint config. It ships with hardcoded credentials/JWT secret.
- **Confidence:** High (it is intentionally a local mock).
- **Recommended action:** Keep for local dev, but move to a `tools/` or `mocks/` directory and remove hardcoded secrets. Add `mock-api-server.js` and any generated `package-lock.json` snippets to `.gitignore` if they contain secrets.

### `js/api/examples.js` — Dev examples
- **Why it appears unused:** Contains `console.log` examples and is labeled dev-only. Not imported by production code.
- **Confidence:** High.
- **Recommended action:** Keep but move outside the source tree (e.g., `docs/examples/api-usage.js`), or add a build step that excludes it from `dist/`.

### `test-everything.js`
- **Why it appears unused:** A one-off smoke-test script hitting `localhost:5079`. Not referenced by `package.json` scripts or CI.
- **Confidence:** High.
- **Recommended action:** Delete or archive under `tests/manual/`.

### `next-dualmind/src/lib/api/*` — Next.js port mirrors
- **Why it appears unused:** These are exact copies of the original JS files (`EXACT COPY of original APIError from api-client.js`, etc.). They are not loaded by the vanilla app and may already be stale.
- **Confidence:** Medium (they belong to a separate `next-dualmind` app that may or may not be active).
- **Recommended action:** If `next-dualmind` is not in production, archive or delete the directory; otherwise freeze it and treat as a separate repo/sub-module to avoid drift.

### `admin-email-system/frontend/*` — Standalone admin panel
- **Why it appears unused in main app:** The main app navigation and `index.html` do not link to `AdminEmailPanel.html`. It is a self-contained admin tool.
- **Confidence:** Medium (it is intentionally standalone, but not integrated).
- **Recommended action:** See security issues below; if retained, gate it behind SSO/Admin-only routing and remove hardcoded credentials from source.

---

## Issues List

### 1. Hardcoded production Supabase credentials in `config.js`
- **Severity:** Critical
- **Files:** `config.js` lines 119-124
- **Description:** The committed source contains fallback default values for `supabase.url`, `supabase.anonKey`, and the `email-wel-safe` function URL. There is no build-time or runtime secret-injection mechanism that actually overrides these in a browser context (the `process.env` branch is dead in browsers). The file is loaded directly by `index.html`, so the live Supabase project reference ships to every user.
- **Why it matters:** Even if a value is "public anon," committing project identifiers and keys makes rotation painful, makes it impossible to open-source the UI safely, and violates least-privilege for SaaS reviews. Regulated auditors will flag this as secrets-in-source.
- **Note:** Exact values are intentionally not quoted in this audit.

### 2. Hardcoded Supabase credentials in admin email panel
- **Severity:** Critical
- **Files:** `admin-email-system/frontend/admin-email-panel.js` lines 5-7
- **Description:** The admin panel hardcodes `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `EDGE_FUNCTION_URL` in committed JavaScript. The deployment guide at `admin-email-system/DEPLOYMENT_GUIDE.md` line 48 explicitly instructs users to paste real keys into this file.
- **Why it matters:** This leaks admin-facing Supabase credentials into source control and browser bundles. If the repo is public or shared, admin keys are exposed.

### 3. Hardcoded JWT secret and plaintext passwords in mock server
- **Severity:** High
- **Files:** `mock-api-server.js` lines 10, 22-32, 73, 119-135
- **Description:** The dev mock server stores a hardcoded `JWT_SECRET` and plaintext user credentials (`password123`, `admin123`) and signs JWTs with the hardcoded secret.
- **Why it matters:** Although this is a local mock, the file is in the repo and could be accidentally deployed or copied. It also normalizes plaintext storage in the codebase.

### 4. `js/api/apiClient.js` is broken at runtime
- **Severity:** Medium
- **Files:** `js/api/apiClient.js` line 6
- **Description:** The import path `./api/index.js` is incorrect from the file's location; the actual barrel file is `./index.js`. Attempting to import `DualMindApiClient` will fail with a 404/module error.
- **Why it matters:** Dead code with a broken import is a maintainability hazard and a sign the file was not reviewed after the folder restructure.

### 5. `js/auth/api-service.js` duplicates the entire API layer
- **Severity:** High
- **Files:** `js/auth/api-service.js` lines 14-611
- **Description:** A full duplicate of chat, streaming, thread, vote, user, health, and model endpoints, with bespoke `fetch()` calls, bespoke auth-header building, and non-idiomatic error messages. It is not imported anywhere in the production app.
- **Why it matters:** Two canonical clients mean fixes (retries, timeout handling, token refresh, endpoint drift) must be applied twice or they diverge. This file already diverged and does not use the centralized `HttpClient`.

### 6. Ungated production logging in `js/auth/api-service.js`
- **Severity:** Medium
- **Files:** `js/auth/api-service.js` lines 125, 133, 144, 152, 161, 165-166, 171, 336-337, 345, and others
- **Description:** Numerous `console.log` / `console.warn` statements emit request paths, parsed chunks, and internal event objects unconditionally.
- **Why it matters:** If this file were ever loaded, it would leak internal API event shapes to user consoles, hurt streaming performance, and violate the project's own "no console.log in production" rule in `AGENTS.md`.

### 7. Direct `fetch()` calls bypass the canonical API client
- **Severity:** Medium
- **Files:**
  - `components/SharedThreadView.js` lines 58-71
  - `components/ShareModal.js` lines 260-286
  - `share/index.html` lines 106, 114
  - `js/feature-flags.js` lines 174-184, 408
- **Description:** These files construct their own backend URLs (`window.DUALMIND_CONFIG.apiBaseUrl`, `getBaseUrl()`, etc.), fetch tokens directly, and build request headers instead of calling `api.threads.getThread()`, `api.threads.updateThreadVisibility()`, or `api.users.syncUser()`.
- **Why it matters:** Bypassing `HttpClient` means no retry logic, no consistent timeout handling, no custom error classes, and more places to update when backend routes or authentication change.

### 8. Guest mode falls back to Supabase anon key as Bearer token
- **Severity:** Medium
- **Files:** `js/api/utils/authProvider.js` lines 54-56; `js/apiInstance.js` line 21
- **Description:** `auth.allowGuest: true` combined with `allowGuest` causes the auth provider to return `window.DUALMIND_CONFIG.supabase.anonKey` as the `Authorization: Bearer` token. This logic exists only to satisfy the legacy auth path.
- **Why it matters:** Sending the Supabase anon key to your backend as a user token is fragile and confusing. The backend must specifically expect this or the request will be treated as an unauthenticated user. It also exposes the anon key on the wire more often than necessary.

### 9. `worker.js` lacks edge-layer protections for API traffic
- **Severity:** Medium
- **Files:** `worker.js` lines 22-69
- **Description:** The worker forwards `/api/*` to `env.BACKEND_URL` with CORS `*` and no rate limiting, no request-size limit, no WAF-style filtering, no backend timeout/failover, and no credential-stripping. It also mutates `Access-Control-Allow-Origin` on every response to `*`.
- **Why it matters:** Without edge limits, a single malicious client can spam the backend. The `*` CORS header means any website can call the backend, increasing abuse surface. In a SaaS, the proxy is the natural place to enforce rate limits and CORS allow-lists.

### 10. `worker.js` logs request URLs unconditionally
- **Severity:** Low
- **Files:** `worker.js` lines 24, 26, 32, 36, 45, 84, 292
- **Description:** The worker logs full paths and backend URLs on every request.
- **Why it matters:** Cloudflare Worker logs are internal, but they still collect path-level PII and can increase log volume/cost. This should be gated by a debug flag.

### 11. SSE streaming has no retry and throws generic errors
- **Severity:** Medium
- **Files:** `js/api/core/HttpClient.js` lines 246-354
- **Description:** The `stream()` method explicitly disables retries (correct for idempotency), but on failure it throws a generic `ApiError` with status `500` and does not expose retry-timing guidance to callers.
- **Why it matters:** A transient network blip mid-stream gives the user a hard failure rather than an actionable message. The UI must then handle reconnect/retry itself, and currently there is no standard pattern for that.

### 12. `HttpClient.request()` silently drops non-JSON bodies
- **Severity:** Low
- **Files:** `js/api/core/HttpClient.js` line 175
- **Description:** `fetchOptions.body = JSON.stringify(body)` is applied for every method that has a body. `FormData`, `Blob`, or `URLSearchParams` would be serialized incorrectly.
- **Why it matters:** It blocks future file-upload or multipart features unless this method is refactored.

### 13. Admin edge function has no rate limiting or batch throttling
- **Severity:** Medium
- **Files:** `admin-email-system/backend/supabase-edge-function/send-admin-email.ts` lines 1-200+
- **Description:** The function loops over an arbitrary recipient list and sends one Brevo request per email with no batching, concurrency limit, or Brevo rate-limit handling. It also does not log suppress/unsubscribe checks.
- **Why it matters:** A large admin send can exhaust the Brevo API quota, cause timeouts, or get the project banned. It also raises GDPR/email-consent compliance questions.

### 14. Admin email system architecture is not integrated or governed
- **Severity:** High
- **Files:** `admin-email-system/frontend/*`
- **Description:** The admin panel is a completely separate page not linked by the main app, with its own styling, its own Supabase client initialization, hardcoded credentials, and no documented RBAC enforcement beyond a `role = 'admin'` SQL update. It also imports the non-brand font `Inter` contrary to `AGENTS.md`.
- **Why it matters:** A SaaS cannot safely offer admin email blasting without audit logs, consent management, template review, and integration with the main auth/session layer. As written, it is a side-channel security and compliance risk.

### 15. `js/api-client.js` falls back to `localStorage` token with stale Supabase path
- **Severity:** Medium
- **Files:** `js/api-client.js` lines 25-39
- **Description:** The deprecated shim dynamically imports `/js/supabase-auth.js`, catches any failure, then reads `localStorage.getItem('dualmind.auth.token')` or `window.DUALMIND_AUTH_TOKEN` and sends it as a Bearer token.
- **Why it matters:** A fallback to arbitrary `localStorage` tokens is risky if those values are stale or maliciously injected. Because the file is deprecated and likely unused, the safest fix is deletion.

### 16. `config.example.js` still instructs copying credentials into committed JS
- **Severity:** Medium
- **Files:** `config.example.js` lines 17-19; `README.md` line 33
- **Description:** The example file tells users to "Copy this file to .env" but it is a JS file full of `window.DUALMIND_CONFIG` assignments. There is no actual runtime env-loader for browsers.
- **Why it matters:** New developers will follow the guide and commit secrets to source. A real SaaS needs a documented runtime-secret flow (Cloudflare Secrets, a build-time replacement, or a server render).

### 17. `AGENTS.md` contains outdated architectural claims about `app-final.js`
- **Severity:** Low
- **Files:** `AGENTS.md` lines 68, 69, 78, 328-342
  - `js/app-final.js` does not exist at the project root; the actual main app is `js/ui/app.js`.
  - `js/api/utils/errorHandler.js` is described as "centralised error processing" but is dead/duplicate.
- **Why it matters:** Documentation drift misleads future developers and Claude instances about which files to edit.

### 18. Share route uses multiple base-URL strategies
- **Severity:** Low
- **Files:** `components/SharedThreadView.js` lines 53-66; `share/index.html` lines 106, 114
- **Description:** The shared-thread loader falls back through `window._API`, direct backend fetches, and a `getBaseUrl()` helper. The standalone `share/index.html` duplicates the same logic.
- **Why it matters:** Fragile maintenance; the share page is user-facing and public, so routing/backend URL drift would silently break shared links.

### 19. No API contract tests or backend mocks for CI
- **Severity:** Medium
- **Files:** `tests/` directory, `package.json`
- **Description:** Playwright tests cover UI only. There are no tests for `HttpClient`, service methods, or response extractors, and no recorded fixtures.
- **Why it matters:** Backend drift will only be discovered in production by users. SaaS launches require automated contract checks for thread creation, voting, and streaming endpoints.

### 20. `worker.js` proxy does not validate or sanitize request body before forwarding
- **Severity:** Low
- **Files:** `worker.js` lines 39-43
- **Description:** The worker forwards headers and body directly to the backend without validating content-length, JSON shape, or malicious payloads.
- **Why it matters:** This is acceptable only if the backend validates everything. At minimum, the worker should set a maximum request size and a backend fetch timeout.

---

## SaaS-readiness Gaps Specific to This Domain

| # | Gap | Production impact |
|---|-----|-------------------|
| 1 | Secrets in source | Prevents SOC 2/GDPR/security audits; blocks open-sourcing; rotation requires redeploy |
| 2 | Multiple API clients | Maintenance burden, inconsistent retry/error behavior, easier regressions |
| 3 | Direct `fetch()` outside API client | No centralized observability, retries, or token refresh |
| 4 | No edge rate limiting | Abuse/vulnerability to scraping and brute-force at `/api/*` |
| 5 | `Access-Control-Allow-Origin: *` on API | Any site can call backend endpoints with stolen tokens |
| 6 | Admin email feature ungoverned | GDPR/email-consent/legal risk and operational abuse risk |
| 7 | No API contract tests | Backend changes can break UI silently after launch |
| 8 | No backend failover / timeout in worker | A slow backend can exhaust Worker CPU/subrequest limits |
| 9 | Guest-mode anon-key-as-token pattern | Confuses auth model and increases key exposure |
| 10 | Dead code shipped in `dist/` duplicates | Build copies of deprecated files in `deploy_build/` and `dist/` increase surface area |

---

## Recommended Fixes / Next Steps (Prioritized by Impact)

### P0 — Block production launch

1. **Remove all secrets from committed source.**
   - `config.js`: replace fallback defaults with `'YOUR_SUPABASE_URL'` / `'YOUR_SUPABASE_ANON_KEY'` placeholders. Use Cloudflare Secrets or a build-time env replacement for production values.
   - `admin-email-system/frontend/admin-email-panel.js`: load `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `EDGE_FUNCTION_URL` from runtime environment or a secure admin config endpoint, never from source.
   - Rotate the exposed Supabase anon key once the source is cleaned.

2. **Delete or quarantine dead code.**
   - Delete `js/api-client.js`, `js/api/apiClient.js`, `js/auth/api-service.js`, `js/auth.js`, `js/api/utils/errorHandler.js`.
   - If any file must be retained as a reference, move it to an `archive/` directory excluded from deployment and `dist/`.

3. **Secure the admin email system.**
   - Remove hardcoded credentials.
   - Add audit logging, consent/unsubscribe enforcement, batch throttling, and role claims from Supabase JWT.
   - Consider whether this feature needs to exist before launch; if not, remove the directory.

### P1 — High impact / reliability

4. **Enforce the canonical API client everywhere.**
   - Refactor `components/SharedThreadView.js`, `components/ShareModal.js`, `share/index.html`, and `js/feature-flags.js` to use `api` from `js/apiInstance.js`.
   - Add a lint rule forbidding direct `fetch()` except in `HttpClient.js`.

5. **Harden the Cloudflare Worker proxy.**
   - Add a backend fetch timeout (e.g., 30s).
   - Add request-size limit (`content-length` check) and strip/harden CORS headers.
   - Replace CORS `*` with an allow-list or dynamic origin validation.
   - Remove unconditional `console.log` calls; gate them with an `env.DEBUG` flag.
   - Add rate limiting (Cloudflare Rate Limiting rules or KV-backed per-IP/per-token counters).

6. **Add API contract / unit tests.**
   - Test `HttpClient` retry behavior, SSE parsing, and `createErrorFromStatus`.
   - Add minimal Playwright/API fixtures for thread creation and voting endpoints.

### P2 — Medium impact / maintainability

7. **Resolve guest-mode token confusion.**
   - Make `allowGuest: false` the default in `js/apiInstance.js`. If anonymous API access is required, implement a proper anonymous-token exchange rather than sending the Supabase anon key.

8. **Improve SSE error handling.**
   - Return structured resilience metadata (retry-after, request-id) from `HttpClient.stream()` and surface a standard UI retry/reconnect pattern.

9. **Make `HttpClient` body-aware.**
   - Detect `FormData`, `URLSearchParams`, and `Blob` and pass them through without `JSON.stringify()`.

10. **Update `AGENTS.md` and `README.md`.**
    - Correct the `app-final.js` reference to `js/ui/app.js`.
    - Remove `errorHandler.js` as canonical.
    - Document the one true import: `import { api } from './js/apiInstance.js'`.

### P3 — Cleanup

11. **Archive or remove `next-dualmind/` stale API copies** if the Next.js app is not shipping.
12. **Move `mock-api-server.js`** into `mocks/` and remove its hardcoded JWT secret.
13. **Remove `test-everything.js`** or relocate to `tests/manual/`.
14. **Add `.gitignore`/build exclusions** so `dist/` and `deploy_build/` do not resurrect deleted source files.

---

*Audit completed: 2026-08-14*
