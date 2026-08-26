# Core App & Entry Points Audit

**Audit Date:** 2026-08-14
**Auditor:** Senior Frontend / JS SaaS Auditor
**Domain:** Core App & Entry Points

---

## Scope (files reviewed)

Production entry points and bootstrap files:

- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\index.html`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\config.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\js\ui\app.js` (current production app entry, 2,112 lines)
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\worker.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\sw.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\manifest.json`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\serve.json`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\theme.js`

Supporting files inspected for dead-code / duplicate analysis:

- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\App.jsx`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\build.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\build-deploy.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\package.json`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\wrangler.jsonc`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\wrangler-dist.toml`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\performance-monitor.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\arena-core.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\login\js\app-final.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\old-html-backup\app.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\verify.html`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\auth-callback.html`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\auth-verify.html`

---

## Overview

This domain represents the **browser-to-edge bootstrap and routing layer** of the DualMind UI. The architecture is a **vanilla-JS single-page application (SPA)** served as static assets by a Cloudflare Worker (`worker.js`). The main page load path is:

1. Browser requests `index.html`.
2. `index.html` loads `config.js` synchronously, then `js/auth/supabase-init.js` (deferred), then the module `js/ui/app.js`.
3. `js/ui/app.js` waits for Supabase session restoration, redirects unauthenticated users to `login-modern.html`, initializes components, and proxies all API calls through `window._DUALMIND_API` (`js/apiInstance.js`).
4. In production (Cloudflare Workers), `worker.js` intercepts `/api/*` and forwards them to the Azure backend; all other paths are served from the ASSETS binding.
5. Local dev uses `npx serve . -p 8000` and the UI calls the backend directly.

**Important note:** The canonical entry point documented in `AGENTS.md` and `CLAUDE.md` is `js/app-final.js`, but that file does **not** exist at the project root. The live production entry point is `js/ui/app.js`. Several other documented / historical files are orphaned or duplicated.

---

## Strengths

1. **Clear SPA shell in `index.html`**: explicit semantic containers (`#app`, `#header-container`, `#main-content`, `#chat-input-container`, `#floating-voting`) with ARIA roles and a skip-link.
2. **Config-first bootstrap**: `config.js` sets `window.DUALMIND_CONFIG` before any app logic runs, centralizing backend URL, Supabase credentials, feature flags, and streaming defaults.
3. **Global error banner for catastrophic failures**: `index.html:65-116` catches `window.onerror` and unhandled promise rejections and shows a user-visible retry banner instead of a blank screen.
4. **Deferred non-critical assets**: Markdown / syntax-highlighting scripts (`marked`, `DOMPurify`, `highlight.js`) and styles are deferred / non-blocking.
5. **CustomEvent-driven inter-component communication**: `js/ui/app.js` coordinates components via `mode-change`, `chat-submit`, `backend-available`, etc., reducing direct coupling.
6. **Cloudflare Worker proxy centralizes CORS and static security headers**: `worker.js` adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `X-XSS-Protection` for static assets.
7. **PWA manifest is well-structured** (when linked) with icons, shortcuts, categories, and screenshots.

---

## Dead / Unused / Duplicate Files

### High-confidence dead files in this domain

