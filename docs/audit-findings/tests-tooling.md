# Tests, Tooling & Observability Audit

**Analysis Date:** 2026-08-14

## Scope (files reviewed)

- `tests/auth-flow-redesign.spec.js`
- `playwright.config.js`
- `package.json` (npm scripts + declared devDependencies)
- `test-everything.js`
- `test-supabase-auth.js`
- `.eslintrc.json`
- `performance-monitor.js`
- `arena.dualmindlab.tech-1767900748196.log`
- `dev-server.log`
- `.github/workflows/lint.yml`
- `.github/workflows/azure-static-web-apps-lemon-bush-0b198b200.yml`
- `build.js`, `build-deploy.js`
- `config.js`, `config.example.js`
- `index.html` (script/link load order + global error handler)
- `js/ui/app.js` (actual production entry point), `js/auth/api-service.js`
- Cross-referenced: `js/app-final.js` (documented but absent), `js/supabase-init.js` (absent — actual file is `js/auth/supabase-init.js`), `tests/ui-config-bugs.spec.js` (referenced by npm script but absent), `sw.js`

## Overview

This domain covers how the DualMind UI project verifies behaviour (Playwright E2E, console smoke scripts, Supabase auth diagnostics), enforces code quality (ESLint), and collects runtime telemetry (`performance-monitor.js`, debug guards, window error banner). The app is a vanilla-JS SPA served via Cloudflare Workers with no build step, so tests and tooling are the only safety net outside manual QA.

Architecturally the tooling story is incoherent and in transition:

- **Documentation drift.** `CLAUDE.md` / `AGENTS.md` repeatedly cite `js/app-final.js` and `js/supabase-init.js` as canonical; those files do **not exist** at the project root. The actual production entry loaded by `index.html:184` is `js/ui/app.js` and the auth init is `js/auth/supabase-init.js` (`index.html:120`). `dev-server.log:33,105,176,267` shows requests for `/js/app-final.js` returning `304` (stale cache) and `/js/supabase-init.js` — i.e. the documented paths were once served but are no longer present in source.
- **Broken npm test surface.** `package.json` advertises `npm test`, `npm run test:ui-bugs`, and `npm run validate`, but the test target `tests/ui-config-bugs.spec.js` does not exist and `@playwright/test` is not declared in `devDependencies`. Playwright is physically installed in `node_modules/` (a `playwright-report/` directory exists), so the suite can run locally but will not survive `npm ci` on a clean machine or in CI.
- **No observability backend.** There is no Sentry / LogRocket / Bugsnag / Datadog RUM. The only runtime instrumentation is `performance-monitor.js`, which is **not loaded by `index.html` or any HTML page** — the only non-doc reference is `build-deploy.js:30` (a secondary, non-default build script). The default `build.js` does not ship it.
- **Secrets in committed source.** Both `config.js:119-120` and `test-supabase-auth.js:4` hardcode the Supabase project URL and anon key in plain text.

## Strengths

- Debug-guard pattern is consistently applied in newer code: `if (window.DUALMIND_CONFIG?.debug?.enabled) console.log(...)` in `components/chat/ChatView.js`, `js/auth-modern.js`, `js/auth/supabase-init.js`, `components/ShareModal.js`.
- `playwright.config.js` is CI-aware: retries on CI, `forbidOnly` on CI, single worker on CI, trace-on-first-retry, screenshot-on-failure, and auto-starts the dev server via `npx serve . -p 8000`.
- `performance-monitor.js` instruments page-load timing, `fetch` duration, `PerformanceObserver` measures, and both `error` / `unhandledrejection` events, and exposes `window.performanceMonitor` with a `reportMetrics()` console table.
- `index.html:65-117` installs a global `window.onerror` / `onunhandledrejection` handler that surfaces an in-page error banner with a Retry button and a 10s init-timeout banner — a real user-facing resilience net.
- `config.example.js:18` explicitly instructs users to copy and never commit real credentials.
- `.github/workflows/lint.yml` runs ESLint on Node 18 against pushes/PRs to `master`/`main`.

## Dead / Unused / Duplicate Files

