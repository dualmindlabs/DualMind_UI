# Architecture

How the DualMind Arena frontend is built, served and organised while it moves from static HTML and vanilla JavaScript to a React app, page by page. The plan and its slices are in [docs/redesign/migration-plan.md](./redesign/migration-plan.md); the decisions behind this setup are recorded as [ADRs](./adr/README.md).

---

## 1. The big picture

```text
                       arena.dualmindlab.tech (Cloudflare)
                                    │
                         ┌──────────▼──────────┐
                         │  worker.js           │  dualmind-arena Worker, run_worker_first
                         │  1. waitlist gate     │  FORCE_WAITLIST + ?preview= cookie
                         │  2. /api/* proxy      │  -> api.dualmindlab.tech (server/api-proxy.js)
                         │  3. redirects         │  table in server/redirects.js
                         │  4. SPA fallback      │  client-only routes (server/routing.js)
                         │  5. static assets     │  env.ASSETS = dist/, server/caching.js
                         │  + security headers   │  every response; CSP for HTML
                         └──────────┬──────────┘
                                    │
                    dist/ (composed by build.js at build time)
          ┌─────────────────────────┴─────────────────────────┐
   legacy files (repo root)                         web/build/client (React app)
   index.html, leaderboard/, about/,               design/index.html (prerendered),
   js/, css/, components/, assets/*.png ...        assets/<name>-<hash>.js|css|woff2,
                                                    __spa-fallback.html, favicon.svg
```

- **One Worker, one `dist/`.** Old and new pages live side by side. Each slice moves some URLs to the React app; the others keep serving the legacy files until their slice lands (strangler migration, [ADR 0002](./adr/0002-strangler-migration-composed-dist.md)).
- **Static output only.** The React app uses React Router in framework mode with `ssr: false`: listed pages are prerendered to HTML at build time and hydrate in the browser; client-only routes use the SPA fallback page. There is no server rendering at request time ([ADR 0001](./adr/0001-react-vite-react-router-framework-mode.md)).
- **Pages the web app serves today** (the route table is `web/src/app/routes.ts`; every other URL is still a legacy file):

  | URL | Route module | Feature | Rendering | Replaces |
  | --- | --- | --- | --- | --- |
  | `/design/` | `routes/design.tsx` | `design-system` | prerendered, `noindex` | (new) |
  | `/leaderboard/` | `routes/leaderboard.tsx` | `leaderboard` | prerendered shell; the board loads in the browser from the public `GET /api/arena/model-stats` (no sign-in) and refreshes every minute | `leaderboard/index.html` |
  | `/models/` | `routes/models.tsx` | `models` (on `leaderboard`) | prerendered shell; same live data as the leaderboard | `models/index.html` |

- **The pre-launch gate stays.** `FORCE_WAITLIST` in `worker.js` sends every visitor to the waitlist; `?preview=dualmind-preview` sets a `dm_preview` cookie that lets you in. Slices can therefore merge to `master` without exposing half-migrated states.

## 2. Repository layout

```text
DualMind_UI/
├── web/                     # The React app (npm, its own package-lock.json)
│   ├── src/
│   │   ├── app/             # root.tsx (HTML shell), routes.ts (the route table)
│   │   │   └── routes/      # thin route modules, one per URL
│   │   ├── features/        # one folder per domain, each with an index.ts public API
│   │   ├── components/      # shared: ui/ primitives, layout/ shell, motion/ wrappers, vendor/ third-party code
│   │   ├── hooks/           # shared hooks (use-theme, use-reduced-motion)
│   │   ├── lib/             # framework-free code: utils/, theme/, api/ (S5), supabase/ (S6)
│   │   ├── styles/          # tokens.css (single source of truth), base.css, app.css
│   │   ├── config/          # env.ts: typed, validated Vite env
│   │   └── types/           # shared declarations (env.d.ts)
│   ├── public/              # copied as is (favicon.svg)
│   ├── tests/               # unit/ (Vitest + Testing Library), worker/ (Vitest, Node), e2e/ (Playwright)
│   ├── react-router.config.ts  # ssr: false + the prerender list
│   └── vite.config.ts, vitest.config.ts, playwright.config.ts, eslint.config.mjs, tsconfig.json
├── worker.js                # the Arena Worker (entry)
├── server/                  # Worker modules, each with its own tests in web/tests/worker/
│   ├── api-proxy.js         #   hardened same-origin /api/* proxy
│   ├── caching.js           #   the Cache-Control table
│   ├── redirects.js         #   the legacy redirect table
│   ├── routing.js           #   hashed-asset pattern, SPA fallback routes, noindex paths
│   ├── security-headers.js  #   security headers, web and legacy CSP
│   └── web-manifest.js      #   reads dist/__web-manifest.json (pages, CSP script hashes)
├── build.js                 # composes dist/ (see section 4)
├── wrangler.jsonc           # Worker config: assets.directory = dist, run_worker_first
├── .node-version            # Node 22, for Workers Builds and CI
├── waitlist-worker/         # the separate waitlist app and Worker (unchanged)
└── (legacy html/css/js)     # removed slice by slice until the cutover (S13)
```

