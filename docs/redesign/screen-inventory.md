# DualMind Arena: screen and flow inventory

Read-only audit of the current frontend (`dualmindlabs/DualMind_UI`, branch `master` at `7d760c5`), written as input to the UI redesign plan. The keep/merge/drop recommendations below are inputs; the final URL and redirect decisions live in [migration-plan.md](./migration-plan.md) section 3. Date: 2026-10-20. Everything below comes from reading source files; nothing was built or run. Paths are relative to the repo root unless stated. "Audit docs" means `KNOWN_ISSUES.md`, `docs/CODEBASE_AUDIT.md` (2026-08-17), `docs/DEEP_AUDIT.md`, `docs/PROJECT_HEALTH_REPORT.md`, `docs/UI_ROADMAP.md`, `docs/audit-findings/{core-app,components,styles,content-marketing,api-backend,build-deploy,tests-tooling}.md` and `AGENTS.md` / `CLAUDE.md`. Several audit docs were written before the waitlist work and some of their paths are Windows paths from another checkout; findings were re-checked against the files here where cited with file:line.

## 1. Overview

### How the site is served today

| Layer | Fact | Source |
|---|---|---|
| App type | Static HTML + vanilla JS ES modules, no framework, no bundler | `CLAUDE.md`, `index.html` |
| Hosting | Cloudflare Worker `dualmind-arena`, route `arena.dualmindlab.tech/*`, static assets from `dist/` (binding `ASSETS`), `run_worker_first: true` | `wrangler.jsonc` |
| Build | `node build.js` copies a fixed list of files and folders into `dist/`; no minify, no hashing | `build.js:5-45` |
| Worker | `worker.js` (367 lines): waitlist gate, `/api/*` proxy to the backend, `/share/*` rewrite, generated `robots.txt`, `sitemap.xml`, `og-image.png` placeholder, `ads.txt`, clean-URL fallbacks, custom 404 | `worker.js` |
| Auth | Supabase Auth in the browser (`@supabase/supabase-js` 2.43.0 from jsDelivr ESM); session in `localStorage['dualmind.auth.supabase']` | `js/auth/supabase-auth.js:7,18` |
| Backend | .NET API at `https://api.dualmindlab.tech` (localhost:5079 on localhost); the Worker also proxies `/api/*` to it with open CORS | `config.js`, `worker.js:87-130` |
| Waitlist | Separate Worker `dualmind-waitlist` at `https://early.dualmindlab.tech` (React 19 + Vite 7 + Tailwind v4, prerendered, D1 for signups) | `waitlist-worker/` |

### Waitlist redirect status (verified live with curl, 2026-10-20)

- `FORCE_WAITLIST = true` (`worker.js:23`). Every request to `arena.dualmindlab.tech`, any path and method, gets `302` to `https://early.dualmindlab.tech/?ref=arena` (query kept, `preview` dropped).
- Verified live: `/`, `/share/abc`, `/login-modern.html`, `/?preview=x` and `/ads.txt` all return `302 https://early.dualmindlab.tech/?ref=arena`. `early.dualmindlab.tech/` returns 200.
- Preview bypass: `?preview=dualmind-preview` sets cookie `dm_preview=1` (30 days, HttpOnly, Secure, SameSite=Lax) and serves the Arena; `?preview=off` clears it. Cookie holders skip the redirect. The code is public, not a secret (`worker.js:1-21`).
- Consequence: the real Arena is only reachable with the preview cookie. `robots.txt`, `sitemap.xml`, `ads.txt` and all marketing pages also redirect for crawlers, so none of the current pages are indexable today.
- `KNOWN_ISSUES.md` #10 says the deployed Worker may be older than `master`; the live behaviour above shows the redirect build is active now.
- Loop warning: `waitlist-worker/worker.js` redirects back to `arena.dualmindlab.tech` if its `wishlist-active` flag is false. Do not turn that off while the Arena redirects to the waitlist.

### Repo shape at a glance

- About 46k lines in the tree including lockfiles; app code is roughly 22k lines (`docs/CODEBASE_AUDIT.md` section 3). Largest files: `js/ui/app.js` 2112, `css/styles.css` 2932, `css/ui-improvements.css` 2582, `components/chat/ChatView.js` 1075, `js/auth-modern.js` 906.
- 16 CSS files in `css/` plus `arena-redesign.css` (root, dead) plus `login/login/style.css`.
- 30+ HTML files, of which 4 are exact or near duplicates under nested paths (see URL map).

## 2. URL map

"Served" means what the Worker returns when the waitlist gate is off (or the preview cookie is set). Asset lookup order in `worker.js`: exact asset, then `<path>.html`, then `<path>/index.html`, then `/404.html` with status 404. `build.js` decides what is in `dist/` at all.