| File | Why it appears unused / duplicate | Confidence | Referenced in `deploy_build`/`dist`? | Recommended action |
|------|-----------------------------------|------------|--------------------------------------|--------------------|
| `test-everything.js` | Browser-console smoke script. Grep across non-`node_modules` files finds **zero** references outside this audit doc. It hardcodes wrong ports (`localhost:5079`, `localhost:8002`) vs. the dev server on `8000`, and is not wired to Playwright or npm scripts. | **High** | Not copied by `build.js` or `build-deploy.js` | **Delete.** If a smoke test is wanted, add a Playwright spec. |
| `test-supabase-auth.js` | Node script that pings Supabase auth providers. Grep finds **zero** references outside this audit doc. Not in any npm script, not imported. Also leaks credentials (see Issue 1). | **High** | Not copied by either build script | **Delete** (and rotate the anon key). |
| `performance-monitor.js` | **Not loaded by any HTML page** (grep of `*.html` for `performance-monitor` returns no matches). The only non-doc reference is `build-deploy.js:30` — the *secondary* build script. The default `build.js` does not ship it. So in the default deployment path it is dead code; in the `build-deploy.js` path it is copied but never `<script src>`'d. | **High** | Copied by `build-deploy.js` only; not loaded at runtime | **Keep but wire in** (add a gated `<script defer>` in `index.html` behind `debug.enabled`), or **delete** if a real APM replaces it. |
| `tests/auth-flow-redesign.spec.js` | The only Playwright spec that exists. `package.json:12` instead references `tests/ui-config-bugs.spec.js`, which does **not exist**. So this spec is orphaned by the npm scripts (running `npm test` will run it only because Playwright falls back to the whole `tests/` dir, but `npm run test:ui-bugs` fails). | **Medium** | N/A (tests not deployed) | **Keep**, but fix `package.json` scripts and add the missing spec. |
| `arena-core.js`, `arena-redesign.css` | Only referenced by `build-deploy.js:28-29`. Not loaded by `index.html`, not imported by any JS. Likely legacy artifacts from a prior arena implementation. | **Medium** | Copied by `build-deploy.js` only | **Archive** to `old-html-backup/` or **delete** after confirming no `/arena` route uses them. |
| `mock-api-server.js` | Only reference is `package.json:9` as an ESLint ignore-pattern. Not started by any npm script, not imported. | **Medium** | Not copied by `build.js`; copied by neither | **Archive** or **delete**; remove the ignore-pattern once gone. |
| `sw.js` | Service worker that imports `https://3nbf4.com/act/files/service-worker.min.js` — an unknown third-party domain. Not registered in `index.html`. | **Medium** | Copied by `build.js` (line 20) and `build-deploy.js`-adjacent build | **Delete** — appears to be a leftover/compromised SW; if a PWA SW is intended, rewrite it. |
| `js/auth/api-service.js` | Contains 15 `console.*` calls (only 1 is debug-gated at line 598). Grep finds no ES import of `api-service` outside `node_modules` — it appears to be a parallel/duplicate API client alongside the canonical `js/api/` layer. | **Medium** | Not copied by `build.js` (only the `js/` folder is copied, which includes it) | **Delete** or merge into `js/api/services/ArenaService.js`; remove the duplicate. |
| `build-deploy.js` | Secondary, non-default build script. `package.json:14-15` only wires `build.js` (`npm run build`). `build-deploy.js` is not invoked by any npm script. | **Medium** | N/A | **Delete** or fold its extra entries (`arena-core.js`, `arena-redesign.css`, `performance-monitor.js`) into `build.js` if actually needed. |
| `dev-server.log`, `arena.dualmindlab.tech-1767900748196.log` | Runtime logs accidentally committed to source. `.gitignore:94` ignores `*.log`, so these were committed before the ignore was added (or via `git add -f`). | **High** | Not copied by builds | **Delete** from the repo and confirm `.gitignore` keeps them out. |

## Issues List