Every top-level folder of `web/src` has a README with its purpose and rules.

## 3. Data flow in the browser

- **Rendering:** a prerendered page arrives as complete HTML (readable without JavaScript), then React hydrates it. Route modules in `src/app/routes/` only compose a feature's page component.
- **Theme:** `src/lib/theme/theme.ts` owns the preference (`system`, `dark` or `light`, stored in `localStorage['dm.theme']`). An inline script in `<head>` applies it before the first paint (`<html data-theme>`); `useTheme()` reads and changes it with `useSyncExternalStore`, so tabs stay in sync. Tokens in `src/styles/tokens.css` switch on `data-theme` and, for "system", on `prefers-color-scheme`.
- **Motion:** `useReducedMotion()` follows the OS setting live; `base.css` also stops CSS animations under reduced motion.
- **API and auth (from slices S5 and S6):** the typed client in `src/lib/api/` calls same-origin `/api/*`, which the Worker proxies to the backend ([ADR 0006](./adr/0006-same-origin-api-proxy.md)); server state goes through TanStack Query (`ApiProvider` in `src/components/layout/`, mounted by `AppProviders`, holds the one client and query cache; features read the client with `useApiClient()`); one Supabase client in `src/lib/supabase/`. Battles run on an own state machine ([ADR 0004](./adr/0004-own-battle-state-machine-and-streamdown.md)).
- **Configuration:** `src/config/env.ts` reads `import.meta.env` (only `VITE_` variables reach the bundle), validates it and exports `config`. Public values only.

## 4. Build

`node build.js` (also `npm run build` / `pnpm build` at the root) is self-contained, because Cloudflare Workers Builds runs it unchanged:

1. **Build the web app:** `npm ci` and `npm run build` in `web/` (`react-router build`, Vite). Skipped with `SKIP_WEB_BUILD=1` when a CI job built it already.
2. **Copy the legacy allowlist** (the static Arena files) into `dist/`.
3. **Overlay `web/build/client`:** new pages at their paths, hashed files into `dist/assets/` next to the legacy images. While `/` is not prerendered, React Router writes its SPA fallback as `index.html`; build.js renames it to `dist/__spa-fallback.html` so it never replaces the legacy home page.
4. **Write `dist/__web-manifest.json`** for the Worker: the web app's pages, the sha256 hashes of their inline scripts (for the CSP, section 6) and extra `connect-src` origins (the Supabase project from `VITE_SUPABASE_URL`, once auth lands in S6).
5. **Check the result** and fail the build when a legacy file or a sitemap URL is missing, when a web file would replace a legacy one (unless its slice lists it in `replacedByWeb`: today `leaderboard/index.html` and `models/index.html`), or when a file in `assets/` has no content hash.

## 5. Deploy and previews

- **Cloudflare Workers Builds** is connected to the repository and stays the deploy path ([ADR 0005](./adr/0005-workers-builds-deploys-and-previews.md)). It deploys `master` to production and builds every branch as the `Workers Builds: dualmind-arena` check, with a preview alias URL `https://<branch-slug>-dualmind-arena.creharsh.workers.dev` (add `?preview=dualmind-preview` once to pass the gate).
- **GitHub Actions** run every check and never deploy the Arena: `ci.yml` (root lint and the full build), `web.yml` (see section 7) and `web-lockfile.yml` (a helper that resolves `web/package-lock.json` and autofixes in CI, for machines that should not run `npm install`).

## 6. The Worker: request flow, caching, headers, redirects, API

### Request flow

`worker.js` handles every request (`run_worker_first: true`), in this order:

