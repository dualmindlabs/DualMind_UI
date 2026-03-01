# CLAUDE.md

Guidance for Claude Code when working in this repository. Keep this file accurate — update it whenever architecture, patterns, or known issues change.

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:8000 (npx serve . -p 8000)
npm run lint         # ESLint all JS files
npm run lint:fix     # Auto-fix lint issues
npm run test         # Run Playwright tests (auto-starts dev server on port 8000)
npm run test:ui-bugs # Run specific test: tests/ui-config-bugs.spec.js
npm run validate     # lint + test
```

**Deployment**: Cloudflare Workers via `wrangler.jsonc`. The worker (`worker.js`) serves static assets and proxies `/api/*` to the Azure backend.

---

## Architecture

**Vanilla JS, no framework, no build step.** Files are served directly as static assets.

### Request Flow

```
Browser → Cloudflare Worker (worker.js)
            ├── /api/*    → Azure backend (dualmind-arena-...azurewebsites.net)
            ├── /share/*  → share/index.html  (SPA route)
            └── /*        → static assets (Cloudflare ASSETS binding)
```

In local dev (`npm run dev`), the browser hits the Azure backend directly. `config.js` detects `localhost` and sets `apiBaseUrl` to `http://localhost:5079`.

### App Modes

Managed by `App.state.currentMode` in `js/app-final.js`:

| Mode | Description |
|------|-------------|
| `battle` | Anonymous dual-model comparison — models hidden until vote |
| `arena` | User picks model pair, sees names upfront (side-by-side) |
| `direct` | Single-model chat |

Mode changes are dispatched as `mode-change` CustomEvent and handled surgically in `Header.js` (no re-render).

---

## Key Files Map

### Entry Points

| File | Purpose |
|------|---------|
| `config.js` | **Loaded first.** Sets `window.DUALMIND_CONFIG` — backend URL, Supabase credentials, feature flags, streaming settings. Detects localhost to switch API base. |
| `index.html` | Main app shell. Defines CSS load order, JS module imports, CDN scripts. |
| `worker.js` | Cloudflare Worker: API proxy + SPA routing + static asset serving. |
| `wrangler.jsonc` | Cloudflare Worker config: bindings (ASSETS, D1, KV, R2, AI), env vars, cron triggers. |

### Core JS

| File | Purpose |
|------|---------|
| `js/app-final.js` | **Main `App` class.** Orchestrates all components, manages global state, handles auth gating, mode switching, chat submission, streaming, voting, thread management. Exposes `window._APP`. |
| `js/apiInstance.js` | Exports singleton `api` — the preferred import for all API calls throughout the app. |
| `js/api/DualMindApi.js` | Canonical API client. Aggregates services: `api.arena`, `api.threads`, `api.models`, `api.users`. |
| `js/api/core/HttpClient.js` | Base HTTP client. Handles auth headers, retry with exponential backoff, AbortController cancellation, SSE streaming. |
| `js/api/services/ArenaService.js` | `chat()`, `chatStream()`, `dualChat()`, `textToSpeech()`, `submitVote()`, `getLeaderboard()` |
| `js/api/services/ThreadService.js` | `getThreads()`, `getThread()`, `getThreadMessages()`, `createThread()`, `updateThread()`, `deleteThread()` |
| `js/api/services/ModelService.js` | `getModels()`, `getModelDetails()` |
| `js/api/services/UserService.js` | `syncUser()`, `getUserProfile()` |
| `js/api/services/EnergyService.js` | `getBalance()`, `claimVideo()` |
| `js/api/utils/authProvider.js` | `getAuthToken()`, `isAuthenticated()`, `getUserId()` — abstracts token retrieval |
| `js/api/utils/extractors.js` | Normalizes raw API responses: `extractChatResponse()`, `extractDualChatResponse()` |
| `js/api/utils/errors.js` | Custom error classes: `ApiError`, `TimeoutError`, `NetworkError` |
| `js/api-client.js` | **Deprecated shim** — do not use; wraps `DualMindApi`. |
| `js/mockArena.js` | Mock responses for offline mode. Exports: `pickModelPair()`, `buildMockReply()`, `streamText()`. Used by `app-final.js` when backend unavailable. |
| `js/icons.js` | Centralized SVG icon factory. All icons are functions `(color, size) => svgString`. Add new icons here — never inline SVGs in component templates. |
| `js/leaderboardModal.js` | `LeaderboardModal` class. Fetches and renders model rankings. Navigates to `./leaderboard/` route. |
| `js/chatExport.js` | `ChatExport` class. Exports conversations to MD, JSON, CSV, HTML, PDF. Lazy-loaded via `import()`. |
| `js/supabase-auth.js` | `SupabaseAuthService` class. Full auth lifecycle: signUp, signIn, signOut, OTP, social providers, password reset/update, session management. |
| `js/supabase-init.js` | Instantiates `SupabaseAuthService` from `window.DUALMIND_CONFIG.supabase`, attaches to `window.DualMindAuth`. Dispatches `user-logged-in` / `user-logged-out`. |
| `js/auth-modern.js` | Handles auth callbacks (social login redirects), phone binding enforcement for new users. |
| `js/auth-examples.js` | **Dev-only** usage examples for auth — not imported in production. Contains intentional console.logs. |
| `js/api/examples.js` | **Dev-only** API usage examples — not imported in production. Contains intentional console.logs. |

### Components

| File | Renders | Key State |
|------|---------|-----------|
| `components/Header.js` | Top nav: mode selector dropdown, share/export buttons | `currentMode`, `isDropdownOpen` |
| `components/Sidebar.js` | Left panel: logo, nav items (New Chat, Leaderboard), thread list, footer settings menu (with User Profile, Terms, Privacy, Cookies, Log Out) | `isOpen`, `isCollapsed`, `isMobile`, `recentChats[]` |
| `components/ChatInput.js` | Textarea, send button, web search / code mode toggles, prompt chips marquee, attachment bar | text value, `webSearchActive`, `codeModeActive`, streaming state |
| `components/chat/ChatView.js` | Scrollable turn list: user prompts + dual/single response cards, model badges, expand/copy/speak actions | `mode`, `turns[]`, `direct[]`, `apiEnabled` |
| `components/CustomModal.js` | Generic modal (confirm/delete/edit) + toast notification system | modal state, toast queue |
| `components/ShareModal.js` | Share thread modal: visibility toggle (private/unlisted/public), copy link | `open`, `threadId`, `shareLink`, `currentVisibility` |
| `components/SharedThreadView.js` | Read-only public view of a shared thread (`/share/*` routes) | `threadData`, `loading`, `error` |
| `components/SkeletonLoader.js` | Shimmer placeholder for loading states | stateless |

---

## Auth Flow

Auth is **100% client-side Supabase** — the backend is never involved in auth.

```
Page load
  → supabase-init.js  restores session from localStorage
  → app-final.js      checks window.DualMindAuth.isLoggedIn()
      ├── NOT logged in → redirect to login-modern.html
      └── logged in    → syncUserWithBackend() → setup() → render app
```

- `window.DualMindAuth` — auth service singleton
- `window._DUALMIND_AUTH` — raw Supabase client (used for token access)
- `window.DualMindAuthReady` — Promise that resolves when auth is initialized
- Auth redirect loop protection: `sessionStorage['auth_redirect_attempted']`
- Supabase JS loaded from CDN: `https://unpkg.com/@supabase/supabase-js@2`

**Auth pages** (`login-modern.html`, `signup-modern.html`, `forgot-password.html`, `update-password.html`):
- Load `css/tokens.css` then `css/auth-modern.css`
- Do NOT load `js/app-final.js`
- Use `js/supabase-init.js` + `js/auth-modern.js` or `js/forgot-password.js` / `js/update-password.js`

---

## CustomEvent Bus

All inter-component communication goes through `document.dispatchEvent(new CustomEvent(...))`. No direct component references across boundaries.

| Event | Fired by | Consumed by | Payload |
|-------|----------|-------------|---------|
| `mode-change` | Header | App | `{ mode: 'battle'\|'arena'\|'direct' }` |
| `chat-submit` | ChatInput | App | `{ message, webSearch, codeMode }` |
| `thread-clicked` | Sidebar | App | `{ threadId }` |
| `threads-changed` | App | Sidebar | `{ reason, threadId }` |
| `nav-action` | Sidebar | App | `{ action: 'new-chat'\|'leaderboard' }` |
| `sidebar-toggle` | Sidebar | App, Header | `{ isOpen, isCollapsed, isMobile }` |
| `toggle-mobile-menu` | Header | App | — |
| `backend-available` | App | Sidebar, Header | `{ available: bool }` |
| `open-share-modal` | Header | App, ShareModal | — |
| `open-export-menu` | Header | App | — |
| `user-logout` | Header, Sidebar | App | — |
| `toggle-web-search` | ChatInput, App | App, ChatInput | `{ active: bool }` |
| `toggle-code-mode` | ChatInput, App | App, ChatInput | `{ active: bool }` |
| `vote-submit` | App (click delegation) | App | `{ turnId, choice }` |
| `user-logged-in` | supabase-init | — | Supabase user object |
| `user-logged-out` | supabase-init | — | — |

---

## Window Globals

Set once at startup — do not add more.

| Global | Set by | Purpose |
|--------|--------|---------|
| `window.DUALMIND_CONFIG` | `config.js` | Runtime config (API URL, Supabase creds, feature flags) |
| `window.DualMindAuth` | `supabase-init.js` | Auth service instance |
| `window._DUALMIND_AUTH` | `supabase-init.js` | Raw Supabase client |
| `window.DualMindAuthReady` | `supabase-init.js` | Promise — resolves when auth initialized |
| `window._DUALMIND_API` | `app-final.js` | API client singleton (for Sidebar to call `api.threads`) |
| `window._APP` | `app-final.js` | App instance (for components to call `_APP.state`, `_APP.renderChat()`, etc.) |
| `window._DUALMIND_MODELS` | `app-final.js` | Cached model list from backend |
| `window._DUALMIND_APP_READY` | `app-final.js` | `true` when setup() is complete |

---

## CSS Architecture

### Load Order in `index.html` (order matters)

```
1.  css/tokens.css          ← :root design tokens ONLY
2.  css/styles.css          ← layout, reset, app shell, sidebar, header, chat area
3.  css/auth-styles.css     ← user profile widget, auth-adjacent UI
4.  css/model-selector.css  ← model selection grid + dropdowns + skeleton loaders
5.  css/sidebar-actions.css ← rename/delete action buttons on thread items
6.  css/share-modal.css     ← share conversation modal
7.  css/custom-modal.css    ← confirm/delete/edit modals + toast system
8.  css/leaderboard-page.css← leaderboard standalone page
9.  css/voting-ui.css       ← floating vote button UI above chat input
10. css/ai-input.css        ← chat input animations (marquee, voice, mic)
11. css/ui-improvements.css ← highest specificity — loaded LAST intentionally
```

`ui-improvements.css` wins all specificity conflicts by load order. Edit it for any final visual refinements.

### Design Token Source of Truth

**`css/tokens.css`** is the ONLY file that defines `:root {}`. All other files consume `var(--...)`.

**Exception — `auth-modern.css`**: Auth pages load without `tokens.css` in some cases (though we now load both). This file defines its own `:root` with locally-named vars (`--primary`, `--bg-dark`, etc.) that mirror token values. These don't conflict because names are different.

**Responsive token overrides** (e.g. `--sidebar-width` at breakpoints) live at the bottom of `tokens.css` inside `@media` — NOT in `styles.css`.

### Brand Palette

```
--color-cyan:    #4AABC2   ← primary, focus rings, active states, left-side accents
--color-terra:   #CB9275   ← secondary, right-side accents
--color-cream:   #FDF4CD   ← tie vote accent
--color-teal:    #577B87   ← supporting brand color
--color-error:   #ef4444
--color-success: #10b981
--color-warning: #f59e0b
```

Alpha variants: use `rgba(74, 171, 194, 0.X)` — helpers also in tokens: `--color-cyan-dim`, `--color-cyan-glow`.

### Font System

**Loaded** (Google Fonts in `index.html`):
- `Outfit` — all UI text (weights 300–700) → `var(--font-sans)`
- `JetBrains Mono` — code blocks → `var(--font-mono)`

**NOT loaded** — do not reference:
- `Inter` — not in Google Fonts link, causes silent system fallback
- `Inria Sans` — removed from codebase, replaced with `var(--font-sans)`

### Key Design Rules

1. **Never hardcode `#4AABC2`** — use `var(--color-cyan)` or `rgba(74, 171, 194, ...)` for alpha
2. **Never hardcode sidebar/layout pixel offsets** — use `var(--sidebar-width)` (260px), `var(--sidebar-collapsed-width)` (80px)
3. **No `font-family: 'Inter'`** or `font-family: 'Inria Sans'` anywhere
4. **No inline styles with brand colors in JS templates** — extract to CSS classes in `ui-improvements.css`
5. **No `console.log` in production code** — use `console.warn` / `console.error` for real errors only. `app-final.js` and `Sidebar.js` have been fully cleaned.
6. **No emoji action buttons** — use `Icons.rename()` / `Icons.trash()` from `js/icons.js`

### Known Duplicate CSS Classes (do not add more)

These are defined in multiple files due to historical growth. When editing, use the `ui-improvements.css` version as canonical:

| Class | Files |
|-------|-------|
| `.response-card` | `styles.css` + `ui-improvements.css` |
| `.vote-btn-light` | `styles.css` + `voting-ui.css` + `ui-improvements.css` |
| `.model-badge` | `styles.css` + `ui-improvements.css` |
| `.responses-grid` | `styles.css` + `ui-improvements.css` |

### Hardcoded `#4AABC2` — Resolved (Feb 2026)

All CSS files have been migrated to `var(--color-cyan, #4AABC2)`. Exception: `css/auth-modern.css` keeps `--primary: #4AABC2` as a standalone local var (intentional — auth pages sometimes load without `tokens.css`).

**Rule:** Never hardcode `#4AABC2` in new CSS. Use `var(--color-cyan)` or `rgba(74, 171, 194, N)` for alpha variants.

---

## JavaScript Patterns

### Component Lifecycle

Components follow this pattern:
```js
class MyComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    // store handler refs for cleanup:
    this._myHandler = null;
    this.init();
  }
  init() { this.render(); this.attachEventListeners(); }
  render() { this.container.innerHTML = `...`; }
  attachEventListeners() { /* attach once; use delegation */ }
}
```

### Event Delegation Rules

- **Thread list actions** (`Sidebar.js`): Both `_threadClickHandler` and `_threadActionsClickHandler` are delegated on `#recent-chats-list` — attached ONCE in `attachEventListeners()`, never re-attached after re-renders.
- **Global click handler** (`app-final.js`): Single `document.addEventListener('click', ...)` handles speak buttons, vote buttons, swap/random model buttons.
- **Per-element listeners**: Only for static elements that are never re-rendered (toggle buttons, sidebar toggle button, etc.).
- **Always remove document-level listeners before re-attaching**: Store ref as `this._handlerName`, call `document.removeEventListener(type, this._handlerName)` before adding new one.