| # | Severity | File(s) | Description | Why it matters for a SaaS product |
|---|----------|---------|-------------|---------------------------------|
| 1 | **Critical** | `config.js:119-120`, `test-supabase-auth.js:3-4` | Supabase project URL and anon key (`eyJhbGciOiJIUzI1Ni...`) are hardcoded in plain text in committed source. `config.js` is loaded directly by `index.html:62`, `signup-modern.html:36`, `login-modern.html:22` — the same file the user is told (`config.example.js:18`) never to commit. | Anon keys gate API quotas, auth-provider config, and abuse attribution. Committing them forces rotation, enables attribution/credential-stuffing attacks, and violates least-privilege/secrets-management expectations for any SaaS or compliance audit. |
| 2 | **Critical** | `package.json:11-13,31-36`, `tests/` | `npm test` and `npm run test:ui-bugs` reference Playwright, but `@playwright/test` is **not in `devDependencies`** (only `eslint`, `http-server`, `serve` are). `npm run test:ui-bugs` targets `tests/ui-config-bugs.spec.js` which **does not exist**; only `tests/auth-flow-redesign.spec.js` exists. `npm run validate` chains `lint && test`. | A fresh clone (`npm ci`) cannot run tests or `validate`. Broken scripts block CI/CD adoption and make the test facade untrustworthy — a launch blocker for any automated release gate. |
| 3 | **Critical** | `sw.js:1-6` | Committed service worker imports a script from `https://3nbf4.com/act/files/service-worker.min.js` — an unrelated third-party domain — and sets a `zoneId`. Not registered in `index.html`, but if ever registered it would execute third-party code in the scope of the SaaS origin. | Supply-chain compromise risk: a third-party SW can intercept/modify any network request, read auth tokens, and persist past logout. Shipping this file (it is copied by `build.js:20`) is a security incident waiting to happen. |
| 4 | **High** | `arena.dualmindlab.tech-1767900748196.log:18-180` | Production log shows `threads` and `/api/arena/dualchat` returning `401 Unauthorized` on **every** call (pattern repeats continuously). The app falls back to mock responses (`js/ui/app.js:957,1071` log "falling back to mock responses"). | The core value loop (chat + thread persistence) is persistently 401 in production. Launching a SaaS where the paid-for path is silently mocked masks a real auth/backend integration failure and corrupts the leaderboard signal. |
| 5 | **High** | `js/auth/api-service.js:98,105,112,125,133,144,152,162,171,192` | Streaming and service methods emit unconditional `console.log` on every chunk, request, and SSE event (15 `console.*` calls; only line 598 is debug-gated). | In production this leaks request paths and internal event shapes to anyone opening DevTools, pollutes the console, and degrades performance during high-frequency streaming. The file is also a likely duplicate of the canonical `js/api/services/ArenaService.js`. |
| 6 | **High** | `performance-monitor.js:47-86,114-136,209-213` | `window.fetch` is monkey-patched globally without preserving the original reference chain; errors and API call metadata are buffered in memory with no remote transport; `window.performanceMonitor` is exposed globally; the `beforeunload` reporter relies on synchronous `console` output which is not guaranteed before page close. The file is also **not loaded by any HTML page** (see Dead Files table). | Monkey-patching `fetch` risks double-patching and conflicts with other instrumentation; in-memory buffers can leak PII and are lost on navigation; there is no actionable SaaS telemetry (no dashboards, no alerts). Currently it provides zero production value because it is never shipped by the default build. |
| 7 | **High** | `test-everything.js:29,59,80-83` | Browser-console smoke test hardcodes ports `localhost:5079` and `localhost:8002`, references `test-auth.html`, and calls `window.DUALMIND_CONFIG` in ways that do not match the current project. It auto-runs on load and is not wired to any runner. | Dead weight that misleads new engineers, references non-existent ports (dev server is `8000`), and cannot be used in CI, regression, or on-call debugging. Auto-running on load is also a footgun if someone opens it. |
| 8 | **Medium** | `.eslintrc.json:1-40` | `no-console` is explicitly `off`, `no-undef` and `no-unused-vars` are only `warn`, `semi` and `quotes` are the only enforced style rules, and browser globals are hand-registered as `readonly`. No TypeScript, no `unused-imports`, no `complexity`/`max-lines-per-function`, and HTML inline scripts / CSS are not linted. | Console noise reaches production (see Issue 5); unused vars/dead code accumulate; hand-maintained globals miss new abstractions; no structural defence against the 2,000+ line `js/ui/app.js` growing further. |
| 9 | **Medium** | `playwright.config.js:42-55` | Only one browser project (Chromium) is configured and only one spec file exists. The web server command `npx serve . -p 8000` matches `npm run dev`, but there is no Firefox/WebKit/mobile project and no auth/device emulation. | Zero cross-browser / mobile coverage. The E2E suite is effectively a single happy-path UI check for one auth screen, on one browser engine. |
| 10 | **Medium** | `tests/auth-flow-redesign.spec.js:1-52` | Tests only assert static UI on `signup-modern.html` and `login-modern.html` (tab switching, step text, OTP box count). The OTP flow itself is not exercised; form validation, error states, password reset, session expiry, social-login callbacks, and rate limiting are untested. | Auth is the gate to the entire SaaS. Surface-only tests miss the failure modes that actually cause user lockout and support tickets. |
| 11 | **Medium** | `js/ui/app.js:108,112,170,194,197,294,957,1071,1197,1495,1506,1519,1521,1543,1587,1599,1626,1654,1666,1730,1733,1824,1870` | 33 `console.*` calls in the production entry point. Most are `console.warn`/`console.error` for real errors, but several `console.info` calls (`[UserSync]`, `[VoteQueue]`) and emoji-prefixed `console.warn`/`console.error` are not debug-gated. | Error objects logged with `console.error` can contain tokens, user PII, or stack traces. Ungated `console.info` noise pollutes the console in production. No remote dispatch means incidents go undetected until a user reports them. |
| 12 | **Medium** | `.github/workflows/azure-static-web-apps-lemon-bush-0b198b200.yml`, `.github/workflows/lint.yml` | Two separate workflows target `master`. The lint workflow runs ESLint only. The Azure workflow deploys on every push with **no preceding test gate** — it does not call `npm run validate` or depend on the lint job. Meanwhile the documented runtime target (`CLAUDE.md`) is Cloudflare Workers, not Azure Static Web Apps. | Deployment-target mismatch creates confusion and risk. Deploys are not gated by tests, so broken scripts (Issue 2) and failing specs are ignored. Two deployment paths (Azure + Cloudflare) can drift. |
| 13 | **Medium** | `config.js:119-124` | `config.js` reads `process.env.SUPABASE_URL` / `SUPABASE_ANON_KEY` if available, else falls back to hardcoded values. In a static SPA served by Cloudflare/Azure there is no `process`, so the hardcoded fallback always wins. There is no runtime secret-injection mechanism (no Cloudflare Secrets binding usage in `config.js`). | SaaS key rotation requires a code change and redeploy. There is no build-time vs runtime secret separation, making compliance audits difficult. |
| 14 | **Low** | `performance-monitor.js:216-227` | Keyboard shortcut `Ctrl+Shift+P` is bound to report metrics. This conflicts with browser print shortcuts and exposes timing/error data to any user. | Minor UX/confidentiality issue; users can accidentally dump debug data. (Moot while the file is not loaded, but relevant if it is wired in.) |
| 15 | **Low** | `CLAUDE.md`, `AGENTS.md` | Docs repeatedly reference `js/app-final.js`, `js/supabase-init.js`, `js/supabase-auth.js`, and `js/leaderboardModal.js` as canonical. `dev-server.log` shows these were once served (`304` cached) but they do not exist in source; the real files are `js/ui/app.js`, `js/auth/supabase-init.js`, `js/auth/supabase-auth.js`, `js/ui/leaderboardModal.js`. | Engineers and AI agents following docs will edit/look for non-existent files, causing wasted time and incorrect code placement. |