1. **Waitlist gate.** While `FORCE_WAITLIST` is on, visitors without the `dm_preview` cookie get a 302 to the waitlist.
2. **`/api/*`** goes to the hardened proxy (`server/api-proxy.js`).
3. **Legacy redirects** from the table in `server/redirects.js` (301).
4. **Client-only routes** of the web app get the SPA fallback page (`SPA_FALLBACK_ROUTES`, empty until S5).
5. The legacy share page, `robots.txt`, `sitemap.xml`, `og-image.png`, then **static files** from `dist/` with Cache-Control from the caching table.

Every response then leaves through `withSecurityHeaders()`: the security headers below, and the Content-Security-Policy for HTML.

### Caching (`server/caching.js`)

One table; the first matching row wins, and without a match the Workers static assets default stays. API responses are not touched: `/api/*` keeps the backend's headers.

| Row | Applies to | Cache-Control |
| --- | --- | --- |
| hashed-build-file | Vite output, `/assets/<name>-<hash>.<ext>` (pattern `HASHED_ASSET_RE`, checked against the build by `build.js`) | `public, max-age=31536000, immutable` |
| share | `/share` and everything below it (legacy share page) | `no-store, no-cache, must-revalidate` |
| web-page | HTML pages of the web app (from the manifest) and the SPA fallback | `no-cache`: revalidated on every visit, cheap because Workers static assets send an ETag (a matching `If-None-Match` gets a 304) |
| legacy-code | legacy HTML (also directory URLs), JS, CSS and JSON | `no-store, no-cache, must-revalidate, max-age=0`, until the cutover |
| image | `.png .jpg .jpeg .webp .gif .svg .ico` | `public, max-age=31536000, immutable`, as before |

`/design/` and `/__spa-fallback` also send `X-Robots-Tag: noindex, nofollow`.

### Security headers (`server/security-headers.js`)

| Header | Value | Sent on |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | everything |
| `X-Content-Type-Options` | `nosniff` | everything |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | everything |
| `Permissions-Policy` | `camera=(), geolocation=(), payment=(), usb=(), microphone=(self)` (the microphone stays available to the Arena itself for voice input later) | pages and files |
| `Cross-Origin-Opener-Policy` | `same-origin` | pages and files |
| `X-Frame-Options` | `DENY` (old browsers; `frame-ancestors 'none'` is the modern form) | pages and files |
| `X-XSS-Protection` | removed: deprecated, and harmful in old browsers | never |

### Content-Security-Policy

- **Web app pages: enforced, no `'unsafe-inline'` for scripts.** React Router's output has inline scripts (the theme script, the router context, the module loader). `build.js` reads every web HTML file in `dist/`, takes the sha256 of each inline `<script>`'s exact text and writes the hashes to `dist/__web-manifest.json`. The Worker reads that file once per isolate through `env.ASSETS` (`server/web-manifest.js`) and sends `script-src 'self' 'sha256-…'`. The hashes and the HTML come from the same build and travel in the same `dist/`, so they cannot drift apart; there is no generated source file to commit.
- The full web policy: `default-src 'self'; script-src 'self' <hashes>; style-src 'self' 'unsafe-inline'` (React style attributes) `; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' <Supabase origin from the build env>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. The API is same-origin, so `connect-src` needs no API origin.
- **If the manifest is missing or invalid**, web pages get the same policy as **report-only**, so a broken build cannot block the page's own scripts. A test covers this fallback.
- **Legacy pages: `Content-Security-Policy-Report-Only`** with a policy that matches what they load today: scripts and styles from jsDelivr, cdnjs and unpkg (with `'unsafe-inline'`), Google Fonts, images from any https origin, and `connect-src` for the API, Supabase (https and wss), the Pwned Passwords range API and the local API on `localhost:5079`. Violations show in the browser console; the end-to-end tests load the main legacy pages and require zero violations. At the cutover (S13) the legacy pages go away with their policy.

### Redirects (`server/redirects.js`)

Permanent (301), same origin, query string kept (the browser keeps the `#hash`). A `folder` row matches the path, the path with a trailing slash and anything below it.

| From | Match | To | Why |
| --- | --- | --- | --- |
| `/index.html` | exact | `/` | One URL for the home page |
| `/about/about` | folder | `/about/` | Duplicate copy of the about page |
| `/how-it-works/how-it-works` | folder | `/how-it-works/` | Duplicate copy |
| `/careers` | folder | `/about/` | The copied careers page was removed |
| `/auth-verify.html` | exact | `/` | Developer diagnostics |
| `/verify.html` | exact | `/` | Developer diagnostics |

