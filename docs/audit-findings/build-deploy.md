# Build, Deploy & Infrastructure Audit

**Analysis Date:** 2026-08-14

## Scope (files reviewed)

- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\package.json`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\build.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\build-deploy.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\wrangler.jsonc`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\wrangler-dist.toml`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\.wranglerignore`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\.github\workflows\azure-static-web-apps-lemon-bush-0b198b200.yml`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\.github\workflows\lint.yml`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\worker.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\sw.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\config.js`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\index.html`
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\deploy_build\**` (full tree)
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\dist\**` (cross-referenced build output)
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\next-dualmind\` (top-level directory tree)
- `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI\old-html-backup\` (top-level directory tree)

## Overview

The project is a vanilla-JS single-page app that is built into `dist/` and then served by a Cloudflare Worker (`worker.js`) using the Workers Assets binding (`wrangler.jsonc`). The app also proxies `/api/*` requests to a backend API and implements SPA routing for `/share/*`, clean URLs, and dynamic routes (`robots.txt`, `sitemap.xml`, `/og-image.png`).

The build/deploy domain is currently in an inconsistent, transitional state:

- **Two competing build scripts** live in the repo root: `build.js` (used by `npm run build`) and `build-deploy.js` (orphaned). Both write to `dist/` but copy different file sets. `build-deploy.js` references files that no longer exist (`terms.html`) and omits pages that the current app requires (`privacy/`, `cookies/`, `share/`, `forgot-password.html`, etc.).
- **Two competing Wrangler configs** exist: `wrangler.jsonc` (used by `npm run deploy`) and `wrangler-dist.toml` (referenced only by `build-deploy.js` and ignored in `.gitignore`).
- **Two competing CI/CD targets** exist: the `lint.yml` GitHub Action runs ESLint, but `azure-static-web-apps-lemon-bush-0b198b200.yml` deploys the repo root directly to **Azure Static Web Apps** on every push to `master`, even though the documented and configured runtime target is **Cloudflare Workers**.
- **A stale artifact directory**, `deploy_build/`, is gitignored but present. It contains outdated copies of top-level files such as `js/app-final.js`, `js/app.js`, `js/supabase-init.js`, and `js/leaderboardModal.js`, many of which no longer exist at root or have moved to `js/ui/` or `js/auth/`.
- **A full alternate Next.js project**, `next-dualmind/`, sits in the repo root, gitignored but unreferenced by the build.
- **Secrets are committed**: `config.js` contains a hardcoded Supabase anonymous key and the backend API URL is hardcoded in `worker.js` (root) and `deploy_build/worker.js` (different Azure URL).
- **Referenced assets are missing**: `og-image.png` is referenced by `index.html`/auth pages as `/assets/og-image.png` but does not exist in `assets/`, and `build.js` does not copy it there. `worker.js` only generates a placeholder at `/og-image.png`.

## Strengths

- `build.js` uses an explicit allow-list of files/folders, which prevents the 100k+ files in `node_modules/` and `next-dualmind/` from being copied into `dist/` (`build.js:8-43`).
- The Cloudflare Worker adds sensible security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) and cache-busting cache-control headers for HTML/JS/CSS/JSON vs images (`worker.js:221-238`).
- SPA routing for `/share/*` is explicitly implemented (`worker.js:73-98`).
- A custom 404 page is attempted (`worker.js:275-294`).
- `.wranglerignore` exists (even though it is incomplete), and `dist/`, `deploy_build/`, `.wrangler/`, and `next-dualmind/` are all gitignored.

## Dead / Unused / Duplicate Files

| File / Directory | Why it appears unused / duplicated | Confidence | Recommended action |
|------------------|------------------------------------|------------|-------------------|
| `build-deploy.js` | Alternate build script, not referenced by `package.json`. It conflicts with `build.js` by writing to the same `dist/` directory and copies a stale file list (`arena-core.js`, `arena-redesign.css`, `performance-monitor.js`, `admin-email-system`, etc.). | High | Delete. Make `build.js` the single source of truth. |
| `wrangler-dist.toml` | Gitignored (`.gitignore:109`). Referenced only by the orphaned `build-deploy.js:68`. It is a TOML duplicate of `wrangler.jsonc`. | High | Delete. |
| `deploy_build/` | Gitignored build artifact directory. Contains duplicates and stale files not in current source: `deploy_build/js/app-final.js`, `deploy_build/js/app.js`, `deploy_build/js/supabase-init.js`, `deploy_build/js/leaderboardModal.js`, etc. Not referenced by active build or deploy scripts. | High | Delete. |
| `next-dualmind/` | Full Next.js project directory. Gitignored and explicitly excluded by `build.js`, but present locally. Not part of the current static vanilla-JS app. | High | Move to a separate repo or delete. Do not keep it inside this project's workspace. |
| `old-html-backup/` | Committed directory of old HTML pages and a pre-refactor `app.js`. Not referenced by current pages or build scripts; only mentioned by the `lint` script as an ignore pattern. | High | Archive outside the repo or delete. |
| `about/about/index.html`, `careers/careers/index.html`, `how-it-works/how-it-works/index.html`, `login/login/index.html`, `login/login/redirect.html`, `login/login/style.css` | Nested duplicate route folders. The worker serves `/about/index.html` for `/about/`, so `/about/about/index.html` is unreachable. These are duplicated again in `dist/` and `deploy_build/`. | High | Delete the nested duplicate folders at source. |
| `arena-core.js` | Referenced only by the dead `build-deploy.js:28`. Not imported by any current HTML, JS, or CSS. | High | Delete or move to a feature archive if the N-model arena mode is planned. |
| `arena-redesign.css` | Referenced only by the dead `build-deploy.js:29`. Not loaded by `index.html` or any other page. | High | Delete if the redesign is abandoned. |
| `performance-monitor.js` | Referenced only by the dead `build-deploy.js:30`. Not imported anywhere in the current app (Grep found no HTML/JS references). | High | Delete or integrate intentionally if telemetry is required; do not leave orphaned. |
| `js/api-client.js` | Deprecated client. Imports `/js/supabase-auth.js` which does not exist at that path (the real file is `js/auth/supabase-auth.js`). Not imported by the current entry point or components. | High | Delete; the canonical API is `js/apiInstance.js` / `js/api/DualMindApi.js`. |
| `js/auth.js` | Custom `AuthService` using `localStorage`. Not referenced by any current HTML or JS file; superseded by `js/auth/supabase-auth.js`. | High | Delete. |
| `js/leaderboardModal.js` (in `deploy_build/`) | Exists only in the stale `deploy_build/` tree. The current code uses `js/ui/leaderboardModal.js`, imported by `js/ui/app.js:1863`. | High | Delete with `deploy_build/`. |
| `js/app-final.js` (in `deploy_build/`) | Stale copy in `deploy_build/`. The current entry point is `js/ui/app.js` (`index.html:184`). | High | Delete with `deploy_build/`. |
| `auth-verify.html` | Copied by `build.js:11` but no current page links to it, and it is not used as an auth entry point (`auth-callback.html`, `login-modern.html`, `signup-modern.html`, `forgot-password.html`, and `update-password.html` are the active auth pages). | Medium | Verify whether this page is still needed for email verification flows; if not, delete and remove from `build.js`. |
| `verify.html` | A setup-verification page. Not linked from any production page; only references `js/ui/app.js` in an internal checklist. | Medium | Keep if used during onboarding/setup, otherwise delete. |
| `dist/` | Expected build output. Gitignored. It is the only artifact consumed by `wrangler deploy`, but it should never be committed. | N/A | Keep as a generated directory; ensure CI rebuilds it from scratch each deploy. |
| `terms.html` (missing file referenced by `build.js`) | `build.js:21` includes `'terms.html'` but the file does not exist at root; `signup-modern.html:150` links to flat `terms.html`, which is also broken because the real terms page is `terms/index.html`. | High | Remove `'terms.html'` from `build.js` and fix links to `/terms/`. |
| `og-image.png` / `assets/og-image.png` | Referenced in `index.html`, auth pages, and `leaderboard/index.html` as `/assets/og-image.png`, but `assets/og-image.png` does not exist and `build.js` does not copy it there. `worker.js:194-203` only generates a placeholder at `/og-image.png`. | High | Add a real `assets/og-image.png` or change meta tags to `/og-image.png`. |

## Issues List

| # | Severity | File(s) | Description | Why it matters for a SaaS product |
|---|----------|---------|-------------|-----------------------------------|
| 1 | **Critical** | `build-deploy.js` (entire file), `wrangler-dist.toml` | Two build scripts and two Wrangler configs exist for the same `dist/` target. `build-deploy.js` copies a stale file list and omits required pages (`privacy/`, `cookies/`, `share/`, `forgot-password.html`, `signup-modern.html`, etc.). Running it would produce a broken deployment. | Inconsistent build tooling is a launch blocker. Any engineer running the wrong script publishes a non-functional site. It also makes rollbacks and build reproducibility impossible. |
| 2 | **Critical** | `package.json:11-16`, `package.json:31-35`, `.gitignore:11` | `npm run deploy` depends on `npx wrangler`, and `npm test` depends on Playwright, but neither `wrangler` nor `@playwright/test` is declared in `devDependencies`. `package-lock.json` is gitignored and absent from the repo. | A fresh clone cannot run `npm ci`, `npm test`, or `npm run deploy`. CI/CD is non-deterministic and will fail. This blocks automated release gates. |
| 3 | **Critical** | `.github\workflows\azure-static-web-apps-lemon-bush-0b198b200.yml` | Azure Static Web Apps deploys on every push to `master` without running tests or `build.js`. The project's documented runtime target is Cloudflare Workers (`wrangler.jsonc`). | The repo has two live deployment targets that can overwrite each other. Deploying without tests means broken scripts and stale artifacts can reach production. If Azure is still active, it leaks control-plane surface for an unmaintained target. |
| 4 | **High** | `config.js:119-122` | Hardcoded Supabase anonymous key and project URL are committed directly to the source file that ships to every browser. | Even "anon" keys gate API quotas and provider configuration. Rotating the key requires a code change and redeploy. In a SaaS, secrets must be injected at runtime (Cloudflare Secrets, GitHub Secrets, or build-time env vars), never committed. |
| 5 | **High** | `worker.js:24-36`, `worker.js:56-57`, `deploy_build/worker.js:24-36` | `worker.js` logs every `/api/*` request path and backend response status unconditionally with `console.log`, and dumps full error objects on backend failures. | Production edge logs become a noisy, potentially sensitive data leak. Logged paths/headers can expose user behavior, and full error payloads may include tokens or PII. All production logging must be opt-in via debug flags. |
| 6 | **High** | `worker.js:7-10` | CORS preflight and proxied responses use `Access-Control-Allow-Origin: '*'` for all API responses. | Wide-open CORS on an authenticated API increases cross-site request risk and is inconsistent with the SaaS's own domain. Origins should be restricted to the production domain(s) and staging domains. |
| 7 | **High** | `worker.js:26`, `deploy_build/worker.js:26`, `config.js:9`, `config.js:119-122` | Backend URL and Supabase credentials are hardcoded in multiple places. Root `worker.js` defaults to `https://api.dualmindlab.tech` while `deploy_build/worker.js` points to a different Azure URL. | Environment drift means the same commit can behave differently depending on which worker/artifact is deployed. There is no staging/prod separation or runtime configuration. |
| 8 | **High** | `index.html:19,26`, `login-modern.html`, `signup-modern.html`, `leaderboard/index.html` (meta tags); `build.js:16`; `assets/og-image.png` (missing) | Social/OpenGraph meta tags reference `https://arena.dualmindlab.tech/assets/og-image.png`, but `assets/og-image.png` does not exist and `build.js` does not create it. `worker.js` only serves a 1x1 placeholder at `/og-image.png`. | Shared links on social platforms will render with a missing image, degrading brand credibility and click-through. Broken asset references are a SaaS marketing/reliability issue. |
| 9 | **High** | `signup-modern.html:150` | The signup page links to flat `terms.html` and `privacy.html` files, but those files do not exist; the real legal pages are at `/terms/index.html` and `/privacy/index.html`. | Broken legal links can violate consumer-protection and ToS display requirements, and they create a poor first-run experience that undermines trust. |
| 10 | **Medium** | `sw.js` (entire file), `build.js:20` | `sw.js` is copied into `dist/` but never registered in `index.html`. It imports a third-party script from `https://3nbf4.com/act/files/service-worker.min.js`. | If this service worker is ever registered, it executes arbitrary third-party code with the origin's privileges. That is a severe supply-chain risk. The file should not be deployed unless it is a first-party, audited service worker. |
| 11 | **Medium** | `build.js:8-25` | The allow-list references files that do not exist (`og-image.png`, `terms.html`) and omits some current source files (e.g., `js/ui/utils.js` is included via the `js/` folder copy, but the root-level `terms.html` copy will silently fail). `auth-verify.html` is copied despite being unlinked. | Silent build failures produce incomplete or confusing artifacts. A build script should validate that every allow-listed file exists and warn/fail on mismatch. |
| 12 | **Medium** | `deploy_build/`, `.github\workflows\azure-static-web-apps-lemon-bush-0b198b200.yml` | `deploy_build/` contains stale duplicates of `js/app-final.js`, `js/app.js`, `js/supabase-init.js`, and other files. Although gitignored, the Azure workflow deploys the repo root as static assets; if `deploy_build/` were accidentally present in CI (e.g., cached), it could be served publicly. | Stale artifacts widen the attack surface, confuse search engines, and can expose old code paths or endpoints. They also bloat the workspace. |
| 13 | **Medium** | `next-dualmind/` | A complete Next.js project lives in the repo root. It is gitignored and not copied by `build.js`, but it inflates the workspace and can be mistaken for source code. | Keeping an abandoned framework implementation in the project root is a maintainability hazard. It also increases the risk of accidental imports or path confusion. |
| 14 | **Medium** | `.wranglerignore:12-14` | `.wranglerignore` explicitly lists `package.json`, `package-lock.json`, and `wrangler.jsonc`. | These are config files, not assets, so they should not be in `.wranglerignore` at all; the file's purpose is to exclude files from the Workers Assets upload. It also fails to exclude other sensitive/non-asset paths robustly. |
| 15 | **Medium** | `worker.js:267-269` | When serving `index.html` for directory/clean URLs, the worker does not set the same `cache-control: no-store, ...` headers used elsewhere for HTML/JS/CSS/JSON. | A stale `index.html` can be cached by a CDN or browser after a deployment, causing users to load outdated app shells and assets. |
| 16 | **Low** | `login/login/index.html`, `login/login/redirect.html`, `login/login/style.css` | Duplicate nested routes exist alongside `login/index.html`. They are unreachable under normal worker routing. | Unreachable duplicates are harmless but add noise and risk of being linked accidentally or indexed. Clean them up. |
| 17 | **Low** | `ads.txt:1` | `ads.txt` exists and is served by `worker.js:206-213`. It is hardcoded and references a specific Google publisher ID, but there is no evidence it is intentionally managed. | If the publisher ID is valid for this product, document ownership. If not, serving it exposes an unrelated or stale ad configuration. |

## SaaS-readiness gaps specific to this domain

- **No reproducible builds.** `package-lock.json` is ignored and absent, dependencies are not pinned, and `npx wrangler`/Playwright are not declared in `devDependencies`.
- **No single deployment target.** Azure Static Web Apps and Cloudflare Workers are both configured; only one can be the source of truth for a production SaaS.
- **No staged environments.** `wrangler.jsonc` only declares one service (`dualmind-arena`) and no `env` blocks for staging/review. `config.js` and `worker.js` hardcode production URLs.
- **No pre-deploy verification.** Neither CI workflow runs `npm run build`, `npm run lint`, or a smoke test before publishing. Broken builds and missing assets can ship to users.
- **Secrets committed in shipped code.** `config.js` and `deploy_build/config.js` contain the Supabase anon key, and `worker.js` embeds the backend hostname.
- **Production logging and insecure CORS in the edge worker.** Every API call is logged unconditionally, and CORS is unrestricted.
- **No CSP or modern security headers.** The worker sets `X-Frame-Options` and `X-XSS-Protection` but does not send a `Content-Security-Policy`, `Referrer-Policy`, or `Permissions-Policy`.
- **Third-party code in service worker.** `sw.js` imports a remote script from an ad/push network, creating a supply-chain risk if registered.
- **Stale artifacts in the repo.** `deploy_build/`, `old-html-backup/`, `next-dualmind/`, and multiple top-level dead files slow onboarding and increase the chance of serving wrong code.

## Recommended fixes / next steps prioritized by impact

### Immediate (blocks production launch)

1. **Delete the duplicate build/deploy pipeline.** Remove `build-deploy.js` and `wrangler-dist.toml`, and make `build.js` the single, canonical build script.
2. **Fix `package.json` dependencies and the lockfile.** Add `wrangler` and `@playwright/test` to `devDependencies`, remove `package-lock.json` from `.gitignore`, and commit a lockfile. If those tools are not needed, remove the scripts that reference them.
3. **Align CI/CD on Cloudflare Workers.** Disable or delete `.github/workflows/azure-static-web-apps-lemon-bush-0b198b200.yml`. Replace it with a single workflow that installs deps, runs lint, runs tests, runs `npm run build`, and then runs `npx wrangler deploy` only on `master`.
4. **Stop committing secrets.** Move the Supabase URL and anon key out of `config.js`. Inject them at runtime via Cloudflare Worker secrets / environment variables and expose them to the browser through a safe endpoint or build-time substitution in CI. Rotate the current key.
5. **Fix broken asset and legal links.** Add a real `assets/og-image.png` (or change meta tags to `/og-image.png`), update `signup-modern.html:150` to link to `/terms/` and `/privacy/`, and remove the stale `terms.html` entry from `build.js:21`.

### High impact (shortly after launch)

6. **Harden `worker.js`.**
   - Replace unconditional `console.log`/`console.error` with a debug-flag-gated logger.
   - Restrict `Access-Control-Allow-Origin` to the production and staging domains instead of `*`.
   - Add CSP, `Referrer-Policy`, and `Permissions-Policy` headers.
   - Ensure fallback `index.html` responses receive the same `cache-control: no-store` directive.
   - Make `BACKEND_URL` (and other hostnames) a Worker environment variable/secrets binding rather than a hardcoded fallback.
7. **Clean up stale artifacts.** Delete `deploy_build/`, `old-html-backup/`, `next-dualmind/`, `arena-core.js`, `arena-redesign.css`, `performance-monitor.js`, `js/api-client.js`, `js/auth.js`, and the nested duplicate route folders (`about/about/`, `careers/careers/`, `how-it-works/how-it-works/`, `login/login/`).
8. **Audit or remove `sw.js`.** Do not deploy a service worker that imports a remote third-party script. If a service worker is needed, write a first-party one with a strict scope. If not needed, remove it from `build.js:20` and `dist/`.
9. **Add build-time validation.** Make `build.js` fail when an allow-listed file is missing, and assert that every `<script src="...">`, `<link href="...">`, and meta tag asset resolves inside the source tree before copying to `dist/`.
10. **Introduce staging and preview environments.** Use Wrangler environments (`[env.staging]`, `[env.production]`) and only deploy production from `master` after tests pass.

### Medium impact (quality / compliance)

11. **Rewrite `.wranglerignore` to exclude only actual asset-side noise** (e.g., source maps, IDE folders, logs) and remove `package.json`/`wrangler.jsonc` from it.
12. **Document the canonical source-of-truth file paths.** Update `CLAUDE.md` and any architecture docs to reflect that the current entry point is `js/ui/app.js` (not `js/app-final.js`) and that auth files live under `js/auth/`, not the top-level `js/`.
13. **Add a deploy smoke test** that fetches the deployed Cloudflare Worker root, checks key routes (`/`, `/share/`, `/robots.txt`, `/sitemap.xml`, `/assets/og-image.png`), and verifies the `/api/health` proxy returns the expected backend response.

---

*Audit prepared on 2026-08-14.*
