# AGENTS.md — DualMind Arena

Guidance for AI agents (and human developers) working in this repository.

**IMPORTANT:** This repo is in active cleanup. The canonical source of truth for structure and known issues is this file; if code and this file disagree, update either the code or this file before proceeding.

---

## Commands

```bash
npm install              # Install dependencies (currently only eslint, serve, http-server)
npm run dev              # Static dev server on http://localhost:8000 (npx serve . -p 8000)
npm run lint             # ESLint all JS files — BROKEN unless globs are quoted
cd admin-email-system && ...notify_on_complete # separate admin panel sub-project
npm run lint:fix         # Auto-fix lint issues (same broken glob — fix package.json first)
npm run test             # Playwright tests — BROKEN: @playwright/test not in devDependencies
npm run validate         # lint + test — BROKEN for both reasons above
npm run build            # Copy files to ./dist via build.js
npm run deploy           # build + npx wrangler deploy (uses wrangler.jsonc)
node build-deploy.js     # Alternative build script with a different file set
```

**Tooling fixes that must be done first:**
1. `package.json` lint glob `admin-email-system/**` is unquoted and fails on shells that expand `**`. Add double quotes around every `--ignore-pattern` value.
2. Add `@playwright/test` to `devDependencies` (and optionally a browser install step) or remove `npm run test`.
3. `eslint` is on v8; if upgrading to v10, update `.eslintrc.json` to flat config.

---

## Deployment

Cloudflare Workers via `wrangler.jsonc`. The Worker (`worker.js`) proxies `/api/*` to the backend and serves static assets from the `ASSETS` binding pointing at `dist/`.

**Inconsistent build/deploy files to be aware of:**
- `build.js` copies a curated set of files to `dist/`.
- `build-deploy.js` copies a different set (including admin-email-system) and prints `wrangler deploy --config wrangler-dist.toml`.
- `package.json` deploy uses `wrangler.jsonc`.
- `wrangler-dist.toml` exists but is separate from `wrangler.jsonc`.

Do not add a third build script. Choose one pair (prefer `build.js` + `wrangler.jsonc`) and delete the other.

---

## Architecture

**Primary app:** Vanilla JS (no framework), served as static files.

The repo also contains several prototype fragments that are **not wired to production:**
- `App.jsx` — React prototype.
- `next-dualmind/` — Next.js prototype.
- `old-html-backup/` — archived HTML.
- `arena-core.js` — older arena class (not imported by `index.html`).
- `js/auth.js`, `js/auth/api-service.js`, `js/api-client.js` — legacy/deprecated shims.

### Request Flow

```
Browser → Cloudflare Worker (worker.js)
            ├── /api/*    → Azure backend (api.dualmindlab.tech or BACKEND_URL env)
            ├── /share/*  → share/index.html  (SPA route)
            └── /*        → static assets (Cloudflare ASSETS binding / dist/)
```

In local dev (`npm run dev`), the browser hits the backend directly. `config.js` detects `localhost` and sets `apiBaseUrl` to `http://localhost:5079`.

### App Modes

Managed by `App.state.currentMode` in `js/ui/app.js`:

| Mode | Description |
|------|-------------|
| `battle` | Anonymous dual-model comparison — model names hidden until vote |
| `arena` | User picks model pair, sees names upfront, side-by-side |
| `direct` | Single-model chat |

Mode changes are dispatched as `mode-change` CustomEvent and handled surgically in `components/Header.js` (no full re-render).

---

## Key Files Map

### Entry Points

| File | Purpose |
|------|---------|
| `./config.js` | **Loaded first and synchronously.** Sets `window.DUALMIND_CONFIG` — backend URL, Supabase credentials, feature flags, streaming settings. Detects localhost to switch API base. |
| `./index.html` | Main app shell. Defines CSS load order, favicon, global error handler, JS module imports. |
| `./worker.js` | Cloudflare Worker: CORS, API proxy, SPA routing, static asset serving, caching headers. |
| `./wrangler.jsonc` | Cloudflare Worker config: `main: worker.js`, `assets.directory: dist`. |

### Core JS