The auth `.html` rows (`/login-modern.html` to `/login/` and the others in migration-plan.md section 3) are added with the auth slice (S6). Every row has a Worker test and an end-to-end check.

### API proxy (`server/api-proxy.js`)

- Forwards only `Authorization`, `Content-Type`, `Accept`, `Accept-Language` and `X-Request-Id`; cookies, client hints and every other header stay on the Arena origin.
- **Request ids:** the caller's `X-Request-Id` when it is 8-128 characters of `[A-Za-z0-9._:-]`, otherwise a new UUID. It is sent to the backend and echoed on the response.
- **No CORS.** The Arena calls its own origin, so the Worker sends no `Access-Control-*` headers and strips the backend's (other sites cannot read API responses through the Arena origin). The old blanket `OPTIONS` 204 is gone; `OPTIONS /api/*` is proxied like any other method. If a cross-origin caller ever needs the proxy, add an explicit allow-list of origins here instead of `*`.
- No `x-dualmind-proxy-*` debug headers.
- **Errors:** an upstream failure answers `502 {"error":"bad_gateway","requestId":"…"}`; no response within the route's timeout (30 s; 65 s for the model calls `POST /api/arena/dualchat` and `POST /api/arena/chat`) answers `504 {"error":"gateway_timeout","requestId":"…"}`. No error text leaks.
- **Streaming:** bodies stream through untouched. A `text/event-stream` response is never cut once it has started; other bodies must finish within the route's timeout.
- `/api/health` maps to the backend's `/health`; `BACKEND_URL` (Worker variable) overrides the backend origin.

## 7. Quality gates (all in GitHub Actions)

| Layer | Tool | Where |
| --- | --- | --- |
| Types | `react-router typegen` + `tsc` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | `web.yml` check |
| Lint | ESLint flat config: typescript-eslint (type-checked), react-hooks, jsx-a11y, sorted imports, structure rules | `web.yml` check |
| Format | Prettier with the Tailwind plugin | `web.yml` check |
| Unit | Vitest + Testing Library (jsdom): theme, hooks, tokens and contrast, components, conventions | `web.yml` check |
| Worker | Vitest in Node with a fake `ASSETS` binding and a fake upstream: gate, every redirect row, the caching table, security headers and CSP, the manifest, the proxy (header allow-list, request ids, 502, 504, streaming) | `web.yml` check |
| End to end | Playwright (Chromium) against the composed `dist/` served by the real Worker in `wrangler dev` (with a local fake backend for `/api`): headers and CSP, redirects, the proxy, hydration, theme without flash, keyboard, overflow at 320 px, axe in both themes, zero report-only violations on legacy pages | `web.yml` e2e |
| Visual | Screenshots at 1440x900 and 390x844 in dark, light and reduced motion (`web-screenshots` artifact) | `web.yml` e2e |

`npm run check` in `web/` runs the first four locally on a machine that can.

## 8. Conventions

- **Naming:** files and folders in kebab-case; React components are PascalCase named exports, one per file; hooks are `use-*.ts` exporting `useX`; tests are `*.test.ts(x)` (Vitest) and `*.spec.ts` (Playwright).
- **Imports:** the only alias is `@/` (`web/src`). A feature is imported only through its `index.ts`; inside a feature, relative imports. `components/ui` has no barrel. ESLint enforces all three.
- **Exports:** named exports everywhere; only route modules, `root.tsx` and `routes.ts` export a default.
- **Styling:** token utilities only (`bg-surface`, `text-mind-a`, `border-line`...). The default Tailwind palette is switched off, so a stray `bg-blue-500` does not exist. No hex values in components.
- **Raw HTML:** `dangerouslySetInnerHTML` is banned by ESLint; the inline theme script is the one reviewed exception, and model output will go through the sanitised Markdown renderer.
- **Tests:** all tests live under `web/tests/` (`unit/` mirrors `src/`, `worker/`, `e2e/`); no tests next to source files. `tests/unit/conventions.test.ts` checks the naming and folder rules.
- **Third-party code:** in `components/vendor/<source>/` with its licence file and a header comment per file; never paid, Pro or AGPL code ([ADR 0003](./adr/0003-shadcn-base-ui-and-vendored-effects.md)).
- **No new window globals** in the web app: state lives in modules, hooks and providers.