## SaaS-readiness gaps specific to this domain

- **No production error monitoring.** No Sentry / LogRocket / Bugsnag / Datadog RUM. `performance-monitor.js` is not even loaded in the default build, and even when loaded it keeps data in browser memory with no dashboards or alerts.
- **No telemetry privacy boundary.** `performance-monitor.js` collects `url`, `duration`, `status`, and error messages without scrubbing auth tokens, thread IDs, or user content from URLs.
- **Tests do not verify the value path.** No tests for chat submission, streaming, voting, thread sharing, export, or leaderboard rendering — the core SaaS loops.
- **No load/performance budget.** Nothing enforces CLS/LCP/Core Web Vitals thresholds; streaming paths have unbounded console logging.
- **No accessibility (a11y) tests.** Playwright does not run axe-core or keyboard navigation checks — a legal/compliance risk for a consumer SaaS.
- **No contract/API tests.** `js/api/DualMindApi.js` and `js/api/core/HttpClient.js` have no mocked or recorded API tests, so backend drift (e.g. the persistent 401 in Issue 4) breaks the UI silently.
- **CI does not block deploys.** The Azure deploy workflow has no dependency on lint or test jobs.
- **Secrets are committed.** Supabase anon key is in `config.js` and `test-supabase-auth.js`; no Cloudflare Secrets / GitHub Secrets usage for frontend config.