| Public URL | Source file | Purpose | Auth | Recommendation |
|---|---|---|---|---|
| `/` | `index.html` + `js/ui/app.js` | Arena app shell (battle / direct chat) | Required: redirects to `login-modern.html?redirect=...` when logged out (no guest mode) | KEEP as `/` (landing decision: see section 3.1) |
| `/index.html` | same | alias | same | 301 to `/` |
| `/login/` | `login/index.html` + `login/auth-complete.js` | Older login page (tabs, Supabase CDN script, admin check) | No | MERGE into canonical `/login`; keep URL as redirect. Linked from nav on leaderboard/models and sitemap |
| `/login/index.html` | same | alias | No | redirect |
| `/login/login/`, `/login/login/index.html` | `login/login/index.html` + `style.css` | Third login clone ("AMU - Account") with inline Supabase code | No | DROP page; 301 to `/login` |
| `/login/login/redirect.html` | `login/login/redirect.html` | meta refresh to `index.html` | No | DROP; redirect |
| `/login-modern.html` | `login-modern.html` + `js/auth-modern.js` | Current login: email+password, email OTP, phone OTP, GitHub, Google | No | KEEP as the canonical login; expose as `/login`, 301 old `.html` URL |
| `/signup-modern.html` | `signup-modern.html` + `js/auth-modern.js` | Sign up (same JS, signup context) | No | KEEP as `/signup`; 301 old URL |
| `/forgot-password.html` | `forgot-password.html` + `js/forgot-password.js` | Request reset email | No | KEEP as `/forgot-password`; 301 |
| `/update-password.html` | `update-password.html` + `js/update-password.js` | Set new password after reset link | Needs recovery session from link | KEEP, path MUST keep working (Supabase email link target) |
| `/auth-callback.html` | `auth-callback.html` | Email confirm / recovery landing page | Session from URL hash | KEEP path (email links point here); fix broken import (section 3.7) |
| `/auth-verify.html` | `auth-verify.html` | Dev diagnostic "Authentication Verification" (shows stylesheet counts, tokens); redirects to nonexistent `./login.html` | No | DROP (copied to `dist/` by `build.js:11`) |
| `/verify.html` | `verify.html` | Dev "Setup Complete" checklist | No | DROP (not in `build.js`, so 404 in prod; delete from repo) |
| `/about/` | `about/index.html` + `css/info-pages.css` | About, mission | No | KEEP, restyle |
| `/about/about/` | `about/about/index.html` | Old "Duel_mind Arena" about clone; links `../style.css` which does not exist | No | DROP; 301 to `/about/` |
| `/how-it-works/` | `how-it-works/index.html` | Steps, battle modes, privacy | No | KEEP |
| `/how-it-works/how-it-works/` | nested clone, same broken `../style.css` | old clone | No | DROP; 301 to `/how-it-works/` |
| `/leaderboard/` | `leaderboard/index.html` + `js/leaderboardPage.js` | Public ELO table + long SEO article | Page public; data call needs login (see 3.5) | KEEP, P0 |
| `/models/` | `models/index.html` (static) | Static "AI Models Comparison" editorial page: GPT-4, Claude 3, Gemini 1.5, Llama 3, Mistral Large (stale) | No | MERGE with leaderboard into one model hub driven by `/api/arena/model-stats`; keep URL |
| `/faq/` | `faq/index.html` | FAQ accordion | No | KEEP |
| `/careers/` | `careers/index.html` | Copy of LMArena careers page: brand "LMArena", 16 job listings, Bay Area | No | DROP content (or replace); keep URL as 301 to `/about/` until real roles exist |
| `/careers/careers/` | nested exact clone | clone | No | DROP; 301 |
| `/privacy/`, `/terms/`, `/cookies/` | each `index.html` + `css/info-pages.css` | Legal, with TOC | No | KEEP, one shared legal template. Also `build.js:12` copies `terms.html` which does not exist |
| `/share/<id>` | `share/index.html` + `components/SharedThreadView.js` | Read-only shared battle | No (public GET of thread) | KEEP, P0 fix (broken today). Canonical `/share/<id>` plus accept `/share/?id=<id>` |
| `/share/`, `/share/?id=` | same | share page; works only with `?id=` | No | keep |
| `/404.html` / any unknown path | `404.html` | "Lost in the Arena?" with remixicon | No | KEEP, restyle |
| `/robots.txt` | Worker (generated) | `Allow: /` + sitemap; the root `robots.txt` file is a second copy | No | KEEP one source |
| `/sitemap.xml` | Worker (generated, 11 URLs) | Root `sitemap.xml` (7 URLs, dated 2026-01-01) is shadowed by the Worker | No | KEEP one source; unify |
| `/og-image.png` | Worker returns a 1x1 PNG placeholder | Pages point at `/assets/og-image.png`, which does not exist | No | Replace with real asset |
| `/ads.txt` | Worker string (`google.com, pub-7046688828386115, DIRECT, ...`) | Ads declaration; root `ads.txt` is the same 58 bytes | No | Keep only if ads continue (decision for lead) |
| `/manifest.json` | `manifest.json` | PWA manifest; icons under `assets/icons/` do not exist; not linked from any page | No | FIX or DROP |
| `/sw.js` | `sw.js` | Imports a third-party push/ad script (`3nbf4.com`); never registered | No | DROP unless intentional |
| `/config.js` | `config.js` | Public runtime config (backend URL, Supabase URL + anon key) | No | KEEP as config; see security notes |
| `/api/*` | Worker proxy to `https://api.dualmindlab.tech` (`/api/health` maps to `/health`) | Same-origin API path | by endpoint | KEEP |
| `early.dualmindlab.tech/` | `waitlist-worker/` | Pre-launch landing + signup | No | KEEP, becomes the visual reference for the redesign |
| `early.dualmindlab.tech/api/signup` | `waitlist-worker/server/signup.js` | Waitlist POST, D1 | No | KEEP |

Files in the repo that no URL serves or that are dead in production: `arena-redesign.css`, `build-deploy.js`, `performance-monitor.js`, `mock-api-server.js`, `test-*.js`, `start.bat`, `startup.bat`, `commit_and_push.*`, `js/auth.js`, `js/auth/api-service.js`, `js/api/examples.js`. `docs/audit-findings/core-app.md:68-82` lists more (`App.jsx`, `arena-core.js`, `old-html-backup/`, `next-dualmind/`, `deploy_build/`); those are not in this checkout.

## 3. Per-screen audit

### 3.1 Landing / entry (`/`)

There is no marketing landing inside the Arena: `/` is the app shell. Logged-out users are bounced to the login page.