| File | Purpose |
|------|---------|
| `js/ui/app.js` | **Main `App` class (2,112 lines).** Orchestrates components, global state, auth gating, mode switching, chat submission, streaming, voting, thread management. Exposes `window._APP`. |
| `js/apiInstance.js` | Exports singleton `api` — preferred import for all API calls. |
| `js/api/DualMindApi.js` | Canonical API client facade. Aggregates services: `api.arena`, `api.threads`, `api.models`, `api.users`. |
| `js/api/core/HttpClient.js` | Base HTTP client. Handles auth headers, retry with exponential backoff, AbortController cancellation, SSE streaming. |
| `js/api/services/ArenaService.js` | `chat()`, `chatStream()`, `dualChat()`, `textToSpeech()`, `submitVote()`, `getLeaderboard()` |
| `js/api/services/ThreadService.js` | `getThreads()`, `getThread()`, `getThreadMessages()`, `createThread()`, `updateThread()`, `deleteThread()` |
| `js/api/services/ModelService.js` | `getModels()`, `getModelDetails()` |
| `js/api/services/UserService.js` | `syncUser()`, `getUserProfile()` |
| `js/api/utils/authProvider.js` | `getAuthToken()`, `isAuthenticated()`, `getUserId()` — abstracts token retrieval |
| `js/api/utils/extractors.js` | Normalizes raw API responses: `extractChatResponse()`, `extractDualChatResponse()` |
| `js/api/utils/errors.js` | Custom error classes: `ApiError`, `TimeoutError`, `NetworkError`, `normalizeError`, `createErrorFromStatus` |
| `js/api/utils/errorHandler.js` | Centralized error processing |
| `js/api/utils/errorMessages.js` | User-friendly error message map |
| `js/api-client.js` | **Deprecated shim** — do not import in new code. |
| `js/api/apiClient.js` | Another old HTTP wrapper; prefer `DualMindApi`. |
| `js/mockArena.js` | Mock responses for offline mode. Exports: `pickModelPair()`, `buildMockReply()`, `streamText()`. Used by `js/ui/app.js` when backend unavailable. |
| `js/icons.js` | Centralized SVG icon factory. All icons are functions `(color, size) => svgString`. Add new icons here — never inline SVGs in component templates. |
| `js/ui/leaderboardModal.js` | `LeaderboardModal` class. Fetches and renders model rankings. Navigates to `./leaderboard/` route. |
| `js/chatExport.js` | `ChatExport` class. Exports conversations to MD, JSON, CSV, HTML, PDF. Lazy-loaded via `import()`. |
| `js/auth/supabase-auth.js` | `SupabaseAuthService` class. Full auth lifecycle: signUp, signIn, signOut, OTP, social providers, password reset/update, session management. |
| `js/auth/supabase-init.js` | Instantiates `SupabaseAuthService` from `window.DUALMIND_CONFIG.supabase`, attaches to `window.DualMindAuth`. Dispatches `user-logged-in` / `user-logged-out`. |
| `js/auth-modern.js` | Handles auth callbacks (social login redirects), phone binding enforcement for new users. |
| `login/auth-complete.js` | Additional email/phone/OTP logic used by `login-modern.html`. **BROKEN:** references undefined `emailInput`, `setLoading`, `supabaseClient`, `SITE_URL`. |
| `js/auth-examples.js` | **Dev-only** usage examples for auth — not imported in production.
| `js/api/examples.js` | **Dev-only** API usage examples — not imported in production. |
| `js/feature-flags.js` | Role-based UI gating (tester badge/credits) via MutationObserver. |
| `theme.js` | Theme toggle (dark/light) using `localStorage`. |
| `performance-monitor.js` | Runtime FPS/network performance monitor. |

### Components

| File | Renders | Key State |
|------|---------|-----------|
| `components/Header.js` | Top nav: mode selector dropdown, share/export buttons | `currentMode`, `isDropdownOpen` |
| `components/Sidebar.js` | Left panel: logo, nav items (New Chat, Leaderboard), thread list, footer settings menu | `isOpen`, `isCollapsed`, `isMobile`, `recentChats[]` |
| `components/ChatInput.js` | Textarea, send button, web search/code-mode toggles, prompt chips, attachment/voice | `value`, `isLoading`, `attachments[]` |
| `components/chat/ChatView.js` | Scrollable turn list: user prompts + dual/single response cards, model badges, expand/copy/speak actions | `mode`, `turns[]`, `direct[]`, `apiEnabled` |
| `components/CustomModal.js` | Generic modal (confirm/delete/edit) + toast notification system | modal state, toast queue |
| `components/ShareModal.js` | Share thread modal: visibility toggle, copy link | `open`, `threadId`, `shareLink`, `visibility` |
| `components/SharedThreadView.js` | Read-only public view of a shared thread (`/share/*` routes) | `threadData`, `loading`, `error` |
| `components/SkeletonLoader.js` | Shimmer placeholder for loading states | stateless |

