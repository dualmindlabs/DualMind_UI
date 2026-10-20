# Changelog

All notable changes to the DualMind Arena web app are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project has no tagged releases yet, so changes are grouped by month (newest first). Entries before October 2026 were reconstructed from the git history.

## [Unreleased]

### Added

- The effects library (redesign slice S2b) in `web/src/components/vendor/`: 27 free components from React Bits (Light Rays, Silk, Blur Text, Decrypted Text, Count Up, Shiny Text, Text Type, Spotlight Card, Star Border, Electric Border, Magnet, Logo Loop, Fuzzy Text), Magic UI (Border Beam, Shine Border, Animated Beam, Blur Fade, Marquee, Number Ticker), Motion Primitives (Text Shimmer, Animated Background, Sliding Number, Border Trail) and Aceternity UI's free tier (Placeholders And Vanish Input, Glowing Effect, Bento Grid, Timeline), each with its licence file and a header naming the source and our changes. All are ported to the design tokens, have a reduced-motion version and keep text available to screen readers. Motion wrappers in `web/src/components/motion/`: `WebGLGate` (static poster on the server and for reduced motion, Save-Data, low memory, touch-first small screens or no WebGL2; lazy loading, pausing off-screen, pixel ratio capped at 1.5), `MotionSafe`, `ReducedMotionScope`, `Reveal`, `MotionProvider` (LazyMotion) and motion presets from the tokens. `/design/` gains section 07, a gallery of every effect with its source and licence and a reduced-motion preview switch. The "Built with" credits are typed data in `web/src/content/credits.ts`. `web.yml` adds a bundle report and fails if the WebGL effects or Motion's features stop being lazy chunks.
- Typed API client for the web app (redesign slice S5), in `web/src/lib/api/`: one function per endpoint (health, models, battle, chat, chat stream, vote, leaderboard, threads, shared threads, user sync, text to speech, feature flags) calling same-origin `/api/*`; Zod 4 schemas that normalise the API's duplicate camelCase/snake_case fields, `{ items }` envelopes, numeric strings and nulls; one `ApiError` model with ten kinds that reads every error body shape (arena `ai.error`, `{ success: false }`, the Worker's 502/504, ASP.NET ProblemDetails, empty bodies) and a user-facing message helper; `x-request-id` on every call; per-endpoint timeouts and abort signals; retries only for `GET` (two, with backoff, jitter and `Retry-After`), never for battles, chats or votes; an SSE parser for the chat stream; an offline vote queue (`dm.voteQueue.v1`) flushed on reconnect; a mock adapter with recorded fixtures and error scenarios for tests, Playwright and a demo mode (`VITE_API_MOCK=1`); TanStack Query defaults, query keys and query/mutation builders. Text to speech now calls the real route `POST /api/speech/generate` (KNOWN_ISSUES #7). `VITE_API_BASE_URL` and `VITE_API_MOCK` are new build variables (`web/src/config/api.ts`). The unit tests report the API layer's coverage in the `web.yml` job summary.
- Worker hygiene (redesign slice S1b): security headers on every response (HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP, X-Frame-Options); an enforced Content-Security-Policy for the web app's pages with sha256 hashes of their inline scripts (computed by `build.js` into `dist/__web-manifest.json`) and a report-only policy for the legacy pages; Cache-Control and legacy redirects as tables in `server/caching.js` and `server/redirects.js` (`/index.html`, the duplicated about and how-it-works folders, `/careers`, `/auth-verify.html` and `/verify.html`, all 301 with the query kept); Dependabot for `web/`.

- The new Arena frontend in `web/` (redesign slice S1): React 19, React Router 8 in framework mode (`ssr: false`, `/design/` prerendered), Vite 8, TypeScript strict and Tailwind CSS 4, with a feature-based `src/` layout and a README per folder. Design tokens for dark and light in `web/src/styles/tokens.css` (contrast checked in tests), self-hosted fonts, a System/Dark/Light theme without a flash, and `useReducedMotion()`. The first page is `/design/`, a living style guide (not indexed).
- `build.js` composes `dist/` from the legacy files and the web build, and fails on a missing legacy file or sitemap URL, a web file that would replace a legacy one, or an unhashed build file. `.node-version` pins Node 22.
- The worker caches the web app's hashed `/assets/*` files for a year, sends `X-Robots-Tag: noindex` for `/design/`, and can answer client-only routes with the SPA fallback page (`server/routing.js`).
- `web.yml` workflow: typecheck, ESLint, Prettier, Vitest (unit and worker tests), then Playwright against the composed site served by the real worker in `wrangler dev`, with axe in both themes and screenshots (`web-screenshots` artifact). `web-lockfile.yml` resolves `web/package-lock.json` in CI.
- `docs/architecture.md` and architecture decision records in `docs/adr/`.

- Redesigned waitlist page at `early.dualmindlab.tech`, rebuilt as a prerendered Vite + React + Tailwind app in `waitlist-worker/`: a headline reveal, crossing WebGL spotlights, a hands-on demo battle, the live top five from the public leaderboard API and a marquee of the Arena's models, using React Bits and Magic UI components. A `Waitlist page` workflow builds it, runs Playwright tests and uploads desktop and mobile screenshots.
- Real waitlist signups: the waitlist worker answers `POST /api/signup` and stores emails in the Cloudflare D1 database `dualmind-waitlist` (schema in `waitlist-worker/migrations/`), with email validation, a honeypot field, a 2 KB body limit, a same-origin check and a per-IP rate limit. Until now the page only saved emails in the visitor's own browser, so none reached the team; the form now offers to send such an old local signup for real.
- `deploy-waitlist.yml` workflow: applies D1 migrations and deploys the waitlist worker on pushes to `master` that touch `waitlist-worker/`, or by hand. Needs the `CLOUDFLARE_API_TOKEN` secret.
- `LICENSE` (proprietary, all rights reserved), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, `SUPPORT.md` and this changelog.
- GitHub issue forms for bug reports and feature requests, a pull request template, `CODEOWNERS` and a Dependabot configuration for npm and GitHub Actions.

### Changed

- The `/api/*` proxy forwards only `Authorization`, `Content-Type`, `Accept`, `Accept-Language` and `X-Request-Id` (generated when missing and echoed on the response), sends no CORS headers, answers upstream failures with `502`/`504` JSON (`bad_gateway`, `gateway_timeout`) instead of the error text, times out after 30 s except for event streams, and no longer adds `x-dualmind-proxy-*` headers. The blanket CORS answer to every `OPTIONS` request is gone. `X-XSS-Protection` is no longer sent.

- CI builds on Node 22 (`.node-version`), because `build.js` now builds the web app. The root ESLint config ignores `web/` and `dist/`.

- `build.js` no longer copies `waitlist.html` into `dist/` or into the waitlist worker, and the old single-file `waitlist.html` is removed.
- Rewrote `README.md` with architecture, setup, configuration, deployment and related-project sections.
- `package.json` now declares the package as `UNLICENSED` to match the proprietary license.
- ESLint upgraded from 8 to 10. `.eslintrc.json` is replaced by a flat config, `eslint.config.mjs`, with the same rules; ESLint 10's new `no-useless-assignment` rule reports warnings.
- The arena worker now redirects every request on `arena.dualmindlab.tech` (all paths and methods, including `/`, `/leaderboard/` and `/api/*`) to the waitlist with a 302, behind a single `FORCE_WAITLIST` constant in `worker.js`. `assets.run_worker_first` is on so pages that exist as static files are covered too. A `?preview=dualmind-preview` link sets a 30-day `dm_preview` cookie that skips the redirect; `?preview=off` clears it.

## 2026-08 (August 2026)

### Added

- Pre-launch waitlist page with an animated shader background, and a standalone `dualmind-waitlist` worker (`waitlist-worker/`) that serves it with traffic logging. Later redesigned in full.
- Cloudflare Flagship feature-flag binding (`FLAGS`) and the `arena.dualmindlab.tech` route on the `dualmind-arena` worker; `workers_dev` enabled.
- GitHub Actions CI pipeline that installs with pnpm, lints and builds, and uploads `dist/` as an artifact.
- `AGENTS.md` contributor guide and codebase audit documents in `docs/`.
- Root `.gitignore` covering dependencies, build output, env files and editor files.

### Changed

- The arena worker now redirects all non-API traffic to the waitlist at `early.dualmindlab.tech`, keeping query strings such as UTM parameters.
- The front-end points at `api.dualmindlab.tech`; core icons modernised.
- `config.js` defaults now point at the production Supabase project.
- CI consolidated into a single pnpm build-and-lint workflow.

### Fixed

- Cloudflare deploy: `_worker.js` is no longer copied into `dist/`.
- `pnpm-lock.yaml` re-synced with `package.json` so CI installs succeed.
- Lint errors in the waitlist worker.

### Removed

- Dead prototypes (React and Next.js demos), archived HTML, the old admin email panel and the Azure Static Web Apps workflow.

## 2026-06 (June 2026)

### Added

- Custom 404 page with matching routing in the Cloudflare worker.
- Open Graph and Twitter card meta tags on all public pages.
- Loading skeletons for the leaderboard and battle view.
- ESLint workflow on pushes and pull requests.

### Changed

- The leaderboard modal is lazy-loaded and non-critical scripts are deferred.
- Reorganised `js/` into `auth`, `api` and `ui` modules.
- Rewrote the README with an overview, architecture and setup instructions.
- Expanded `.gitignore` for env files, `dist/`, local configs and OS files.

### Fixed

- Stronger input sanitisation and XSS protection across the chat input components.

### Security

- Hard-coded Supabase credentials moved out of `config.js`.

### Removed

- Debug files, test artifacts and scratch documents.

## 2026-05 (May 2026)

### Added

- "Resend verification email" flow on the auth pages.

### Changed

- Cleaned up the auth UI wiring.

## 2026-03 (March 2026)

### Added

- Redesigned authentication flow (sign-up, sign-in, callbacks).
- Welcome emails on sign-up and an upgraded tester mode with role-based UI.
- Elo explanation in the chat UI and a redesigned leaderboard.
- `wrangler.jsonc` and `build.js` for deploying as a Cloudflare Worker with static assets.
- `ads.txt` and an ad-network verification meta tag.

### Removed

- `dist/` from version control.

## 2026-02 (February 2026)

### Added

- Custom modal and toast components, new logo and refreshed auth styles.
- Azure Static Web Apps workflow (removed again in August).

### Changed

- Design refresh and functional fixes across the UI (#4), including container-level event delegation for model selectors.
- Production API URL and worker backend updated.

### Fixed

- XSS protection in the chat input.

## 2026-01 (January 2026)

### Added

- Thread sharing with public share links and a `/share/*` route in the worker.
- Responsive layout, web-search and code-mode toggles in the chat input.
- Complete sitemap with dynamic domain handling.
- Google Indexing API integration, web app manifest and a performance monitor.

### Changed

- New UI and design system update (#3), with layout, animation and text rendering fixes.
- Chat interface and input centring updates.
- The UI points at `api.dualmindlab.tech`, with steadier health and offline handling.

### Fixed

- Supabase auth token handling, thread list refresh and the production API base URL.
- `DualMindAuthReady` promise so the app no longer falls back to guest mode before auth has loaded.

## 2025-12 (December 2025)

### Added

- Initial DualMind Arena UI.
- Markdown and math rendering in responses (#1).
- Cloudflare deployment with a worker that serves assets and proxies the API.
- `sitemap.xml`, `robots.txt` and SEO metadata.
- Admin email panel (removed in August 2026).

### Fixed

- Worker asset fallback, CSS paths and caching behaviour.