- Contains: skip link (`#chat-input`), decorative background image, hidden `#app` with containers `#sidebar-container`, `#header-container`, `#main-content`, `#chat-input-container`, `#floating-voting`; full-screen black loading overlay with a spinner (`#auth-loading-overlay`).
- States: loading overlay until auth resolves; global error banner on `window.onerror` (innerHTML, shown for any JS error) and a 10 s "initialization timed out" banner (`index.html:98-130`); `<noscript>` absent but a `nomodule` fallback replaces the body.
- Modules: `js/auth/supabase-init.js` (deferred), `config.js`, `js/ui/app.js` (module), `js/feature-flags.js`.
- Flow: `App.init()` waits for `DualMindAuthReady`, sleeps a hardcoded 500 ms, checks login, else `location.href = 'login-modern.html?redirect=<path>'` guarded by `sessionStorage['auth_redirect_attempted']` (`js/ui/app.js:90-135`).
- Problems:
  - No public value proposition or demo in the app origin; the waitlist page is the only real landing today. `docs/UI_ROADMAP.md` item 7 proposes anonymous demo battles.
  - Blocking inline error handler and 500 ms sleep delay first paint of the app (`docs/audit-findings/core-app.md` #10, #11).
  - 9 `<script>` tags and 14 stylesheet links on this page; 12 CSS files are render-blocking (`index.html:42-76`).
  - `<meta name="monetag">` verification tag (`index.html:6`) with no consent UI (`core-app.md` #4).
  - CDN scripts `highlight.js`, `marked` (unpinned `marked/marked.min.js`), DOMPurify have no SRI (`index.html:38-41`).
  - `og:image` points to a file that does not exist (`content-marketing.md` #1).
  - Relative redirect `login-modern.html` breaks if the app is ever served from a sub-path.

### 3.2 Arena: chat shell, battle and direct modes

Single page, three regions rendered by classes in `components/` and `js/ui/app.js`.

- Sidebar (`components/Sidebar.js`, 692 lines): logo, collapse toggle, "New Chat", "Leaderboard" (opens a modal), "Recent Chat" list (load, rename, delete), footer Settings popup with user card, links to `./terms/`, `./privacy/`, `./cookies/`, and Log Out. Mobile: drawer opened via `toggle-mobile-menu` event.
- Header (`components/Header.js`): mobile menu button, mode dropdown with three modes: Battle (2 anonymous models), Side by Side (`arena`: pick 2 models), Direct Chat (1 model), Share button (hidden until a thread exists), Export button (hidden until turns exist). No theme toggle, no account page.
- Chat input (`components/ChatInput.js`, 323 lines): textarea, attach, web search toggle, image button, code mode toggle (web and code are mutually exclusive via `toggle-code-mode` / `toggle-web-search` events). Model selector UI is inside `ChatView`.
- Chat view (`components/chat/ChatView.js`, 1075 lines): empty arena state ("Models are anonymous until you vote"), turn cards (prompt, left and right response cards, markdown rendering via marked + DOMPurify + highlight.js), per-card copy / read aloud, "show hidden side" toggle, response modal, model pickers persisted in `localStorage` (`battle.model.left`, `battle.model.right`, `direct.model`).
- State machine in `js/ui/app.js`: `state.turns`, `streaming`, per-card `streaming`, `backendAvailable`, `currentThreadId`, `currentThreadVisibility`. Events on `document` (CustomEvent bus): `toggle-*`, `user-logout`, `backend-available`, `threads-changed`, `toggle-mobile-menu`.
- Streaming: `ArenaService.chatStream` / `HttpClient.stream` read `text/event-stream` (`data: ` lines); dual battle uses `POST /api/arena/dualchat`; a typewriter-like `streamText` in `js/mockArena.js` simulates output when the backend is unavailable (mock replies are shown as real answers).
- Empty / loading / error: empty arena text; "No recent chats" list; backend-unavailable banner (`showBackendUnavailableBanner`); offline indicator suppressed by config; failures use `alert()` (vote failure, leaderboard load failure).
- Keyboard: Ctrl/Cmd+K focuses input, Ctrl/Cmd+B toggles sidebar on mobile, Escape closes drawer (`js/ui/app.js:1936-1957`). The roadmap's `1` / `2` vote keys are not implemented.
- API: `POST /api/arena/chat`, `/chat/stream`, `/dualchat`; `GET /api/models`; `POST /api/users/sync`; `GET/POST/PATCH/DELETE /api/threads...`; `GET /api/health`.
- Problems:
  - God object: `app.js` has 52 methods, 13 `innerHTML` writes, global `window._DUALMIND_API`, `window._APP` coupling (`CODEBASE_AUDIT.md` section 6; `components.md` #8).
  - `Sidebar.updateUserInfo()` is called but does not exist (`components.md` #1).
  - Attachments and image button collect files but nothing is sent (`components.md` #3). Dead UI to cut or build.
  - Two-column battle layout is "unusable on phones" per `docs/UI_ROADMAP.md` item 4; there is no stacked or swipe layout (media queries live in `css/ui-improvements.css:232,1111-1415,2146-2200` and `css/voting-ui.css:191-210`).
  - Icon-only buttons under 40 px touch target (`UI_ROADMAP.md` item 12).
  - `ChatInput.setLoading(true)` re-renders and re-attaches all listeners (`components.md` #13).
  - `alert()` and `confirm`-style dialogs mixed with `CustomModal`.
  - Mock replies can be mistaken for real model output when the backend check fails (`js/ui/app.js:724-760`).
  - Text-to-speech calls `/api/audio/tts`, which does not exist; the real route is `/api/speech/generate` (`KNOWN_ISSUES.md` #7).

### 3.3 Voting and results reveal

- Contains: floating vote bar above the input (`#floating-voting`, `showFloatingVoting`), four buttons `data-vote="left" | "tie" | "both-bad" | "right"`, in-card selection colours (`vote-selected-green` / `-red`, `is-winner` / `is-loser`).
- Flow: model names are anonymous labels before the vote; `handleVoteSubmit` posts `{comparisonId, voteChoice, userId, voteDurationMs}` to `POST /api/arena/model-vote`, then `vote-delay` for 2 s with both answers visible, then `submitted`: reveals real model names and hides the losing answer unless tie / both bad, with a "show hidden" toggle (`js/ui/app.js:1154-1325`, `ChatView.js:327-427`).
- Offline: votes are queued in localStorage when the backend is down and flushed on recovery (`enqueuePendingVote`, `flushPendingVotes`); user sync has the same queue pattern.
- States: voting disabled while either side streams; buttons disabled with inline `opacity` during submit; failure shows `alert('Failed to submit vote: ...')` and re-enables.
- Problems:
  - The reveal is a text swap; no identity card, avatar, percentage or animation (`UI_ROADMAP.md` item 8, "model reveal micro-interaction").
  - Comment in `ChatView.js:332` says 10 s delay; code uses 2 s. Spec drift.
  - Queued-vote localStorage keys are not versioned and not cleared on logout.
  - Duplicate of `ChatView.renderVoteBar()` is dead code (`components.md` dead-code section).
  - Vote buttons have no keyboard shortcuts and no `aria-live` result announcement (only 3 `aria-live` / `role=status|alert|dialog` hits in components, `js/ui`, `index.html`).

### 3.4 Share modal and shared view

Modal (`components/ShareModal.js`): visibility options Private / Unlisted / Public with a copy-link field; builds `${origin}/share/${threadId}` (`ShareModal.js:33-34`); calls `PATCH /api/threads/{id}` for visibility with a direct-`fetch` fallback that has a hardcoded URL (`components.md` #10).

Shared view (`/share/<id>`, `share/index.html` + `components/SharedThreadView.js`, 368 lines): loads thread and messages with unauthenticated `GET {baseUrl}/api/threads/{id}` and `/messages` (baseUrl falls back to `http://localhost:5079`), renders header, mode label, meta, turns (markdown via marked + DOMPurify), footer CTA. States: full-screen loading overlay, "Invalid share link", "Failed to Load" with Retry.

- Problems:
  - Share links are dead: the Worker rewrites `/share/<id>` to `/share/index.html`, the asset server answers `307 -> /share/`, and the id is lost (`KNOWN_ISSUES.md` #3, `worker.js:146-165`). Workaround today: `/share/?id=<id>`.
  - Behind the waitlist gate, share links go to the waitlist page unless the visitor has the preview cookie.
  - Loads `marked` unpinned and highlight.js without SRI (`share/index.html:20-23`).
  - Hardcoded `#4AABC2` inline styles in the loading overlay (`share/index.html:46-68`, `content-marketing.md` #7).
  - `_modeLabel` uses emoji, inconsistent with the app labels (`components.md` #12). Separate `renderMarkdown()` duplicates `ChatView`'s (`components.md` #11).
  - No OG metadata per share (static title "Shared Thread"), so link previews are generic.
  - `X-Frame-Options: DENY` set for all pages, so share pages cannot be embedded.

### 3.5 Leaderboard (three implementations)

1. Page `/leaderboard/` (`leaderboard/index.html`, `js/leaderboardPage.js`, `css/leaderboard-page.css`): header with refresh and login icon, `<h1>` plus a `#leaderboard-root` table (rank, model, ELO, win-rate bar, votes), three stat cards (models, top model, totals), skeleton rows, then roughly 7 long SEO sections (what it is, how ranked, Elo, top models, why, contribute, future).
2. In-app modal (`js/ui/leaderboardModal.js`, 281 lines) opened from the sidebar; reloads after a vote.
3. Waitlist page section (`waitlist-worker/src/components/Leaderboard.tsx`) reading the same stats endpoint with no auth.

- API: `GET /api/arena/model-stats` (via `api.arena.getModelStats`). The page calls `isAuthenticated()` first and shows "Please login in the main app first" when logged out (`js/leaderboardPage.js:~105-112`), although the waitlist page proves the endpoint is public (README: "no token; the API allows any origin").
- States: skeleton, error and empty via `renderState`, refresh button, win-rate bars animate after render.
- Problems:
  - Public SEO page requires login to show data, and does not load `tokens.css` (`styles.md` #2), so many `var(--*)` resolve to nothing.
  - Page loads `Inter` while the brand font is Outfit (`styles.md` #3).
  - `js/leaderboardPage.js:1-9` and the modal each define their own escape / normalize helpers; field names are read as both camelCase and snake_case (`eloScore ?? elo_score`).
  - No filters, history or model detail; roadmap item 10 asks for time range, provider, family, sparkline, drawer.
  - Inline `style="width"` bars (`styles.md` #13). Modal title uses `font-family: 'Do Hyeon'` which is not loaded (`styles.md` #9).
  - Header uses `.about-page` classes defined in `leaderboard-page.css` (`styles.md` #6).
  - `/leaderboard/` does not have a link back to the Arena other than the login icon; no shared nav.
  - Static SEO article text can contradict live data.

### 3.6 Models (`/models/`)

- Contains: `<h1>` "AI Models Comparison", featured cards and long editorial sections for GPT-4, Claude 3, Gemini 1.5, Llama 3, Mistral Large, "How to choose", "Future". No JS data.
- Problems: content is static and stale (older model generations); not linked from app navigation; no `og:` tags; no `tokens.css`; Inter font; header login icon only. Candidate to be generated from `/api/arena/model-stats` (see waitlist `Leaderboard` and `ModelMarquee`).

### 3.7 Auth screens

Canonical flow today: `login-modern.html`, `signup-modern.html`, `forgot-password.html`, `update-password.html`, `auth-callback.html`. All load `config.js`, Supabase from unpkg (`@supabase/supabase-js@2`, unpinned) and `js/auth/supabase-init.js`; the first two also load `libphonenumber-js@1.10.44` and `js/auth-modern.js` (906 lines).

| Screen | Contents | Calls |
|---|---|---|
| Login (`login-modern.html`) | Hero "Welcome Back", tabs Email / Phone, password field, 6-box OTP entry, "Forgot password?", GitHub and Google buttons, link to sign up | `signInWithPassword`, `signInWithOtp`, `verifyOtp`, `signInWithOAuth(github|google)` |
| Sign up (`signup-modern.html`) | Hero "Join the Arena", name, email or phone, password with breach-database check (pwned check) and strength, OTP step, profile step for phone | `signUp` with `emailRedirectTo = <origin>/auth-callback.html`, `signInWithOtp`, `verifyOtp`, `updateUser` |
| Forgot (`forgot-password.html`) | Email field, confirmation message | `resetPasswordForEmail` with `redirectTo = <origin>/update-password.html` |
| Update password | New / confirm password | `updateUser({password})`, then to `login-modern.html` |
| Auth callback | Spinner, "Verifying Session", success check, 3 s countdown, error with back link | `getSession`; routes `type=recovery` to `./update-password.html` + hash, signup / email confirmation to `./index.html`; sends welcome email via a Supabase Edge Function (`js/resend-auth-email.js`) |

Redirect handling: `?redirect=` is validated against same-origin in `auth-modern.js` (`~822-830`), default `index.html`. OAuth uses `redirectTo || window.location.origin`.

Problems:
  - `auth-callback.html:213` imports `./js/supabase-auth.js`, which does not exist (the file is `js/auth/supabase-auth.js`). The module fails to load, so the email-confirmation / recovery landing page is broken: it never reaches its success branches. Supabase `emailRedirectTo` points at this page (`js/auth/supabase-auth.js:90,251,283`). Confirm in a browser before relying on it; main app still works because `supabase-init.js` consumes the hash session on `/`.
  - `login/auth-complete.js` has undefined `emailInput`, `setLoading`, `supabaseClient`, `SITE_URL`: crashes the older `/login/` email and phone flow (`docs/UI_ROADMAP.md` P0 #1, `CODEBASE_AUDIT.md` 5.1).
  - Three login implementations and two storage key variants: `/login/` writes `dualmind.auth.supabase` itself, `/login/login/` uses inline code with a different redirect rule (`login/login/index.html:384`).
  - `/login/` checks admin via `GET /api/admin/check` and then navigates to `../../DM_admin_UI/public/admin.html`, a path outside this repo (`login/index.html:510-521`). The admin UI is not part of this frontend.
  - Nav icons on `leaderboard/` and `models/` link to `/login/` (old page), while the app redirects to `login-modern.html`.
  - `auth-modern.js` is a 906-line module with global DOM lookups, a `customModal` import, and password breach check via third-party range API.
  - Inter font on `/login/` and `/login/login/`; `auth-ui-fixes.css` missing on forgot-password (`styles.md` #12); `auth-modern.css` defines its own `:root` (`styles.md` #7).
  - `auth-verify.html` and `verify.html` are developer diagnostics that expose internals; the first ships to prod.
  - `remixicon` loaded in two versions (3.5.0 on auth pages, 4.3.0 on info pages).

### 3.8 About, How it works, FAQ (info pages)

- Shared shell from `css/info-pages.css` (743 lines): `.ip-header` with logo, links (How it works, FAQ, "Try Arena"), hero, chips, content cards, footer links and legal row. Font Outfit, favicon inline SVG, canonical + robots meta present.
- About: hero, mission and vision cards, "What DualMind Arena offers", "Join the Community", footer.
- How it works: steps, battle modes, transparency and privacy.
- FAQ: accordion (inline script), categories.
- Problems:
  - No mobile nav: the header links hide or crowd (only 2 `@media` blocks in `info-pages.css`).
  - No `theme.js`, no theme toggle; dark only.
  - Footer link sets differ per page; "Leaderboard" and "Models" are not in the header.
  - No `og:` / twitter tags on About, How, FAQ, legal; descriptions only on some pages.
  - Emoji logo (`⚡`) differs from the SVG four-square mark in the app favicon.
  - Duplicated nested versions exist (see URL map).

### 3.9 Careers (`/careers/`)

- 692 lines of inline-styled HTML with filters (department, location, type) and a count of 16 positions, copied from another company's page (brand text "LMArena", Bay Area roles, footer links `#`). Not linked from any navigation, but listed in the Worker sitemap.
- Problems: wrong brand and fake openings (`content-marketing.md` #2, Critical); own inline design system; `Inter`; duplicate at `careers/careers/`.

### 3.10 Legal: privacy, terms, cookies

- `info-pages.css` shell with sticky TOC and an IntersectionObserver for the active link (inline script).
- Problems: policy text lists analytics, A/B testing and marketing opt-out that the codebase does not implement, while a monetag meta and an ad `ads.txt` exist; no cookie consent banner (`content-marketing.md` #5). Footer in the app links to `./terms/` relative paths, fine only from `/`. Waitlist footer links to `dualmindlab.tech/privacy` and `/terms` (different origin, different documents). Contact addresses on pages: `privacy@`, `support@dualmindlab.tech`; waitlist uses `hello@`.

### 3.11 Waitlist (`early.dualmindlab.tech`, `waitlist-worker/`)

The newest page and the best design reference.

- Stack: React 19.2, Vite 7, Tailwind 4.3 (`@tailwindcss/vite`), motion 12, prerender via `scripts/prerender.mjs`; fonts Bricolage Grotesque (variable), DM Mono, Playfair Display (self-hosted via fontsource). Components from React Bits (LightRays, BlurText, DecryptedText, Magnet, SpotlightCard, CountUp, LogoLoop) and Magic UI (BorderBeam); React Bits license is MIT + Commons Clause.
- Sections (`src/App.tsx`): skip link, `Nav` (How it works, Leaderboard, Docs), `Hero` with signup form and live stats strip, `ModelMarquee`, `ValuePoints` (3 cards), `BattleDemo` (scripted blind battle with reveal), `Leaderboard` (live ELO), `ClosingCta`, `Footer`, grain overlay.
- Tokens (`src/styles.css:10-28`): ink `#0f1115`, surface `#13161c`, elevated `#1a1e25`, cyan `#00d9ff`, violet `#8b5cf6`, terra `#cb9275`; differs from the app's cyan `#4AABC2` and black surfaces.
- States: success / duplicate / invalid / rate limited / network error / returning visitor / legacy local signup; leaderboard falls back to a text line if the API fails; reduced motion honoured; `noscript` fallback.
- API: `POST /api/signup` (D1, honeypot, per-IP limit, same-origin check) and `GET https://api.dualmindlab.tech/api/arena/model-stats`.
- localStorage: `dualmind_waitlist_joined`, legacy `dualmind_waitlist`.
- Tests: Playwright incl. axe, desktop and 360 px mobile screenshots (`waitlist-worker/tests/`, workflow `.github/workflows/waitlist.yml`).
- Problems: legal and "company" links point to a different domain (`LINKS` in `src/content/links.ts`); `waitlist-worker/worker.js` logs every request including `ip` (console log, observability logs disabled in config); design language (violet, Bricolage) is not shared with the Arena.

### 3.12 404 (`404.html`)

- "Lost in the Arena?" with remixicon, Outfit; inline CSS (176 lines); status 404 set by the Worker. Visual style differs from the app (not using tokens). Fine to keep as template.

### 3.13 Admin, settings, profile, history

- Admin: none in this repo. `/login/` redirects admins to `../../DM_admin_UI/public/admin.html` (separate repo, `PROJECT_HEALTH_REPORT.md` mentions an Admin UI on port 3000). Feature flags: `js/feature-flags.js` shows a "tester" badge and credits (`role-tester` body class) after a `POST /api/users/sync` role check; `wrangler.jsonc` binds a Flagship app `FLAGS` that the Arena Worker does not read.
- Settings: only the sidebar popup (user card, legal links, log out). No theme, model preferences, data export, delete account, password change screen, profile edit, or avatar upload UI, even though `supabase-auth.js` has `updateProfile`, `changePassword`, `updatePhone` and `config.js` names a `avatars` storage bucket. `css/user-profile.css` (115 lines) styles the footer popup only.
- History: sidebar "Recent Chat" list only (limit 20, no search, no date grouping, no pagination). Rename / delete via icon buttons shown on hover; `UI_ROADMAP.md` item 6 asks for search, grouping, pin, context menu.
- Export: header Export button opens a dropdown (md, json, csv, html, pdf) from `js/chatExport.js`.

### 3.14 PWA and offline

- `manifest.json` (name "DualMind Arena", theme `#8ab4ff`, background `#0f1115`, portrait): not linked from any page; icons `assets/icons/icon-*.png` are missing (only `background.png`, `battleimage 1.png`, `logo.png` in `assets/`).
- `sw.js`: `importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')` with a zone id: a third-party ad / push-notification script. It is never registered by any page (`grep serviceWorker` finds nothing), so it is inert today; if someone registers it it would run remote code (`core-app.md` #2, Critical).
- No real offline support: no cache strategy, no offline page. The in-app "offline mode" means mock replies when the backend is down.
- `theme-color` meta is `#000000` on the app, `#0f1115` on info pages and `#8ab4ff` in the manifest.

## 4. Cross-cutting findings

### 4.1 CSS and design tokens

| Item | Finding |
|---|---|
| Files | 16 stylesheets in `css/` (about 11.6k lines) + root `arena-redesign.css` (487, unreferenced, `styles.md:54`) + `login/login/style.css` (665) + inline `<style>` blocks (careers, 404, login, auth-callback) |
| Main app load | 12 render-blocking CSS files in `index.html:46-76` (`tokens`, `styles`, `auth-styles`, `model-selector`, `sidebar-actions`, `leaderboard-page`, `ui-improvements`, `voting-ui`, `ai-input`, `share-modal`, `custom-modal`, `user-profile`) |
| Tokens | `css/tokens.css` (208 lines, 96 variables, 4 `:root` blocks) claims to be the single source; `auth-modern.css`, `ui-improvements.css` (12 vars), `voting-ui.css`, `ai-input.css` define more. `styles.css` uses undefined vars (`--color-white`, `--color-primary`, `--glass-dark`, `--shadow-glow`, etc., `styles.md` #1). `ai-input.css` uses undefined `--primary-color` |
| Missing token loads | `leaderboard/` and `models/` do not link `tokens.css` (`styles.md` #2) |
| Themes | Dark only. `theme.js` reads `localStorage['theme']` (default `dark`) and sets `data-theme`, but nothing in the repo ever writes that key, no toggle exists, and no main stylesheet has `[data-theme="light"]` rules (only nested clone pages do). `theme.js` is not loaded by the app or info pages. `prefers-color-scheme` unsupported in the app (`styles.md` #10) |
| Palettes in use | App: cyan `#4AABC2`, terra `#CB9275`, teal `#577B87`, cream `#FDF4CD` on black. Info pages: `#8ab4ff` accent on `#0f1115`. Waitlist: cyan `#00d9ff`, violet `#8b5cf6`, ink `#0f1115`. Three palettes |
| Duplication | Duplicate class definitions across files (`styles.md` #5); `!important` and inline style drift in JS templates (`styles.md` #8) |
| Responsive | `styles.css` 10 `@media`, `ui-improvements.css` 9; breakpoints used: 480, 640, 768, 1024; `arena-redesign.css` declares a mobile-first grid that nothing loads |
| Dead CSS | `ai-input.css` (451 lines) is linked from `index.html` but reported orphaned by `styles.md` #4; `arena-redesign.css`; nested `style.css` references that 404 |

### 4.2 Fonts and icons

- Brand font Outfit (+ JetBrains Mono) in the app and info pages; `Inter` on `/login/`, `leaderboard/`, `models/`, `careers/` and nested clones; `Do Hyeon` referenced but not loaded; waitlist uses Bricolage Grotesque + DM Mono + Playfair. All app fonts are Google Fonts with `preconnect`; waitlist fonts are self-hosted.
- Icons: in-app inline SVG factory `js/icons.js` plus inline SVGs in `ChatView.js` (duplicated, `components.md` #15); Remix Icon CSS font from jsDelivr (two versions) on info, auth and 404 pages; emoji (`⚡`, status emoji) in info-page logo, share view, auth-verify; waitlist has its own `icons.tsx`.
- Favicon: inline SVG data URI, two different designs (four-square mark in app, hex-ish bolt on info pages); no PNG / apple-touch icons in the Arena; `assets/logo.png` exists.

### 4.3 Theme toggle and mobile nav

- Theme toggle: none (see 4.1).
- Mobile nav: app has a drawer sidebar (`Sidebar.isMobile`, `toggle-mobile-menu`). Info, legal and marketing pages have no hamburger or collapsed nav. No bottom tab bar. Leaderboard header has only refresh and login icon buttons.

### 4.4 Accessibility

- Positive: skip link on the app and waitlist, `role` + `aria-label` on landmarks, `aria-haspopup` / `aria-expanded` / `menuitemradio` on the mode dropdown, `prefers-reduced-motion` in `ui-improvements.css:57`.
- Gaps: no focus trap or `role="dialog"` / `aria-modal` on `ShareModal` and `CustomModal` (`components.md` #6, #7); only 6 `:focus-visible` rules vs 14 `outline: none` rules across `css/`; icon-only buttons below 40 px; vote result and streaming updates are not announced (3 live-region / status / alert hits in the app code); contrast of `--color-terra` on dark unverified (`UI_ROADMAP.md` item 13); several pages lack `<main>`/heading order checks; emoji used as sole icon in places; `confirm()` / `alert()` used for errors.
- No automated a11y tests for the Arena (the waitlist has axe via Playwright).

### 4.5 SEO and meta

- Canonical + robots meta on info pages and leaderboard / models only; none on the app, login, share, 404.
- `og:image` references `/assets/og-image.png` which is absent; the Worker serves a 1x1 PNG at `/og-image.png` only.
- Two sitemaps: root `sitemap.xml` (7 URLs) vs Worker-generated (11 URLs incl. `/login/`, legal); Worker wins at runtime (`content-marketing.md` #6). `lastmod` is stale (2026-01).
- Whole domain currently redirects with 302 to the waitlist, so no Arena page is crawlable.
- `<title>` patterns are inconsistent ("Duel_mind Arena", "LMArena", "AMU - Account").

### 4.6 Performance

| Item | Detail |
|---|---|
| Scripts on `/` | 9: highlight.js, marked, DOMPurify, `config.js`, inline error handler, `supabase-init.js`, `app.js` module, `feature-flags.js`, nomodule fallback |
| Blocking | `config.js` sync in `<head>`; 12 CSS files; Google Fonts CSS; `login-modern.html` loads Supabase UMD from unpkg synchronously plus libphonenumber (large `max` bundle) |
| Supabase | Loaded as ESM from jsDelivr at `supabase-init.js` via dynamic import, and again via UMD on auth pages: two copies and versions (2.43.0 ESM vs `@2` UMD) |
| CDN dependencies | cdnjs (highlight.js 11.9.0 + theme), jsDelivr (marked unpinned, DOMPurify 3.1.6, remixicon 3.5.0 / 4.3.0, libphonenumber 1.10.44, supabase 2.43.0), unpkg (supabase `@2`), Google Fonts |
| Caching | Worker sets `no-store` on all HTML, JS, CSS and JSON, so every visit re-downloads the whole app; images are `immutable` for a year without hashed names (`worker.js:~228-236`) |
| Startup | 500 ms hardcoded sleep + sequential `await` of auth, user sync, backend health, models (`js/ui/app.js:90-175`) |
| Images | `assets/background.png` and `battleimage 1.png` are full PNGs (not measured here); no `loading`, `width`, `height` attributes on app images |
| Build | no minification, no bundling, 125+ files copied; `build.js` lists `og-image.png` and `terms.html` that do not exist |

### 4.7 Security notes (frontend, stated neutrally)

- Tokens: Supabase session in `localStorage` (`dualmind.auth.supabase`, plus the legacy `dualmind.auth.token` removed on logout) readable by any script on the origin, so XSS equals session theft. Third-party scripts (CDNs without SRI, an inert ad service worker) widen that surface.
- Rendering: 53 `innerHTML` assignments across `js/` and `components/` (13 in `app.js`). Model output goes through `marked` then `DOMPurify.sanitize(html, {USE_PROFILES:{html:true}})` when DOMPurify is present, otherwise falls back to `sanitizeHTML(text)` (escaping); see `ChatView.js:80-90`, `SharedThreadView.js:351`. `CustomModal` writes `message` / `title` / `itemName` into `innerHTML` unescaped (`components.md` #2, Critical). Thread titles (user-controlled) render in the sidebar via `escapeHtml`. The global error banner interpolates a message string into `innerHTML` (`index.html:~100`).
- Config: Supabase URL and anon key are public by design but are committed in `config.js`, with a `process.env` branch that cannot run in a browser (`config.js:119-120`, `core-app.md` #1). Key values are intentionally not copied into this document.
- Worker: `Access-Control-Allow-Origin: *` on `/api/*` and all request headers (including `Authorization`) forwarded to the backend; responses add `x-dualmind-proxy-backend` and `x-dualmind-proxy-path` headers revealing the backend origin; proxy errors return `error.toString()` (`worker.js:87-130`; `core-app.md` #5-7). No CSP. `X-XSS-Protection` is deprecated. Preview bypass code is public.
- Redirect parameter `?redirect=` is validated to same-origin in `auth-modern.js` but `app.js` encodes the path only.
- Shared threads are fetched without auth; privacy depends entirely on the backend honouring `visibility` (private / unlisted / public) and on thread-id unguessability.

### 4.8 Analytics, ads, third-party

Stated neutrally: no analytics script is loaded (no GA, Plausible, etc.). Monetisation-related items exist: `<meta name="monetag">` in `index.html:6`, `ads.txt` with a Google pub id (root file and Worker string), and `sw.js` importing `3nbf4.com`. `privacy/` and `cookies/` describe analytics cookies and ad-related data use in general terms. The waitlist stores email, `ref`, country and a truncated user agent in D1 and does not store IP. Decision for the lead: whether any ad / monetisation element belongs in the redesign.

### 4.9 Tests and tooling

- One Playwright spec (`tests/auth-flow-redesign.spec.js`) against `localhost:8000` login and signup pages; `playwright.config.js` present; CI (`.github/workflows/ci.yml`) runs ESLint v10 flat config. `docs/CODEBASE_AUDIT.md` section 2 reports `npm test` failing without Playwright installed (re-check against current CI).
- Waitlist has the only real test and screenshot suite.
- Ad-hoc scripts in root: `test-everything.js`, `test-supabase-auth.js`, `mock-api-server.js`, `performance-monitor.js`, `commit_and_push.*`, `start.bat`, `startup.bat`.

## 5. Must-preserve behaviour for the migration

Treat each row as an acceptance check.

| # | Behaviour | Where defined | Notes |
|---|---|---|---|
| 1 | Supabase email confirmation link target `https://arena.dualmindlab.tech/auth-callback.html` (hash carries `type=signup` / `email_confirmation` / `recovery`) | `js/auth/supabase-auth.js:90,251,283` | Path must keep resolving, or allow-list the new path in Supabase and keep a redirect |
| 2 | Password reset link target `/update-password.html` (`redirectTo`), receives recovery hash | `js/auth/supabase-auth.js:216`, `auth-callback.html` | Same; legacy `/login/` uses `/auth-callback.html?mode=resetPassword` |
| 3 | OAuth (GitHub, Google) `redirectTo = origin` (root) and returns hash/code to `/` | `js/auth/supabase-auth.js:645`, `js/auth-modern.js:539` | Supabase redirect allow-list must contain every new origin / path |
| 4 | `?redirect=<path>` on login is honoured after sign-in; default is `/` | `js/auth-modern.js:~822` | Keep same-origin validation |
| 5 | Logged-out visit to the app redirects to login with `redirect`, with a loop guard in `sessionStorage['auth_redirect_attempted']` | `js/ui/app.js:119-135` | |
| 6 | Session storage key `dualmind.auth.supabase` (also read by `HttpClient`, `resend-auth-email.js`, `authProvider.js`); legacy `dualmind.auth.token`, `supabase.auth.token` | `js/api/core/HttpClient.js`, `js/api/utils/authProvider.js:65` | Changing the key logs everyone out; migrate or read both |
| 7 | Other localStorage keys: `battle.model.left`, `battle.model.right`, `direct.model`, `dualmind.api.baseUrl`, `theme`, pending user-sync and pending vote queues (see `app.js:1527-1650`), `dualmind.auth.welcome-confirmed:<userId>` (sessionStorage) | `components/chat/ChatView.js`, `js/ui/app.js` | |
| 8 | Share link format `/share/<threadId>` (uuid-like `[a-f0-9-]+`) and fallbacks `?id=`, `?thread=`, `?threadId=`; visibility values `private`, `unlisted`, `public` | `ShareModal.js:33`, `SharedThreadView.js:26-45` | Existing links in the wild use `/share/<id>`; make them work |
| 9 | Vote payload `{comparisonId, voteChoice: left|right|tie|both-bad, userId, voteDurationMs}` to `/api/arena/model-vote`; offline vote queue and flush | `js/ui/app.js:1154-1230`, `ArenaService.js:96-125` | |
| 10 | Battle flow: anonymous names until vote, reveal after, hide loser unless tie / both bad, show-hidden toggle | `ChatView.js:327-427` | |
| 11 | Streaming over SSE (`Accept: text/event-stream`, `data: ` lines) for chat; `dualchat` for battles | `HttpClient.js:253-310` | |
| 12 | Thread APIs: list (limit 20), get, messages, create, rename (PATCH title), delete, visibility; `threads-changed` refresh | `ThreadService.js`, `Sidebar.js` | |
| 13 | User sync `POST /api/users/sync` after login (also drives tester role / credits badge) | `js/ui/app.js:1479`, `js/feature-flags.js` | |
| 14 | Export formats md, json, csv, html, pdf | `js/chatExport.js:264-292` | |
| 15 | Keyboard: Ctrl/Cmd+K focus input, Ctrl/Cmd+B toggle sidebar (mobile), Esc closes drawer | `js/ui/app.js:1936` | |
| 16 | Mode toggles: web search and code mode are mutually exclusive | `js/ui/app.js:26-52` | |
| 17 | `/api/*` same-origin proxy and `/api/health -> /health` mapping; waitlist gate with `?preview=dualmind-preview` / `?preview=off` and `ref=arena` parameter | `worker.js` | Keep until launch, then switch `FORCE_WAITLIST` off deliberately |
| 18 | All public URLs in section 2 keep answering (301 for duplicates); `/login/`, `/login-modern.html`, `/signup-modern.html`, `/forgot-password.html`, `/update-password.html`, `/auth-callback.html`, `/about/`, `/how-it-works/`, `/leaderboard/`, `/models/`, `/faq/`, `/careers/`, `/privacy/`, `/terms/`, `/cookies/`, `/share/*` | `build.js`, `sitemap.xml` | |
| 19 | Waitlist signup contract `POST /api/signup {email, ref}` and `ref` query param, `localStorage['dualmind_waitlist_joined']` | `waitlist-worker/README.md` | |
| 20 | Leaderboard data from `GET /api/arena/model-stats` (fields read as camelCase or snake_case: `eloScore`/`elo_score`, `winRate`/`win_rate`, `displayName`/`modelName`/`model_name`) | `js/leaderboardPage.js`, waitlist `arena-stats.ts` | |
| 21 | Config contract `window.DUALMIND_CONFIG` (`apiBaseUrl`, `backendUrl`, `supabase.url`, `supabase.anonKey`, `auth.mode`, `offline`, `features`) | `config.js` | Any rewrite should read the same values from env at build time |
| 22 | Cache and security headers on assets (`nosniff`, `DENY`), custom 404 with status 404 | `worker.js` | |

## 6. Redesign scope

Complexity: S = under a day, M = 1-3 days, L = a week or more. Priority per the brief: P0 core, then P1, P2.

| Screen / flow | Priority | Complexity | Notes |
|---|---|---|---|
| Landing (public home with demo, aligned to waitlist design) | P0 | L | Does not exist in the Arena origin; reuse waitlist components |
| Arena shell (sidebar, header, input) | P0 | L | Breaks up `app.js` and `Sidebar.js`; mobile drawer and thread search |
| Battle view: streaming, vote, reveal | P0 | L | Stacked / swipe mobile layout, reveal moment, a11y announcements |
| Direct chat mode | P0 | M | Shares the chat view |
| Auth: login, signup, OTP, OAuth | P0 | L | Consolidate 3 login implementations into one; keep Supabase contract |
| Auth: callback, forgot, update password | P0 | M | Fix broken `auth-callback.html` import; keep paths |
| Leaderboard (page + in-app) | P0 | M | One component, public data, filters later |
| Share view and share modal | P0 | M | Fix `/share/<id>` routing first (S), then restyle |
| Models hub | P1 | M | Replace static article with data-driven pages |
| Settings / profile / history management | P1 | M | New: theme, profile, password, data export, delete account |
| Info pages: about, how it works, FAQ | P1 | S | Shared shell, shared mobile nav, fix meta |
| Legal: privacy, terms, cookies | P1 | S | One template; reconcile text with real behaviour |
| 404 | P1 | S | Use new tokens |
| Design system: single token file, one theme mechanism (dark + light), self-hosted fonts | P0 | M | Foundation for all of the above |
| Waitlist | P2 | S | Keep; share tokens and nav with new site |
| Careers | P2 | S | Remove or replace; do not ship third-party content |
| PWA manifest, icons, offline | P2 | M | Needs icons and a first-party service worker |
| Analytics / ads / consent | P2 | M | Needs a product decision first |
| Admin UI (external repo) | P2 | L | Out of this repo; keep `/api/admin/check` link behaviour |
| Cleanup: delete dead pages, CSS and clones; add redirects | P0 | S | Do early so the redesign does not restyle dead files |

## 7. Suggested order of work (for the plan)

1. Decide URL canonicals and redirect table (section 2), fix `/share/<id>` and `auth-callback.html` import (both small, high impact).
2. Establish one tokens file and a theme toggle, then rebuild the shell components.
3. Rebuild auth, then arena, then public pages, keeping the checklist in section 5 green.
4. Switch off `FORCE_WAITLIST` last, after the preview cookie has been used for QA.