| File | Why it appears unused | Confidence | Recommended action |
|------|-----------------------|------------|-------------------|
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\App.jsx` | React implementation of the same app shell. `index.html` loads the vanilla `js/ui/app.js`; no HTML file or build script imports `App.jsx`. | High | Delete or move to an archived spike folder (e.g., `spikes/react-prototype/`). |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\js\app-final.js` (root path) | Referenced exclusively in documentation (`AGENTS.md`, `CLAUDE.md`) and in `components/Sidebar.js:53` comment. The actual file does not exist at this path. | High | Update all documentation and comments to point to `js/ui/app.js`. Remove stale references. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\sw.js` | Not registered anywhere (no `navigator.serviceWorker.register(...)`). Worse, it imports an external script from `3nbf4.com` (Monetag/ad network). | High | Delete. Do not deploy to `dist/`. Replace with a first-party PWA service worker if PWA caching is required. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\manifest.json` | Not linked in `index.html` (no `<link rel="manifest">` found across the whole project). | High | Add `<link rel="manifest" href="/manifest.json">` to `index.html` or delete it. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\performance-monitor.js` | Not loaded by `index.html` or `js/ui/app.js`. Only referenced by build scripts and existing audit notes. | High | Delete or import explicitly behind the `DUALMIND_CONFIG.debug.showPerformanceMetrics` flag. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\arena-core.js` | Not imported, statically referenced, or loaded by any HTML/JS file. Only copied by `build-deploy.js:28`. | High | Delete or rename clearly as a prototype; do not copy into `dist/`. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\verify.html` | Internal setup-verification page; not linked from any production page. It also references the stale path `js/api/apiClient.js`. | Medium | Move to `internals/` or delete; update references if kept. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\auth-verify.html` | Copied by `build.js:11`, but no Supabase flow or internal link points to it. `login-modern.html` and `signup-modern.html` redirect to `auth-callback.html`. | Medium | Confirm against auth flow; if unused, delete. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\old-html-backup\` (entire directory) | Explicitly ignored by ESLint (`package.json:9 --ignore-pattern old-html-backup`) and contains pre-component HTML/JS. Grep shows zero imports from production code. `old-html-backup/app.js` is a duplicate of the legacy arena logic. | High | Archive outside repo or delete. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\next-dualmind\` | Separate Next.js application. Not referenced by build/deploy scripts for the current static site. | Medium | Treat as a separate repo/project; consider moving out to avoid lint / dependency confusion. |
| `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\deploy_build\` | Stale build artifact ignored in `.gitignore` (`deploy_build/`). `build-deploy.js` now targets `dist/`. | High | Delete from working tree. |

### Duplicate / conflicting routes and entries

| Duplication | Description | Impact |
|-------------|-------------|--------|
| Root-level auth pages vs `/login/` folder | `login-modern.html`, `signup-modern.html`, `forgot-password.html`, `update-password.html` exist alongside a `/login/` directory containing an alternate `index.html` and `js/app-final.js`. | Two auth experiences compete for the same traffic; root `login-modern.html` is referenced by `js/ui/app.js:131` and `js/auth/supabase-init.js`, while `/login/` may still be accessible. Pick one and redirect/ canonicalize the other. |
| `build.js` vs `build-deploy.js` | Two build scripts produce `dist/` with overlapping but different file lists. `build.js` copies `sw.js` and root auth pages; `build-deploy.js` copies `/login/` folder and `js/ui/app.js` explicitly. | Risk of deploying inconsistent bundles. Standardize on one script. |
| `wrangler.jsonc` vs `wrangler-dist.toml` | `wrangler.jsonc` is tracked and points to `dist/`; `wrangler-dist.toml` is `.gitignore`d. `package.json` deploy uses `npx wrangler deploy` which will prefer `wrangler.jsonc` by default, but `build-deploy.js` tells the user to run `wrangler deploy --config wrangler-dist.toml`. | Confusion over which config is authoritative; `.gitignore`d deploy config is dangerous in CI. |
| `theme.js` loaded by subpages, not by `index.html` | `about`, `careers`, `leaderboard`, `models`, `how-it-works`, `login/index.html` load `theme.js`, but the main app shell does not. | Main app never applies `data-theme`, so user-selected theme may not persist across navigation into/from the app. |

---

## Issues List

### Security

| # | Severity | File(s) | Description | Why it matters for a SaaS product |
|---|----------|---------|-------------|-----------------------------------|
| 1 | **Critical** | `config.js:119-120` | Hardcoded Supabase URL and anon JWT in client-side source. `const envSupabaseUrl = ... 'https://calqfzajyidkdzbaswjp.supabase.co'; const envSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'` | The anon key is required for client auth, but committing it in plain text makes rotation hard and exposes the project to credential-leakage scanners. For a multi-tenant SaaS, keys should be injected at deploy time (Cloudflare secrets / env bindings) and rotated regularly. |
| 2 | **Critical** | `sw.js:1-7` | Service worker imports and executes a remote script from `https://3nbf4.com/act/files/service-worker.min.js?r=sw` under the `3nbf4.com` ad/monetization domain. | Even though it is not currently registered, shipping it in `dist/` creates supply-chain and code-injection risk. It can intercept requests, modify responses, and undermine user trust. It may also violate privacy policies / app-store requirements. |
| 3 | **High** | `index.html:39-41` | CDN scripts (`highlight.js`, `marked`, `DOMPurify`) are loaded without Subresource Integrity (SRI) hashes. | If any of these CDNs are compromised, attackers can execute arbitrary JS in the context of the SaaS app, stealing sessions or exfiltrating chat data. |
| 4 | **High** | `index.html:5` | `<meta name="monetag" content="b5a70184616210672492a246e2553c17">` is present but no privacy consent / ad disclosure exists in the main UI. | Monetization tags must be disclosed per privacy policies and (in many jurisdictions) require consent. Hidden ad tags conflict with a B2C SaaS trust posture. |
| 5 | **High** | `worker.js:24,32,36,45,84,292` | `console.log` / `console.error` in the Cloudflare Worker logs request paths, backend URL, and backend errors. | In production, worker logs may contain tokens, user IDs, or message metadata. This leaks backend topology and can violate data-retention policies. |
| 6 | **High** | `worker.js:52-53` | Response headers `x-dualmind-proxy-backend` and `x-dualmind-proxy-path` disclose the real backend origin to clients. | Exposing the Azure backend URL eases targeting for direct attacks and bypass attempts. |
| 7 | **High** | `worker.js` | No Content-Security-Policy headers are set for static assets or API responses. | Without a CSP, XSS payloads (from CDN compromise or stored chat content) have fewer mitigations. |
| 8 | **Medium** | `worker.js:8` | `Access-Control-Allow-Origin: '*'` allows any origin to call `/api/*` with credentials-bearing headers forwarded. | Combined with `Access-Control-Allow-Headers: Authorization`, this enables cross-origin authenticated requests from attacker pages unless the backend enforces its own strict origin check. |
| 9 | **Medium** | `js/ui/app.js:109-113` | Auth session clearing logs the raw `logoutError` to `console.warn`, which may contain Supabase session details. | Errors should be redacted before logging in production. |