### Header Component — Critical Rules

`Header.js selectMode(modeId)` — **NEVER call `this.render()` or `this.attachEventListeners()` on mode change.**
Already fixed to use surgical DOM updates:
- `modeIcon.innerHTML = modeData.icon('white')`
- `modeText.textContent = modeData.name`
- `modeBtn.title = ...`
- Each `.mode-option`: toggle `.active` + set `aria-checked`

Full re-render on mode change causes: document listener accumulation, full DOM repaint, focus loss.

### Sidebar Threading

`updateRecentChats()` only calls `attachActionHandlers()` — NOT `attachThreadClickHandlers()`. Thread clicks are delegated and survive innerHTML updates without re-attachment.

### State Management

`App.state` (in `app-final.js`) is the single source of truth:
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

Components read state via `window._APP.state` or receive it via `setState()` / `render()` calls.

### ChatView Rendering

`ChatView.js` has two render paths:
- `setState(newState)` — merges state, triggers full `render()`
- `render(preserveScroll)` — rebuilds entire chat DOM; also calls `attachResponseBodyScrollListeners()` and `attachModelSelectorListeners()`
- `appendTurn(turn)` — appends a single turn without full re-render (used during streaming)

`attachResponseBodyScrollListeners()` — uses `ResizeObserver` + scroll events to toggle `.at-bottom` class on `.response-card`. Guards double-attach with `body._overflowListenerAttached`.