### Auth pages

- `login-modern.html`, `signup-modern.html`, `forgot-password.html`, `update-password.html`, `auth-callback.html`, `auth-verify.html`, `verify.html`
- They load `config.js` + `js/auth/supabase-init.js` + specific JS (`login/auth-complete.js`, `js/auth-modern.js`, etc.).
- They do **not** load `js/ui/app.js`.

### Standalone pages

- `leaderboard/index.html` + `js/leaderboardPage.js`
- `share/index.html` + `components/SharedThreadView.js`
- `about/`, `careers/`, `faq/`, `how-it-works/`, `models/`, `privacy/`, `terms/`, `cookies/` — static info pages.

### Admin sub-project

`admin-email-system/` is a separate admin panel. It has its own `DEPLOYMENT_GUIDE.md` and package management. Do not mix it with the main app build unless intentionally.

---

## Auth Flow

Auth is **client-side Supabase**. The backend is never involved in the actual auth handshake (only `/users/sync` is called after login).

```
Page load
  → config.js                       sets window.DUALMIND_CONFIG
  → js/auth/supabase-init.js      restores session, sets window.DualMindAuth
  → js/ui/app.js                  waits for window.DualMindAuthReady
       ├── NOT logged in → redirect to login-modern.html
       └── logged in    → syncUserWithBackend() → setup() → render app
```

Key auth globals:
- `window.DualMindAuth` — auth service singleton.
- `window._DUALMIND_AUTH` — raw Supabase client (used for token access).
- `window.DualMindAuthReady` — Promise that resolves when auth is initialized.
- `sessionStorage['auth_redirect_attempted']` — redirect loop guard.

Supabase JS is loaded from CDN in `index.html`: `https://unpkg.com/@supabase/supabase-js@2`.

---

## Config & Environment

Runtime config lives in `config.js` and is attached to `window.DUALMIND_CONFIG`.

Known issues:
- `process.env` is referenced in `config.js` but does not exist in the browser, so environment variables cannot override the fallback Supabase URL/key.
- The fallback values contain the real production Supabase URL and a partial anon key. For local development, change these or use a build-time replacement.
- The README says to copy `config.example.js` to `.env`, which is incorrect. `config.js` is the loaded file.

---

## CustomEvent Bus

Inter-component communication uses `document` events.

| Event | Fired by | Consumed by | Payload |
|-------|----------|-------------|---------|
| `mode-change` | Header | App | `{ mode: 'battle' \| 'arena' \| 'direct' }` |
| `chat-submit` | ChatInput | App | `{ message, webSearch, codeMode }` |
| `thread-clicked` | Sidebar | App | `{ threadId }` |
| `threads-changed` | App | Sidebar | `{ reason, threadId }` |
| `nav-action` | Sidebar | App | `{ action: 'new-chat' \| 'leaderboard' \| ... }` |
| `sidebar-toggle` | Sidebar | App, Header | `{ isOpen, isCollapsed, isMobile }` |
| `toggle-mobile-menu` | Header | App | — |
| `backend-available` | App | Sidebar, Header | `{ available: bool }` |
| `open-share-modal` | Header | App, ShareModal | — |
| `open-export-menu` | Header | App | — |
| `user-logout` | Header, Sidebar | App | — |
| `toggle-web-search` | ChatInput, App | App, ChatInput | `{ active: bool }` |
| `toggle-code-mode` | ChatInput, App | App, ChatInput | `{ active: bool }` |
| `vote-submit` | App (click delegation) | App | `{ turnId, choice }` |
| `user-logged-in` | supabase-init | feature-flags, etc. | Supabase user object |
| `user-logged-out` | supabase-init | — | — |

---

## Window Globals

Set once at startup — do not add more without a strong reason.

| Global | Set by | Purpose |
|--------|--------|---------|
| `window.DUALMIND_CONFIG` | `config.js` | Runtime config (API URL, Supabase creds, feature flags) |
| `window.DualMindAuth` | `js/auth/supabase-init.js` | Auth service instance |
| `window._DUALMIND_AUTH` | `js/auth/supabase-init.js` | Raw Supabase client |
| `window.DualMindAuthReady` | `js/auth/supabase-init.js` | Promise resolving when auth initialized |
| `window._DUALMIND_API` | `js/ui/app.js` / `js/apiInstance.js` | API client singleton |
| `window._APP` | `js/ui/app.js` | App instance |
| `window._DUALMIND_APP_READY` | `js/ui/app.js` | `true` when `setup()` is complete |
| `window._DUALMIND_MODELS` | `js/ui/app.js` | Cached model list array |