### Reliability / Correctness

| # | Severity | File(s) | Description | Why it matters for a SaaS product |
|---|----------|---------|-------------|-----------------------------------|
| 10 | **Critical** | `js/ui/app.js:80-116` | Session readiness is gated by a hardcoded 500 ms sleep (`await new Promise(resolve => setTimeout(resolve, 500));`) and a 3-second polling loop. | Race conditions on slow networks or slow Supabase restores can still redirect authenticated users to the login page. SaaS auth must wait on the actual auth-ready promise, not timers. |
| 11 | **High** | `index.html:108-115` | App-ready timeout fires after 10 seconds and shows an initialization error if `_DUALMIND_APP_READY` is still false. | On slow 3G or when Supabase is slow, users see a false "timed out" banner even though initialization may still succeed. |
| 12 | **High** | `js/ui/app.js:182-183` | Backend availability check reads `window.DUALMIND_CONFIG?.offline?.enabled === false`, then skips the check entirely when offline mode is preferred. | If config accidentally flips or the `offline` object is missing, the app may silently demo-fallback instead of surfacing a real backend outage. |
| 13 | **High** | `worker.js:73-98` | `/share/*` fallback path has an empty `if (!assetResponse || assetResponse.status === 404)` block and then falls through to the 404 handler instead of forcing `share/index.html`. | Shared threads may 404 under some deployment structures, breaking a core viral loop of the product. |
| 14 | **High** | `worker.js:244-245` | `hasExtension` check uses `pathname.split('/').pop()?.includes('.')`, which incorrectly treats any path segment containing a dot as having an extension (e.g., `/share/foo.bar`). | Clean URLs with dots may be misrouted to `.html` lookups or 404s. |
| 15 | **High** | `auth-callback.html:289` | `startRedirect('./update-password.html' + hash)` is hardcoded relative. | Hash-only password-reset links may not work depending on the directory the callback lands in. |
| 16 | **Medium** | `signup-modern.html:150` | Links to `terms.html` and `privacy.html`, but those files do not exist at the root; the actual pages are in `terms/` and `privacy/` directories. | Users clicking legal links from signup get a 404, which is a legal/compliance and UX issue. |
| 17 | **Medium** | `verify.html:196-200` | Verification page checks for `js/api/apiClient.js`, which no longer exists (it is `js/api/apiClient.js` case? Actually file is `js/api/apiClient.js`? It may match case-insensitively on Windows, but the file is `DualMindApi.js` / `apiClient.js`?). | Internal tooling is out of sync with the actual file layout, producing false positives/failures. |
| 18 | **Medium** | `sw.js` (in `dist/`) | Even if not registered, `manifest.json` references icons (`battle.png`, `leaderboard.png`) and screenshots that may not exist. | Browsers may show broken icons / install failures. |
| 19 | **Low** | `manifest.json:8` | `theme_color` is `#8ab4ff`; `index.html` uses `theme-color` `#000000`. | Inconsistent branding in the install prompt / browser chrome. |

### Maintainability