---

## API Layer

```
js/apiInstance.js          ← import { api } from './apiInstance.js'  (preferred)
js/api/
  DualMindApi.js           ← main facade; exposes .arena .threads .models .users
  core/
    HttpClient.js          ← fetch wrapper: auth, retry, abort, SSE streaming
  services/
    ArenaService.js        ← chat, dualChat, chatStream, submitVote, getLeaderboard
    ThreadService.js       ← CRUD for threads + messages
    ModelService.js        ← getModels, getModelDetails
    UserService.js         ← syncUser
  utils/
    authProvider.js        ← getAuthToken(), isAuthenticated(), getUserId()
    extractors.js          ← normalises raw API → UI-ready objects
    errors.js              ← ApiError, TimeoutError, NetworkError
    errorHandler.js        ← centralised error processing
    errorMessages.js       ← user-friendly error message map
  examples.js              ← DEV ONLY — usage examples with console.logs
```

`js/api-client.js` is a **deprecated shim** — do not import it in new code.

Cached models are stored in `window._DUALMIND_MODELS` (array of `{ modelId, modelName, ... }`).

---

## Performance

- CDN scripts (`highlight.js`, `marked`, `DOMPurify`) are loaded with `defer` — they are only needed after first AI response, not on initial render
- `highlight.js` CSS uses non-blocking load: `media="print" onload="this.media='all'"`
- `backdrop-filter: blur()` is GPU-intensive — never nest blurred elements inside other blurred containers
- 11 CSS files on main app = 11 HTTP/2 multiplexed requests (acceptable with Cloudflare)
- `AppendTurn` path avoids full re-renders during streaming — only append, don't rebuild

