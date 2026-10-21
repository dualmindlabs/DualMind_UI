# DualMind Arena web app

The new Arena frontend: React 19 + React Router 8 (framework mode, prerendered) + Vite + TypeScript + Tailwind CSS 4. It grows page by page next to the legacy static site; both are composed into one `dist/` and served by the `dualmind-arena` Worker. Architecture: [docs/architecture.md](../docs/architecture.md). Plan: [docs/redesign/migration-plan.md](../docs/redesign/migration-plan.md).

Today it serves **`/`**, the landing page for signed-out visitors (signed-in visitors are handed to the legacy arena at `/legacy-app.html` until the arena slice; see [docs/architecture.md](../docs/architecture.md), section 3); **`/design/`**, the living style guide (not indexed by search engines), including the effects gallery (section 07): every vendored effect with its source, licence and reduced-motion version; **`/leaderboard/`**, the live rankings from the public model-stats API (no sign-in); and **`/models/`**, the model directory on the same data.

## Commands

Node 22.22 or newer (see `../.node-version`). Run them in `web/`.

| Command                                   | What it does                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm ci`                                  | Install the exact dependencies from `package-lock.json`                                        |
| `npm run dev`                             | Dev server with hot reload (`react-router dev`), http://localhost:5173/                        |
| `npm run build`                           | Production build into `build/client` (prerenders `/`, `/design/`, `/leaderboard/`, `/models/`) |
| `npm run typecheck`                       | Generate route types and run `tsc`                                                             |
| `npm run lint` / `npm run lint:fix`       | ESLint (type-aware), with or without fixes                                                     |
| `npm run format` / `npm run format:check` | Prettier, with the Tailwind class sorter                                                       |
| `npm test`                                | Vitest: unit tests (`tests/unit`) and Worker tests (`tests/worker`)                            |
| `npm run test:e2e`                        | Playwright against the composed site; run `node build.js` at the repo root first               |
| `npm run check`                           | typecheck + lint + format check + tests                                                        |

On a small machine, skip all of this: push the branch and let GitHub Actions run it (see below).

## Structure

```text
web/
├── src/
│   ├── app/            # root.tsx, routes.ts (the route table) and routes/ (one thin module per URL)
│   ├── features/       # one folder per domain; design-system/ today; import through index.ts
│   ├── components/     # ui/ primitives, layout/ shell, motion/ wrappers (WebGLGate...), vendor/ effects
│   ├── hooks/          # use-theme, use-reduced-motion
│   ├── lib/            # utils/ (cn, contrast, css-color), theme/, motion/ (WebGL policy), api/ (S5), supabase/ (S6)
│   ├── content/        # typed data shared by features: credits.ts ("Built with")
│   ├── styles/         # tokens.css (the token source), base.css, effects.css, app.css, tokens.ts
│   ├── config/         # env.ts: typed, validated VITE_ variables
│   └── types/          # env.d.ts
├── public/             # favicon.svg
├── tests/
│   ├── unit/           # Vitest + Testing Library (jsdom); mirrors src/
│   ├── worker/         # Vitest in Node: ../worker.js with a fake ASSETS binding
│   └── e2e/            # Playwright: the composed dist/ through the real Worker in wrangler dev
├── react-router.config.ts   # ssr: false + the prerender list
├── vite.config.ts · vitest.config.ts · playwright.config.ts · eslint.config.mjs · tsconfig.json
└── package.json · package-lock.json
```

Each folder in `src/` has a README with its rules. The short version: kebab-case files, one component per file, named exports (only route modules export a default), the `@/` alias for `src/`, features imported only through their `index.ts`, colours and sizes only through the token utilities.

## How the composed build works

`node build.js` at the repo root (also `npm run build` / `pnpm build` there) is what Cloudflare Workers Builds runs:

1. `npm ci` and `npm run build` in `web/` (skip with `SKIP_WEB_BUILD=1` when it is built already).
2. Copy the legacy allowlist into `dist/`.
3. Copy the legacy `index.html` to `dist/legacy-app.html`, then copy `web/build/client` on top: the landing page as `index.html`, `leaderboard/index.html` and `models/index.html` (these three replace the legacy pages, listed in `replacedByWeb`), `design/index.html`, hashed files into `dist/assets/`, `og/`, `favicon.svg` and React Router's SPA fallback, `__spa-fallback.html`.
4. Fail if a legacy file or a sitemap URL is missing, a web file would replace a legacy one, or a file in `assets/` has no content hash.

The Worker (`../worker.js`, helpers in `../server/routing.js`) caches `/assets/<name>-<hash>.<ext>` for a year and keeps every legacy header as it was. The waitlist gate applies to these pages too: open them with `?preview=dualmind-preview` once.

## Moving a page to the web app

1. Add a feature folder (`src/features/<name>/` with an `index.ts`) and a route module in `src/app/routes/`.
2. Add the URL to `src/app/routes.ts`, and to `prerender` in `react-router.config.ts` if it is a public page.
3. If it replaces a legacy file, add that file to `replacedByWeb` in `../build.js` and drop it from the legacy allowlist.
4. Client-only routes (no prerender) also go into `SPA_FALLBACK_ROUTES` in `../server/routing.js`.
5. Add unit tests, e2e checks and screenshots for the page.

## CI, screenshots and the preview

- **`.github/workflows/web.yml`** runs on every PR that touches `web/`, the Worker or the build: the check job (typecheck, lint, format, Vitest) and the e2e job (`node build.js`, a bundle report that also fails if the WebGL effects or Motion's features stop being separate lazy chunks, `wrangler dev`, Playwright with axe in both themes and an overflow check at 320 px).
- **Lighthouse:** the e2e job runs Lighthouse CI on `/` (mobile, median of three runs) with the budgets in `lighthouserc.json` (accessibility 100, best practices 95 and SEO 100 fail the job; performance 90 warns for now) and uploads the reports as `lighthouse`; the scores are in the job summary. It also warns when `/` loads more than 180 KB of gzipped JavaScript up front.
- **Screenshots:** the e2e job uploads `web-screenshots` (`/` as `landing-*.png`, the demo after the reveal as `landing-demo-revealed-*.png` and the Open Graph card as `og-landing.png`, the source of `public/og/landing.png`; `/design/` at 1440x900 and 390x844, dark, light and reduced motion, above the fold and full page, plus the effects gallery as `effects-*.png` with a close-up of the WebGL frames as `effects-*-webgl.png`; `/leaderboard/` and `/models/` the same way as `leaderboard-*.png` and `models-*.png`, with the details sheet and drawer open, on recorded live data). Download them with `gh run download <run-id> -n web-screenshots`.
- **Autofix:** when formatting or a fixable lint rule fails, the check job uploads `web-autofix` with a patch (`git apply web-autofix.patch`).
- **Lockfile without a local install:** `.github/workflows/web-lockfile.yml` runs on PRs that change `package.json` and uploads `web-lockfile` (the resolved `package-lock.json` plus an autofix patch).
- **Live preview:** the `Workers Builds: dualmind-arena` check on the PR links a preview alias URL; add `/design/?preview=dualmind-preview`.

## Configuration

Build-time values come from `VITE_` variables (`src/config/env.ts`); placeholders are in `.env.example`, local overrides go in `.env.local` (git-ignored). Public values only, never a secret.