| # | Severity | File(s) | Description | Why it matters for a SaaS product |
|---|----------|---------|-------------|-----------------------------------|
| 20 | **High** | `js/ui/app.js` | Single 2,112-line class handles auth, routing, chat streaming, voting, thread management, TTS, offline indicators, and component orchestration. | The file is near the limit of safe modification; future changes risk regressions and should be split into focused modules (e.g., `TurnManager`, `VoteManager`, `StreamManager`). |
| 21 | **Medium** | `components/Sidebar.js:53` | Comment still says "Get API client from window (set by app-final.js)". | Documentation drift caused by the move from `js/app-final.js` to `js/ui/app.js`. |
| 22 | **Medium** | `AGENTS.md`, `CLAUDE.md` | Both canonical memory files document a `js/app-final.js` entry point and old component map that no longer exists. | New contributors / future Claude instances will look for the wrong file, wasting time and potentially editing dead code. |
| 23 | **Medium** | `js/ui/app.js:1311`, `js/ui/app.js:1857` | Hardcoded `#4AABC2` in inline styles despite the project rule to use `var(--color-cyan)`. | Violates the design-token rule and creates inconsistency if brand colors are updated. |
| 24 | **Medium** | `js/ui/app.js:382-398`, `js/ui/app.js:1118-1128` | Inline emoji characters (`⚠️`, `👈`, `🤝`, `👎`, `👉`, `👁️`) and inline styles used for UI chrome. | Contradicts `CLAUDE.md` guidance (use `js/icons.js`, no emoji action buttons) and reduces accessibility / screen-reader friendliness. |
| 25 | **Low** | `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\js\app.js` | Legacy file `js/app.js` is referenced in project docs as old/debug-laden code. It does not appear in the file list at all (only `js/ui/app.js` exists). | Either restore/relocate or remove all references to avoid confusion. |

### Performance

| # | Severity | File(s) | Description | Why it matters for a SaaS product |
|---|----------|---------|-------------|-----------------------------------|
| 26 | **Medium** | `index.html:44-56` | 11 synchronous CSS `<link>` tags in `<head>` block first render. | Especially on slower connections, render is delayed until all files download. Bundle into 2-3 files or use `media`/preload for non-critical sheets. |
| 27 | **Medium** | `index.html:185` | `feature-flags.js?v=20260328-5` uses a query-string cache-buster, but the Worker sets `cache-control: no-store` for JS, so the query is redundant. More importantly, `feature-flags.js` is not loaded behind a module boundary and may block or error in unexpected order. | Cache-busting strategy is inconsistent; versioned filenames are more robust and CDN-friendly. |
| 28 | **Low** | `performance-monitor.js` | Patches `window.fetch` globally and tracks up to 50 calls in memory, but is not wired anywhere in the production bootstrap. | It adds bytes and monkey-patches fetch even though unused; better to integrate only when the debug flag is on. |

### Scalability / SaaS Operations

| # | Severity | File(s) | Description | Why it matters for a SaaS product |
|---|----------|---------|-------------|-----------------------------------|
| 29 | **Critical** | Entry points overall | No production error-monitoring integration (Sentry, LogRocket, Bugsnag, Datadog RUM) is installed. The only telemetry is browser `console` and an in-memory `performance-monitor.js`. | Production incidents (failed logins, failed thread creation, streaming failures) are invisible until a user reports them. |
| 30 | **High** | `config.js` | All configuration is static JS, including Supabase URL, backend URL, feature flags, and speed presets. | Cannot toggle features per user without shipping new code. SaaS should serve feature flags from the backend or a feature-flag service. |
| 31 | **High** | `worker.js:23-70` | Worker forwards all `/api/*` traffic without rate limiting, body size limits, or path allow-listing. | A malicious or runaway client can hammer the backend or upload huge payloads, increasing cost and outage risk. |
| 32 | **Medium** | `index.html` | No Open Graph / Twitter metadata for `/share/*` paths. Social shares of battle results will use the generic `index.html` metadata instead of thread-specific cards. | Reduces viral conversion and looks unpolished. |

---

## SaaS-Readiness Gaps Specific to This Domain