---

## Security

- `DOMPurify` sanitizes all AI markdown before rendering — **never use `.innerHTML` with unsanitized AI responses**
- `escapeHtml()` in `Sidebar.js` sanitizes thread titles before rendering
- No user input is passed to `eval()`, `Function()`, or dynamic `import()`
- Auth tokens are stored in Supabase's localStorage session — never log or expose them

---

## Tests

Playwright tests live in `tests/`. Dev server on port 8000 is required (auto-started by `npm test` via `playwright.config.js`).

- `tests/ui-config-bugs.spec.js` — targeted UI bug regression tests
- Run single file: `npm run test:ui-bugs`
- Full suite: `npm test`

---

## Known Tech Debt (prioritised)

| Issue | Files | Priority |
|-------|-------|----------|
| Duplicate CSS classes | `.response-card`, `.vote-btn-light`, `.model-badge`, `.responses-grid` in 2-3 files each | Low |
| `js/app.js` (old app file) still exists with debug logs — not used in production | `js/app.js` | Cleanup |
| CSS consolidation from 11 → 3-4 files | All CSS | Future |

> **Resolved (Feb 2026):** `#4AABC2` hardcoded in CSS → migrated to `var(--color-cyan, #4AABC2)` across all CSS files. `console.log` in `supabase-init.js`, `auth-modern.js`, `ShareModal.js`, `ChatView.js` → wrapped with `DUALMIND_CONFIG.debug.enabled` guard.

