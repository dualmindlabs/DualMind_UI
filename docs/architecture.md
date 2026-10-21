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
   legacy-app.html (copy of index.html),            index.html (/ landing, prerendered),
   leaderboard/, about/, js/, css/,                 design/index.html (prerendered),
   components/, assets/*.png ...                    assets/<name>-<hash>.js|css|woff2,
                                                    __spa-fallback.html, og/, favicon.svg
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
│   ├── problem-rewrite.js   #   opt-in problem+json errors (BE-1)
│   ├── audio-alias.js       #   deprecated /api/audio/tts alias (BE-2)
│   ├── rate-limit.js        #   per-user rate limits with standard headers (BE-3)
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

### Routes served by the web app

| Route | Page | Notes |
| --- | --- | --- |
| `/design/` | Style guide | `noindex` |
| `/about/`, `/how-it-works/`, `/faq/` | Info pages (`features/info`) | Indexed. How it works has `#rating`; the FAQ has a deep link per question and FAQPage JSON-LD |
| `/privacy/`, `/terms/`, `/cookies/` | Legal pages (`features/info`) | Indexed, printable, no effects |
| everything else | 404 page (`*` route, prerendered as `/404`) | `build.js` moves `404/index.html` to `dist/404.html`; the Worker serves it with status 404, `noindex` and the web CSP |

`build.js` also writes `dist/sitemap.xml` and `dist/robots.txt` from these pages (a page is listed unless its robots meta says `noindex`; the SPA fallback and the 404 page never are), plus the legacy pages that are still static files (`LEGACY_PUBLIC_PAGES`). The Worker no longer generates either file.

## 3. Data flow in the browser

- **Rendering:** a prerendered page arrives as complete HTML (readable without JavaScript), then React hydrates it. Route modules in `src/app/routes/` only compose a feature's page component.
- **Theme:** `src/lib/theme/theme.ts` owns the preference (`system`, `dark` or `light`, stored in `localStorage['dm.theme']`). An inline script in `<head>` applies it before the first paint (`<html data-theme>`); `useTheme()` reads and changes it with `useSyncExternalStore`, so tabs stay in sync. Tokens in `src/styles/tokens.css` switch on `data-theme` and, for "system", on `prefers-color-scheme`.
- **Motion:** `useReducedMotion()` follows the OS setting live; `base.css` also stops CSS animations under reduced motion.
- **API and auth (from slices S5 and S6):** the typed client in `src/lib/api/` calls same-origin `/api/*`, which the Worker proxies to the backend ([ADR 0006](./adr/0006-same-origin-api-proxy.md)); server state goes through TanStack Query (`ApiProvider` in `src/components/layout/`, mounted by `AppProviders`, holds the one client and query cache; features read the client with `useApiClient()`); one Supabase client in `src/lib/supabase/`. Battles run on an own state machine ([ADR 0004](./adr/0004-own-battle-state-machine-and-streamdown.md)).
- **Landing page and the signed-in hand-off (slice S3):** `/` is the prerendered landing page (`src/features/marketing/`). Until the arena slice (S8) renders the signed-in arena at `/`, the legacy arena lives on as `/legacy-app.html` (build.js copies the legacy `index.html` to the root of `dist/`, so its relative script paths still resolve). The landing route's `handle` asks the root layout for a tiny inline script in `<head>` (`src/lib/session/handoff.ts`, allowed by its CSP hash like every inline script): when `localStorage` holds a Supabase session (`dualmind.auth.supabase` or a supabase-js `sb-<ref>-auth-token` key), or the URL carries Supabase auth parameters (`#access_token=`, `#refresh_token=`, `?code=`, `?token_hash=`, `type=recovery` and the other email link types), it calls `location.replace('/legacy-app.html' + search + hash)` before the first paint, so OAuth returns, email links and signed-in visitors still land in the working app. Workers static assets serve that file at its clean URL `/legacy-app` (a 307 that keeps the query; the browser keeps the hash).
- **Auth (slice S6):** see [section 3.1](#31-auth-supabase).
- **Live data on the landing page:** one TanStack Query request to the public leaderboard (`GET /api/arena/model-stats` through the typed client, the leaderboard page's cache key) feeds the live strip, the model strip and the top-five preview. Battles and votes are derived from it (`src/features/marketing/lib/live-stats.ts`); when the request fails, the page says so and shows no numbers.
- **Configuration:** `src/config/env.ts` reads `import.meta.env` (only `VITE_` variables reach the bundle), validates it and exports `config`. Public values only.

### 3.1 Auth (Supabase)

- **One client, loaded only when needed.** `src/lib/supabase/client.ts` creates the app's one supabase-js client (pinned `@supabase/supabase-js`, its own lazy chunk) with `persistSession`, `autoRefreshToken`, `detectSessionInUrl` and `flowType: 'implicit'` (email links already in inboxes carry tokens in the `#hash`, and PKCE email links only work in the browser that asked for them). The storage key stays supabase-js's default `sb-<project ref>-auth-token`, which the legacy pages also write, so old and new pages share one session. Pages fetch supabase-js only when there is a stored session, auth data in the URL, or a sign-in action.
- **Settings from the build, never from the repo.** `src/config/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public values; production and previews should get them from the Workers Builds build variables, CI uses a dummy project). Until those variables are set, `build.js` reads the same public URL and anon key from the legacy `config.js` and passes them to the web build through the environment (no new file holds them); that fallback must be replaced by the build variables before `config.js` is deleted at the cutover (S13). Without them the app still builds and runs: `supabaseConfig` is null, the auth state is `unavailable` and the sign-in pages show a "Sign-in is unavailable here" notice instead of forms. Secret and service-role keys are refused.
- **State.** `src/lib/supabase/auth-store.ts` is a small external store around a pure reducer: `loading` (prerendered HTML), `signed-in`, `signed-out`, `unavailable`. `AuthProvider` (`src/components/layout/auth-provider.tsx`, inside `ApiProvider` in `AppProviders`) starts it after hydration; components read `useAuth()` (`session`, `user`, `profile`, `status`, `client()`, `signOut()`). The profile comes from `POST /api/users/sync` through the typed API client, once per user per tab (cached in `sessionStorage['dm.profile.v1']`).
- **Session migration.** When the default key is empty but `localStorage['dualmind.auth.supabase']` (written by the old `/login/` page) has tokens, the store adopts them with `setSession()`; a copy the auth server rejects is removed so the attempt runs once. Until the arena slice (S8) the store also keeps `dualmind.auth.supabase` in step with the session, because the legacy arena reads it.
- **API token.** `ApiProvider` gives the typed client `getAccessToken` from `src/lib/supabase/access-token.ts` (the session's access token, refreshed by supabase-js; null without a session, without loading supabase-js).
- **Sign-out** calls Supabase (all devices, as before; local-only if that fails), then removes the legacy session keys (`dualmind.auth.supabase`, `dualmind.auth.token`, `dualmind.auth`, `supabase.auth.token`), the offline vote queue (`dm.voteQueue.v1`) and the cached profile.
- **Redirects after sign-in.** `?redirect=` is honoured only for a same-origin path (`safeRedirect()` in `src/lib/supabase/redirect.ts`: no other origins, `//host`, backslashes, control characters or auth pages), default `/`. The page then loads it as a document, so `/` runs the landing page's hand-off to the legacy arena. OAuth returns to the bare origin, as before. `useRequireAuth()` is the route guard for later slices (sign-in redirect with the legacy `auth_redirect_attempted` loop guard).
- **Pages** (`src/features/auth/`): `/login/` (Google, GitHub, then password, email code or text-message code), `/signup/` (name, email, password with the strength rules and the k-anonymity breach check, confirmation-email state), `/forgot-password/`, and the two Supabase email targets, which render in place at their old addresses: `/auth-callback.html` (confirms the link, sends the welcome email through the `email-wel-safe` edge function, moves on to `?redirect` or `/`; a `type=recovery` link is forwarded to `/update-password.html` with its hash by the route's `clientLoader`, before the client touches the URL) and `/update-password.html` (sets the new password from the recovery session). After reading the tokens, the store removes them from the address bar.

## 4. Build

`node build.js` (also `npm run build` / `pnpm build` at the root) is self-contained, because Cloudflare Workers Builds runs it unchanged:

1. **Build the web app:** `npm ci` and `npm run build` in `web/` (`react-router build`, Vite). Skipped with `SKIP_WEB_BUILD=1` when a CI job built it already.
2. **Copy the legacy allowlist** (the static Arena files) into `dist/`.
3. **Overlay `web/build/client`:** new pages at their paths, hashed files into `dist/assets/` next to the legacy images. With `/` prerendered (slice S3), React Router writes its SPA fallback as `__spa-fallback.html` and the landing page as `index.html`, which replaces the legacy home page (`replacedByWeb`); the legacy page is first copied to `dist/legacy-app.html` for the signed-in hand-off. The build fails if a `replacedByWeb` file was not written by the web app, or if `dist/index.html` turns out to be the SPA fallback.
4. **Write `dist/__web-manifest.json`** for the Worker: the web app's pages, the sha256 hashes of their inline scripts (for the CSP, section 6) and extra `connect-src` origins: the Supabase project from the `VITE_SUPABASE_URL` build variable (https and wss; a warning, not a failure, when it is unset) and `https://api.pwnedpasswords.com` for the sign-up breach check. Since S6 the legacy sign-in pages (`login-modern.html`, `signup-modern.html`, `forgot-password.html`, `auth-callback.html`, `update-password.html` and the `login/` folder) are no longer copied: their URLs redirect or are served by the web app.
5. **Check the result** and fail the build when a legacy file or a sitemap URL is missing, when a web file would replace a legacy one (unless its slice lists it in `replacedByWeb`: today `leaderboard/index.html` and `models/index.html`), or when a file in `assets/` has no content hash.

## 5. Deploy and previews

- **Cloudflare Workers Builds** is connected to the repository and stays the deploy path ([ADR 0005](./adr/0005-workers-builds-deploys-and-previews.md)). It deploys `master` to production and builds every branch as the `Workers Builds: dualmind-arena` check, with a preview alias URL `https://<branch-slug>-dualmind-arena.creharsh.workers.dev` (add `?preview=dualmind-preview` once to pass the gate).
- **GitHub Actions** run every check and never deploy the Arena: `ci.yml` (root lint and the full build), `web.yml` (see section 7) and `web-lockfile.yml` (a helper that resolves `web/package-lock.json` and autofixes in CI, for machines that should not run `npm install`).

## 6. The Worker: request flow, caching, headers, redirects, API

### Request flow

`worker.js` handles every request (`run_worker_first: true`), in this order:

1. **Waitlist gate.** While `FORCE_WAITLIST` is on, visitors without the `dm_preview` cookie get a 302 to the waitlist.
2. **Rate limits (BE-3).** Every `/api/*` request first passes `checkRateLimit()` (`server/rate-limit.js`); over the limit it is answered with a 429 right there (see "Rate limits" below). Then **`/api/v2` and `/api/v2/*`** go to the Worker's own API, a Hono app in `server/v2/` loaded with a dynamic `import()` (see "The `/api/v2` router" below); they never fall through to the proxy. **Other `/api/*`** goes to the hardened proxy (`server/api-proxy.js`).
3. **Legacy redirects** from the table in `server/redirects.js` (301).
4. **Client-only routes** of the web app get the SPA fallback page with status 200 (`SPA_FALLBACK_ROUTES`: `/update-password.html` and `/auth-callback.html` since S6).
5. The legacy share page, `og-image.png`, then **static files** from `dist/` (including the built `robots.txt` and `sitemap.xml`) with Cache-Control from the caching table.
6. **Anything else** gets the web app's 404 page (`dist/404.html`, see below) with status 404; plain text `Not Found` if that file is missing.

Every response then leaves through `withSecurityHeaders()`: the security headers below, and the Content-Security-Policy for HTML.

### The `/api/v2` router (`server/v2/`)

BE-0 ([design](./backend/designs/BE-0-platform.md)). A Hono app with `@hono/zod-openapi`: routes are declared once with zod schemas (`contract/`, shared with the web app), which validate input, type handlers and generate `docs/api/openapi.v2.json` (CI fails when it is stale). Middleware: request context (request id, timer, one JSON log line per request), problem+json error handling (`server/problem-types.js` is the type registry, also usable by v1), a 1 MiB body limit, then per route `auth()` (Supabase JWT behind a verifier interface, `jose`) and `guard()` (the `not_enabled` guard: 501 when a binding or secret is missing). If the router cannot be loaded, `worker.js` answers a 503 problem and v1 and static files keep working.

- **Production vs preview bindings:** `server/v2/bindings.ts` picks `DB`, `CACHE`, `EVENTS` and `PUBLIC_BUCKET` only when the request host is exactly `arena.dualmindlab.tech`, and the `*_PREVIEW` twin for every other host, never falling back to production.
- **Configuration:** `SUPABASE_URL` is a public `vars` entry in `wrangler.jsonc`. Optional secrets, not set yet: `SUPABASE_JWT_SECRET` (legacy HS256 tokens) and `PRIVACY_SALT` (salted hashes of user ids in logs). Without them the code still works.
- **Dependencies:** `hono`, `@hono/zod-openapi`, `jose` and `zod` are declared in `web/package.json` (the one lockfile CI and Workers Builds resolve). `scripts/link-worker-deps.mjs` links them into the root `node_modules`, where wrangler's bundler looks; `build.js` runs it.
- **Tests and checks (`api.yml`):** `tsc` over `server/`, `contract/` and `scripts/`; Vitest in workerd through `@cloudflare/vitest-plugin` (`vitest.api.config.mts`, `tests/api/`) against the real `worker.js`; `npm run api:openapi:check`. The Node tests of the JS modules stay in `web/tests/worker` (`web.yml`).

### Rate limits (`server/rate-limit.js`)

BE-3 ([design](./backend/designs/BE-3-rate-limits.md), table of limits in [endpoints.md](./api/endpoints.md#rate-limits-be-3)). `worker.js` calls `checkRateLimit()` for every `/api/*` request (v1 and v2) before the proxy or the router runs. The request is classified into a group (`battle`, `vote`, `speech`, `write`, `read`; health checks and `OPTIONS` are exempt), keyed, and counted with that group's Workers Rate Limiting binding (`RL_BATTLE`, `RL_VOTE`, `RL_SPEECH`, `RL_WRITE`, `RL_READ`, declared under `ratelimits` in `wrangler.jsonc` with `namespace_id` 1001 to 1005, which are account-wide: do not reuse them in other Workers; no account resource is needed, and a test fails when `wrangler.jsonc` and `RATE_LIMIT_GROUPS` disagree). Allowed responses carry `RateLimit-Policy`; over the limit the Worker answers 429 with `Retry-After`, before any upstream call.

- **Key:** `u:<user id>` when the Bearer token verifies through the BE-0 verifier (the token is never decoded otherwise, so forged `sub` values cannot reset a counter); else `ip:` plus the first 32 hex characters of HMAC-SHA-256(`PRIVACY_SALT`, `ip:<CF-Connecting-IP>`). `PRIVACY_SALT` is an optional Worker secret that Harsh sets with `wrangler secret put PRIVACY_SALT` (not done yet). Until it is set, the raw `CF-Connecting-IP` is the in-memory key handed to the binding; this code never logs or stores it, and `ratelimit_unsalted` is logged once per isolate as a reminder.
- **Fail open:** a missing, throwing or slow (over 50 ms) binding lets the request through with `X-RateLimit-Status: skipped` and a `ratelimit_unavailable` log line. Kill switch: remove a binding from `wrangler.jsonc` or raise its limit.
- **Logs:** `rate_limited` (`requestId`, `group`, `keyKind`, `keyHash8`, `route`; `keyHash8` is null without the salt) and `ratelimit_unavailable`. No address, token or user id is logged.
- **Client:** the typed client reads the 429 into `ApiError` kind `rate_limited` with `retryAfterMs`; `ApiProvider` shows one toast ("Too many requests. Try again in N seconds."); the vote queue waits at least `Retry-After` before it re-sends.

### Caching (`server/caching.js`)

One table; the first matching row wins, and without a match the Workers static assets default stays. API responses are not touched: `/api/*` keeps the backend's headers.

| Row | Applies to | Cache-Control |
| --- | --- | --- |
| hashed-build-file | Vite output, `/assets/<name>-<hash>.<ext>` (pattern `HASHED_ASSET_RE`, checked against the build by `build.js`) | `public, max-age=31536000, immutable` |
| share | `/share` and everything below it (legacy share page) | `no-store, no-cache, must-revalidate` |
| web-page | HTML pages of the web app (from the manifest) and the SPA fallback | `no-cache`: revalidated on every visit, cheap because Workers static assets send an ETag (a matching `If-None-Match` gets a 304) |
| legacy-code | legacy HTML (also directory URLs and clean URLs such as `/legacy-app` or `/login-modern`), JS, CSS and JSON | `no-store, no-cache, must-revalidate, max-age=0`, until the cutover |
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
- The full web policy: `default-src 'self'; script-src 'self' <hashes>; style-src 'self' 'unsafe-inline'` (React style attributes) `; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' <Supabase origin from the build env> https://api.pwnedpasswords.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. The API is same-origin, so `connect-src` needs no API origin.
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
| `/login-modern.html`, `/login-modern` | exact | `/login/` | Old sign-in page (S6) |
| `/login/index.html` | exact | `/login/` | One URL for sign-in |
| `/login/login` | folder | `/login/` | Third copy of the sign-in page and its `redirect.html` |
| `/signup-modern.html`, `/signup-modern` | exact | `/signup/` | Old sign-up page |
| `/forgot-password.html` | exact | `/forgot-password/` | Old reset request page |
| `/auth-callback` | exact | `/auth-callback.html` | Clean URL of the email callback |
| `/update-password` | exact | `/update-password.html` | Clean URL of the reset page |

`/auth-callback.html` and `/update-password.html` themselves are never redirected: they are the Supabase email targets and render in place. Every row has a Worker test and an end-to-end check.

### API proxy (`server/api-proxy.js`)

- Forwards only `Authorization`, `Content-Type`, `Accept`, `Accept-Language` and `X-Request-Id`; cookies, client hints and every other header stay on the Arena origin.
- **Request ids:** the caller's `X-Request-Id` when it is 8-128 characters of `[A-Za-z0-9._:-]`, otherwise a new UUID. It is sent to the backend and echoed on the response.
- **No CORS.** The Arena calls its own origin, so the Worker sends no `Access-Control-*` headers and strips the backend's (other sites cannot read API responses through the Arena origin). The old blanket `OPTIONS` 204 is gone; `OPTIONS /api/*` is proxied like any other method. If a cross-origin caller ever needs the proxy, add an explicit allow-list of origins here instead of `*`.
- No `x-dualmind-proxy-*` debug headers.
- **Opt-in problem+json (BE-1):** a request whose `Accept` names `application/problem+json` gets an RFC 9457 body for every non-2xx answer, including the Worker's own 502 and 504 (`server/problem-rewrite.js`, mapping table in [endpoints.md](./api/endpoints.md#one-error-shape-on-request-be-1)). Streams and success bodies are untouched; callers without the header (the legacy app) see the v1 bodies unchanged. At most 64 KiB of an upstream error body is read; 5xx text is logged, never forwarded. Error statuses add `Vary: Accept`.
- **Text-to-speech alias (BE-2):** `POST /api/audio/tts` is validated and forwarded to `/api/speech/generate` as `{ text, voice? }`, with a guaranteed audio content type, `no-store`, and `Deprecation`/`Link` headers (`server/audio-alias.js`). Deprecated; the typed client calls the real route.
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
| Worker | Vitest in Node with a fake `ASSETS` binding and a fake upstream: gate, every redirect row, the caching table, security headers and CSP, the manifest, the proxy (header allow-list, request ids, 502, 504, streaming, the problem+json rewrite per mapping row, the text-to-speech alias) | `web.yml` check |
| End to end | Playwright (Chromium) against the composed `dist/` served by the real Worker in `wrangler dev` (with a local fake backend for `/api` that answers the leaderboard with a recorded response): headers and CSP, redirects, the proxy, hydration, theme without flash, keyboard, overflow at 320 px, axe in both themes, zero report-only violations on legacy pages; on `/`: the prerendered hero and SEO tags, the page without JavaScript, the live strip and its fallback, the demo battle by keyboard, the signed-in hand-off | `web.yml` e2e |
| Visual | Screenshots of `/` and `/design/` at 1440x900 and 390x844 in dark, light and reduced motion, the landing demo after the reveal, and the rendered Open Graph card (`web-screenshots` artifact) | `web.yml` e2e |
| Performance | Lighthouse CI on `/` (mobile, three runs, median): accessibility 1, best practices >= 0.95 and SEO 1 fail the job; performance >= 0.9 and at most 180 KB of gzipped JavaScript loaded up front by `/` are the targets and warn for now (the shared shell, React Router, Motion and Zod load about 290 KB up front). `web/lighthouserc.json`, `lighthouse` artifact, scores in the job summary | `web.yml` e2e |

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