---

## CSS Architecture

### Load Order in `index.html`

```
1.  css/tokens.css          ← :root design tokens ONLY
2.  css/styles.css          ← layout, reset, app shell, sidebar, header, chat area
3.  css/auth-styles.css     ← user profile widget, auth-adjacent UI
4.  css/model-selector.css  ← model selection grid + dropdowns + skeleton loaders
5.  css/sidebar-actions.css ← rename/delete action buttons on thread items
6.  css/leaderboard-page.css← leaderboard standalone page
7.  css/ui-improvements.css ← overrides, loaded for specificity
8.  css/voting-ui.css       ← floating vote button UI above chat input
9.  css/ai-input.css        ← chat input animations (marquee, voice, mic)
10. css/share-modal.css     ← share conversation modal
11. css/custom-modal.css    ← confirm/delete/edit modals + toast system
12. css/user-profile.css   ← user profile popover/settings
```

`ui-improvements.css` is intentionally loaded late.

### Design Token Source of Truth

`css/tokens.css` is the only file that should define `:root` variables. Other files consume `var(--...)`.

Tokens include:
- Brand: `--color-cyan`, `--color-terra`, `--color-teal`, `--color-cream`
- Surfaces: `--surface-0` → `--surface-3`, `--surface-card`, `--surface-hover`
- Glass: `--glass-bg`, `--glass-blur`
- Typography: `--font-sans` (Outfit), `--font-mono` (JetBrains Mono)
- Layout: `--sidebar-width`, `--header-height`

### Key Design Rules

1. Never hardcode `#4AABC2` in new code. Use `var(--color-cyan)`.
2. Never hardcode layout pixel offsets. Use `--sidebar-width`, `--header-height`.
3. Do not reference `Inter` or `Inria Sans` fonts (not loaded).
4. Avoid inline styles with brand colors in JS templates.
5. Avoid `console.log` in production code. Use `console.warn`/`console.error` only for real errors.
6. Use icons from `js/icons.js`, not emoji or inline SVGs when avoidable.

### Duplicate CSS Classes (cleanup backlog)

These are defined in multiple files. When editing, use the `css/ui-improvements.css` version as canonical:

- `.response-card` — `styles.css` + `ui-improvements.css`
- `.vote-btn-light` — `styles.css` + `voting-ui.css` + `ui-improvements.css`
- `.model-badge` — `styles.css` + `ui-improvements.css`
- `.responses-grid` — `styles.css` + `ui-improvements.css`

---

## JavaScript Patterns

### Component Lifecycle

```js
class MyComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this._myHandler = null; // store for cleanup
    this.init();
  }
  init() { this.render(); this.attachEventListeners(); }
  render() { this.container.innerHTML = `...`; }
  attachEventListeners() { /* event delegation preferred */ }
}
```

Most components rerender by setting `this.container.innerHTML`. Be careful with listener re-attachment and XSS through unsanitized user content.

### Event Delegation

- Thread list actions use delegated handlers attached once in `components/Sidebar.js`.
- Global click handler in `js/ui/app.js` handles speak buttons, vote buttons, random/swap model buttons.
- Static elements can have direct listeners.
- Always store handler references to remove listeners before re-attaching.

### State Management

`App.state` in `js/ui/app.js` is the single source of truth. Components either read `window._APP.state` or receive state via `setState()` methods.

State shape:

```js
state = {
  currentMode: 'battle',        // 'battle' | 'arena' | 'direct'
  webSearchEnabled: false,
  codeModeEnabled: false,
  turns: [],                    // battle/arena turn history
  direct: [],                   // direct mode message history
  streaming: false,
  apiEnabled: true,
  user: null,                   // Supabase user object
  backendAvailable: false,
  currentThreadId: null,
  currentThreadVisibility: 'private',
  chatSettings: { codeMode: false, webSearch: false }
}
```

### ChatView Rendering

`components/chat/ChatView.js` has three render paths:
- `setState(newState)` — merges state, triggers full `render()`.
- `render(preserveScroll)` — rebuilds chat DOM and re-attaches listeners.
- `appendTurn(turn)` — appends a single turn during streaming without a full rebuild.

Scroll/overflow behavior is managed with `ResizeObserver` + scroll events toggling the `.at-bottom` class on `.response-card`.