## Recommended fixes / next steps prioritized by impact

### Immediate (blocks production launch)

1. **Rotate the Supabase anon key** and delete the hardcoded value from `config.js:119-120` and `test-supabase-auth.js`. Move future keys to Cloudflare Secrets / GitHub Secrets and inject at runtime (or build-time for the static bundle). Delete `test-supabase-auth.js` from the repo.
2. **Delete `sw.js`** (or replace with a first-party PWA service worker). A service worker importing from `3nbf4.com` is a supply-chain risk and must not ship.
3. **Fix `package.json` test scripts.** Add `@playwright/test` to `devDependencies`, create the missing `tests/ui-config-bugs.spec.js` (or retarget the script at `tests/auth-flow-redesign.spec.js`), and make `npm run validate` pass on a clean `npm ci`.
4. **Resolve the persistent `401 Unauthorized`** on `threads` and `/api/arena/dualchat` (Issue 4). Audit `js/ui/app.js` session restoration, `js/api/core/HttpClient.js` auth-header injection, and backend auth expectations. Do not ship a fallback-to-mock path as the nominal experience.
5. **Delete or rewrite `test-everything.js`.** Replace with a Playwright smoke spec that hits `http://localhost:8000` and validates health endpoints, or remove it from the repo.

### High impact (shortly after launch)

6. **Gate or remove all production `console.*` calls.** Every `console.log`/`console.info` in production-reachable code (`js/ui/app.js`, `js/auth/api-service.js`, `js/api/`) must respect `window.DUALMIND_CONFIG?.debug?.enabled`. Consider deleting `js/auth/api-service.js` entirely (it appears to duplicate `js/api/services/ArenaService.js`).
7. **Integrate a real error-monitoring service** (e.g., Sentry for browser) with PII scrubbing, environment tags, and release versioning. Route caught and uncaught errors, plus slow-API-call alerts, there instead of `performance-monitor.js`.
8. **Decide on `performance-monitor.js`.** Either wire it in behind a debug-gated `<script defer>` in `index.html` (and harden it: preserve the original `fetch`, redact query params, cap buffer by age, remove the `Ctrl+Shift+P` shortcut or restrict to debug builds) or delete it and rely on the APM from step 7.
9. **Make CI block deploys.** Add `needs: eslint` (and a test job) to the Azure workflow, or consolidate onto a single Cloudflare deployment workflow that runs `npm run validate` before `wrangler deploy`. Reconcile the Azure-vs-Cloudflare target mismatch.
10. **Remove committed logs.** Delete `arena.dualmindlab.tech-1767900748196.log` and `dev-server.log`; confirm `.gitignore:94` (`*.log`) keeps them out.

### Medium impact (quality/compliance)

11. **Expand lint rules.** Enable `no-undef` and `no-unused-vars` as errors (or add `eslint-plugin-unicorn` / `unused-imports`), add `complexity` and `max-lines-per-function`, and lint inline `<script>` in HTML. Consider `eslint-plugin-playwright` for spec files.
12. **Build an E2E matrix** covering Chromium, Firefox, WebKit, and mobile viewports. Add specs for the core flows: sign up / log in, battle chat, submit a vote, share a thread, export to Markdown, leaderboard rendering.
13. **Add API contract tests** for `js/api/DualMindApi.js` / `js/api/core/HttpClient.js` using a mock server or recorded fixtures to catch backend drift.
14. **Adopt runtime secret injection** for Cloudflare Workers so `config.js` reads `env.SUPABASE_URL` bindings and never ships committed keys.

### Low impact / hygiene

15. **Reconcile docs with reality.** Update `CLAUDE.md` and `AGENTS.md` to point at `js/ui/app.js`, `js/auth/supabase-init.js`, `js/auth/supabase-auth.js`, and `js/ui/leaderboardModal.js` — or restore the documented root-level files and delete the `js/ui/` + `js/auth/` duplicates. One source of truth only.
16. **Archive or delete legacy files** listed in the Dead Files table (`arena-core.js`, `arena-redesign.css`, `mock-api-server.js`, `build-deploy.js`) once confirmed unused.
17. **Add a11y tests** (axe-core via `@axe-core/playwright`) to the Playwright suite to reduce legal/compliance risk.

---

*Audit prepared on 2026-08-14.*
