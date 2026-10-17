# Changelog

All notable changes to the DualMind Arena web app are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project has no tagged releases yet, so changes are grouped by month (newest first). Entries before October 2026 were reconstructed from the git history.

## [Unreleased]

### Added

- `LICENSE` (proprietary, all rights reserved), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, `SUPPORT.md` and this changelog.
- GitHub issue forms for bug reports and feature requests, a pull request template, `CODEOWNERS` and a Dependabot configuration for npm and GitHub Actions.

### Changed

- Rewrote `README.md` with architecture, setup, configuration, deployment and related-project sections.
- `package.json` now declares the package as `UNLICENSED` to match the proprietary license.

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