---

## API Layer

```
js/apiInstance.js             ← import { api } from './apiInstance.js' (preferred)
js/api/
  DualMindApi.js              ← facade: .arena .threads .models .users
  core/
    HttpClient.js             ← fetch wrapper: auth, retry, abort, SSE streaming
  services/
    ArenaService.js           ← chat, dualChat, chatStream, submitVote, getLeaderboard
    ThreadService.js          ← thread/message CRUD
    ModelService.js           ← getModels, getModelDetails
    UserService.js            ← syncUser
  utils/
    authProvider.js           ← getAuthToken, isAuthenticated, getUserId
    extractors.js             ← normalize API responses
    errors.js                 ← ApiError, TimeoutError, NetworkError
    errorHandler.js           ← centralized error processing
    errorMessages.js          ← user-friendly error message map
  examples.js                 ← DEV ONLY
```

Cached models are stored in `window._DUALMIND_MODELS` after first fetch.

---

## Performance

- CDN scripts (`highlight.js`, `marked`, `DOMPurify`) are loaded with `defer`.
- `highlight.js` CSS uses non-blocking load: `media="print" onload="this.media='all'"`.
- `appendTurn()` avoids full re-renders during streaming.
- Backdrop-filter blur is GPU-intensive; avoid nesting blurred surfaces.
- Current downside: 12 CSS files and many deferred scripts load before first meaningful paint. Consider bundling.

---

## Security

- `DOMPurify` is used for AI markdown rendering in most places.
- `escapeHtml()` / `sanitizeHTML()` sanitize thread titles and some text.
- Known risks that still need fixing:
  - `login/auth-complete.js` uses `innerHTML` for button labels (safe content but inconsistent).
  - `components/CustomModal.js`, `components/ShareModal.js`, and several others use `innerHTML` with own template strings.
  - Auth tokens are stored in Supabase's `localStorage` session. XSS would expose them.
  - Worker CORS is `Access-Control-Allow-Origin: *` for all `/api/*` routes.

---

## Tests

Playwright config exists at `playwright.config.js`, test file at `tests/auth-flow-redesign.spec.js`.

**Currently broken:** `@playwright/test` is not in `package.json` devDependencies, so `npm run test` fails.

To fix:

```bash
npm i -D @playwright/test
npx playwright install
```

Then `npm run test` will spin up `npx serve . -p 8000` automatically.

---

## Known Tech Debt & Current Priorities

| Priority | Issue | Files | Notes |
|----------|-------|-------|-------|
| P0 | Login auth crash | `login/auth-complete.js` | `emailInput`, `setLoading`, `supabaseClient`, `SITE_URL` undefined |
| P0 | Lint script broken | `package.json` line 9 | Unquoted glob `admin-email-system/**` |
| P0 | Tests cannot run | `package.json` | `@playwright/test` missing |
| P1 | Outdated AGENTS paths | `AGENTS.md` | This file was just updated; keep it synced |
| P1 | Deprecated shims | `js/api-client.js`, `js/auth.js`, `js/auth/api-service.js` | Remove or clearly mark unused |
| P1 | Orphaned prototypes | `App.jsx`, `next-dualmind/`, `arena-core.js` | Delete or move to separate repo |
| P1 | Hardcoded Supabase URL/key | `config.js` | Should come from env/build replacement |
| P1 | Wide-open CORS | `worker.js` | Restrict origins in production |
| P2 | Duplicate CSS classes | multiple files | Consolidate or canonicalize |
| P2 | Many window globals | all | Reduce surface, inject via constructor |
| P2 | No unit tests | — | Add Jest/Vitest for API client and authProvider |
| P2 | Build scripts diverge | `build.js`, `build-deploy.js`, `wrangler-dist.toml`, `wrangler.jsonc` | Unify |

---

## For AI Agents

When modifying code:

1. Read this file first if it exists.
2. Run `npm run lint` after any JS change (fix the glob if it fails).
3. Prefer the canonical path: `js/ui/app.js` for app logic, `js/apiInstance.js` for API calls, `js/auth/supabase-auth.js` for auth.
4. Do not import `js/api-client.js`, `js/auth.js`, or `js/auth/api-service.js` in new code.
5. Keep `window` globals minimal; if you need a global, document it in the Window Globals table above.
6. Sanitize any HTML that touches user or AI content (`DOMPurify` is already imported in `index.html`).
7. Update this file whenever you change file paths, global variables, event names, or major patterns.