1. **PWA is not actually enabled.** `manifest.json` exists but is not linked; `sw.js` exists but is not registered and is a third-party ad worker. The app cannot be installed, and there is no offline caching strategy.
2. **Client-side secrets.** Supabase credentials live in `config.js`, which is public static JS. While Supabase anon keys are inherently public, they should still be injected at build/deploy time, not committed, to enable rotation and avoid accidental leakage.
3. **No Content Security Policy or SRI.** A SaaS product handling user prompts and AI responses must defend against XSS via CDN compromise and prompt injection. The current setup has neither CSP nor integrity hashes on external scripts.
4. **No production observability.** No RUM, error tracking, or backend health dashboards. The `performance-monitor.js` is unconnected and only keeps data in browser memory.
5. **Ad/monetization artifacts conflict with SaaS trust.** The Monetag meta tag and `sw.js` ad-worker create privacy and brand-trust issues that block enterprise or privacy-conscious users.
6. **Two parallel auth experiences.** Root-level modern auth pages (`login-modern.html`) and the `/login/` folder create duplicate routes, confused analytics, and potential stale code paths.
7. **Build/deploy pipeline is ambiguous.** Two build scripts (`build.js`, `build-deploy.js`) and two Wrangler configs produce different `dist/` outputs; one config is gitignored. This is a recipe for "works on my machine" deployments.

---

## Recommended Fixes / Next Steps (Prioritized by Impact)

1. **Remove security liabilities immediately**
   - Delete `sw.js` and stop copying it to `dist/`.
   - Add SRI hashes for all CDN scripts in `index.html` (`marked`, `DOMPurify`, `highlight.js`, and syntax-highlighting CSS).
   - Remove the Monetag `<meta>` tag unless it is an officially approved, disclosed monetization integration.
   - Move Supabase URL and anon key out of `config.js` into Cloudflare secrets / environment bindings and inject them into a generated `config.js` at deploy time (or use a small build-time replace step). Until then, rotate the key.

2. **Fix PWA / static asset correctness**
   - Either delete `manifest.json` or add `<link rel="manifest" href="/manifest.json">` to `index.html` and verify all referenced icons/screenshots exist.
   - If an installable PWA is desired, write a first-party service worker with an asset cache strategy and register it from `index.html`.
   - Delete `performance-monitor.js` and `arena-core.js` from the production `dist/` pipeline unless they are intentionally adopted.

3. **Standardize on a single build/deploy path**
   - Pick one build script (`build.js` or `build-deploy.js`) and delete the other.
   - Pick one Wrangler config (`wrangler.jsonc`) and remove `wrangler-dist.toml` from the deploy instructions. Keep `.gitignore` only for truly local files.
   - Update `package.json` so `deploy` matches the chosen script/config.

4. **Harden the Cloudflare Worker**
   - Add a strict CSP header for static assets and API responses.
   - Remove or downgrade `X-XSS-Protection` (it is deprecated and can introduce vulns); rely on CSP instead.
   - Remove `x-dualmind-proxy-backend` and `x-dualmind-proxy-path` headers in production.
   - Add path allow-listing, body size limits, and rate limiting for `/api/*`.
   - Force `/share/*` to always serve `share/index.html` regardless of asset layout.
   - Replace `console.log`/`console.error` in `worker.js` with a structured logger or remove logging in production.

5. **Make auth initialization robust**
   - In `js/ui/app.js`, replace the fixed `500 ms` sleep and `3000 ms` polling with an explicit `DualMindAuthReady` promise and retry only on actual auth-state errors.
   - Increase or remove the 10-second global timeout in `index.html`, and distinguish between slow init vs. actual failure.

6. **Clean up dead and duplicate code**
   - Delete or archive `App.jsx`, `old-html-backup/`, `deploy_build/`, `verify.html`, and `next-dualmind/` (if not being used).
   - Consolidate auth pages: choose either root-level modern pages OR `/login/` folder, and redirect the other.
   - Fix `signup-modern.html` legal links to point to `terms/` and `privacy/` directories.
   - Update `AGENTS.md` and `CLAUDE.md` to reflect the real file layout (`js/ui/app.js`, no `js/app-final.js`).

7. **Code-quality and style improvements**
   - Refactor `js/ui/app.js` into smaller modules (e.g., `TurnManager.js`, `StreamManager.js`, `VoteManager.js`) over the next few sprints.
   - Replace the hardcoded `#4AABC2` inline styles at `js/ui/app.js:1311` and `js/ui/app.js:1857` with CSS classes using `var(--color-cyan)`.
   - Replace emoji action buttons in `js/ui/app.js` with icons from `js/icons.js`.

8. **Add production observability**
   - Integrate a browser error-monitoring service (e.g., Sentry) with PII scrubbing rules and environment/release tags.
   - Forward critical worker errors to the same monitoring service or a logging sink.

9. **Implement feature-flag and config hygiene**
   - Serve feature flags from the backend or a feature-flag service instead of a static `feature-flags.js`.
   - Separate environment-specific values (API URL, Supabase URL, keys) from tunable defaults.

---

*End of Core App & Entry Points Audit*
