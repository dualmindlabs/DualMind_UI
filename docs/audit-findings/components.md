# Components & UI Subsystem Audit

**Analysis Date:** 2026-08-14
**Auditor:** Senior Frontend/JS SaaS Auditor
**Project:** DualMind UI — `C:\Users\Harshu\OneDrive\Desktop\DualMind Projects\DualMind UI`

---

## Scope (files reviewed)

### Component classes (ES modules)
- `components/Header.js` (275 lines)
- `components/Sidebar.js` (692 lines)
- `components/ChatInput.js` (323 lines)
- `components/chat/ChatView.js` (1075 lines)
- `components/ShareModal.js` (337 lines)
- `components/CustomModal.js` (260 lines)
- `components/SharedThreadView.js` (368 lines)
- `components/SkeletonLoader.js` (21 lines)

### Supporting JS
- `js/icons.js` (194 lines) — centralized SVG icon factory
- `js/chatExport.js` (306 lines) — conversation exporter (lazy-loaded)
- `js/ui/leaderboardModal.js` (lazy-loaded modal used from main app)
- `js/leaderboardPage.js` (standalone leaderboard page script)
- `js/ui/utils.js` — `sanitizeHTML()` helper
- `js/ui/app.js` — `App` orchestrator (consumer of all components)

### CSS
- `css/custom-modal.css` (412 lines)
- `css/share-modal.css` (425 lines)
- `css/sidebar-actions.css` (94 lines)
- `css/voting-ui.css` (251 lines)

### Referenced for cross-checks (not in scope but consulted)
- `index.html`, `share/index.html`, `leaderboard/index.html`, `login-modern.html`, `signup-modern.html`
- `build-deploy.js`, `worker.js`
- `old-html-backup/`, `dist/`, `deploy_build/` (build artifacts / backups)

---

## Overview

This domain implements the entire client-side UI for a vanilla-JS (no framework, no build step) AI-model-comparison SaaS. The architecture is a hand-rolled component system:

- **Pattern:** Each UI region is a class that owns a DOM container (`document.getElementById(containerId)`), renders via `innerHTML` template strings, and attaches its own listeners. There is no virtual DOM, no diffing, no reactive store.
- **Orchestration:** `js/ui/app.js` (`App` class, the `window._APP` singleton) instantiates `Sidebar`, `Header`, `ChatInput`, `ChatView`, and (lazily) `LeaderboardModal`; `ShareModal` and `CustomModal` are exported as singletons. `App` owns the single source of truth (`this.state`).
- **Communication:** A `document`-level `CustomEvent` bus (`mode-change`, `chat-submit`, `vote-submit`, `thread-clicked`, `sidebar-toggle`, `open-share-modal`, `open-export-menu`, `threads-changed`, `nav-action`, `user-logout`, `toggle-web-search`, `toggle-code-mode`, `backend-available`). No component holds a direct reference to another across boundaries — except `Sidebar` reaches into `window._APP.state` and `window._APP.hideFloatingVoting()`/`renderChat()` during thread deletion.
- **Icons:** Centralized in `js/icons.js` as functions `(color, size) => svgString`. This is a sound pattern; components import `Icons` and call `Icons.share('white', 18)` rather than inlining SVGs.
- **Lazy loading:** `ChatExport` (`js/chatExport.js`) and `LeaderboardModal` (`js/ui/leaderboardModal.js`) are loaded via dynamic `import()` on first use — good for initial-load performance.
- **Markdown rendering:** `ChatView` and `SharedThreadView` both use `window.marked` + `window.DOMPurify` (CDN, deferred). DOMPurify sanitization is conditional: if `window.DOMPurify` is undefined, both fall back to `escapeHtml()`-with-`<br>` — safe but loses formatting.
- **CSS:** Four CSS files in scope are loaded by `index.html` in a fixed order; `ui-improvements.css` (out of scope, loaded last) wins specificity conflicts. `share-modal.css` and `custom-modal.css` are also linked on auth pages (`login-modern.html`, `signup-modern.html`) for the toast system.

---

## Strengths

1. **Centralized icon factory (`js/icons.js`).** All SVGs are functions returning strings, parameterized by color/size. Consistent import pattern (`import { Icons } from '../js/icons.js'`) across all components. Prevents SVG drift.
2. **Event-delegation discipline in `Sidebar`.** Thread-list click and action (rename/delete) handlers are delegated on `#recent-chats-list`, attached once, and survive `innerHTML` re-renders without re-attachment. Handler refs are stored (`this._threadClickHandler`, `this._threadActionsClickHandler`) and removed before re-adding.
3. **Surgical mode switching in `Header`.** `selectMode()` mutates only the icon/text/title/aria attributes — no full `render()` or `attachEventListeners()`, avoiding listener accumulation and focus loss (per AGENTS.md critical rule).
4. **Singleton modals with shared roots.** `ShareModal` and `CustomModal` create one overlay element in `init()` and reuse it; `rerender()` swaps `innerHTML` only when open. This avoids repeated DOM insertion.
5. **Streaming DOM patches.** `ChatView.updateResponse()` / `updateDirectResponse()` write markdown HTML directly into the response body element by ID during streaming, avoiding full re-renders. `appendTurn()` adds a single turn node before the scroll sentinel instead of rebuilding the whole list.
6. **Focus trap + scroll lock on mobile sidebar.** `Sidebar.enableFocusTrap()` implements Tab cycling, Escape-to-close, and `lockScroll()`/`unlockScroll()` for the mobile drawer — a genuine a11y effort.
7. **Debug-guarded logging.** `ChatView` and `ShareModal` wrap `console.log` in `if (window.DUALMIND_CONFIG?.debug?.enabled)` (per the resolved Feb 2026 cleanup).
8. **Markdown sanitized with DOMPurify** in `ChatView.renderMarkdown()` and `SharedThreadView.renderMarkdown()` — the primary XSS surface (AI output) is guarded when DOMPurify is present.
9. **Token-based theming.** Components/CSS reference `var(--color-cyan)`, `var(--sidebar-width)`, etc.; `Header.handleSidebarToggle` reads `--sidebar-width`/`--sidebar-collapsed-width` from computed style to position the header — stays in sync with tokens.
10. **Export system is side-effect-free and lazy.** `ChatExport` produces strings and triggers downloads via Blob URLs (revoked after use); `import()` happens only on first export click.

---

## Dead / Unused / Duplicate Files

### `components/SkeletonLoader.js`
- **Why it appears unused:** Exports `renderSkeleton()` (a 2-turn shimmer placeholder). No file imports it. The only matches for `SkeletonLoader` are in `AGENTS.md` (documentation) and the `dist/`/`deploy_build/` build copies. The actual skeleton rendering in the live app is done inline: `ChatView.renderResponseCard()` emits its own `battle-skeleton-body` shimmer; `leaderboardPage.js` and `leaderboardModal.js` each define their *own* local `renderSkeleton()`.
- **Confidence:** High
- **Referenced in dist/deploy_build?** Yes (copied by `build-deploy.js` as part of `components/`), but still orphaned there.
- **Recommended action:** **Delete** from source and from the build copy list. Update `AGENTS.md` table.

### `arena-core.js` (project root)
- **Why it appears unused:** Defines an `ArenaMode` class (N-model arena, `renderSkeleton`, `updateModelCard`, `revealModels`, `highlightWinner`, `showVoting` (no-op), `showFeedback`, `renderError`). No HTML page or JS module imports it or references `ArenaMode`/`arena-core`. The only reference is `build-deploy.js:28` copying it into `dist/`. It appears to be a parallel/abandoned arena implementation superseded by `ChatView` + `App.runArenaApi`.
- **Confidence:** High
- **Referenced in dist/deploy_build?** Yes (`build-deploy.js` copies it; present in `dist/arena-core.js`).
- **Recommended action:** **Delete** from source; remove from `build-deploy.js` copy list. If kept for reference, move to `old-html-backup/`.

### `performance-monitor.js` (project root)
- **Why it appears unused in scope:** Not imported by any component or HTML page in this domain. Referenced only by `build-deploy.js:30` and `docs/audit-findings/tests-tooling.md` (which already flags it as incomplete and recommends replacing with Sentry). Not linked in `index.html`.
- **Confidence:** Medium (it may be intended for future inclusion; the tests-tooling audit treats it as semi-live)
- **Referenced in dist/deploy_build?** Yes (`dist/performance-monitor.js` exists)
- **Recommended action:** **Archive** out of the live source tree until wired into `index.html` or replaced by a real RUM/Error SDK.

### `arena-redesign.css` (project root)
- **Why it appears unused:** Not linked by any HTML page (`index.html`, `share/index.html`, `leaderboard/index.html`, auth pages). Referenced only by `build-deploy.js:29`.
- **Confidence:** High
- **Referenced in dist/deploy_build?** `dist/arena-redesign.css` exists.
- **Recommended action:** **Delete** (or archive). Confirm no Cloudflare Worker route injects it.

### `old-html-backup/` directory
- **Why it appears unused:** Contains `app.js` (1627+ lines), `index.html`, `theme.js`, `styles.css`, and duplicated `about/careers/how-it-works/login` pages. Explicitly ignored by ESLint (`package.json` lint script: `--ignore-pattern old-html-backup`). No live HTML references `old-html-backup/`.
- **Confidence:** High
- **Recommended action:** **Delete** the entire directory. It is version-control backup clutter; git history preserves it. Do not copy into `dist/`.

### `dist/` and `deploy_build/` directories
- **Status:** Build artifacts. `dist/` is produced by `build-deploy.js`; `deploy_build/` is a prior deployment snapshot. Both contain full duplicate copies of every component/CSS/JS file in scope.
- **Confidence:** High (these are not sources)
- **Recommended action:** **Keep** but ensure both are in `.gitignore` to avoid auditing stale duplicates. They should never be edited directly.

### `Header.js` stub methods (7 dead methods)
- **File:** `components/Header.js:213-239`
- **Methods:** `toggleUserMenu()`, `closeUserMenu(restoreFocus)`, `updateUserMenuState()`, `handleLogout()`, `getUserInitials()`, `getUserName()`, `getUserEmail()` — each contains only `// Removed logic`.
- **Why dead:** These were migrated to `Sidebar.js`. No caller invokes `Header.toggleUserMenu` etc. (Verified via grep: the only `getUserInitials`/`getUserName`/`getUserEmail` calls are on `Sidebar`/`DualMindAuth`, not `Header`.)
- **Confidence:** High
- **Recommended action:** **Delete** the 7 stub methods from `Header.js`.

### `Sidebar.updateSidebarState()` (dead method)
- **File:** `components/Sidebar.js:554-571`
- **Why dead:** Superseded by `updateClasses()` (which also handles mobile, overlay, floating toggle, scroll lock, focus trap, and dispatches `sidebar-toggle`). Grep confirms no caller invokes `updateSidebarState()`. It also dispatches a `sidebar-toggle` event with a *different* payload shape (`{ isCollapsed, isMobile }` — missing `isOpen`) than `updateClasses()` dispatches, so if it were called it would break `Header.handleSidebarToggle` and `App.adjustLayout`.
- **Confidence:** High
- **Recommended action:** **Delete** `updateSidebarState()`.

### `ChatView.renderVoteBar()` (dead method)
- **File:** `components/chat/ChatView.js:602-607`
- **Why dead:** Always returns `''` regardless of `voteStatus`. Called once in `renderTurn()` but contributes nothing. The real voting UI is the floating panel rendered by `App.showFloatingVoting()`.
- **Confidence:** High
- **Recommended action:** **Delete** the method and its call site in `renderTurn()`.

### Duplicate leaderboard implementations (not strictly dead — two live paths)
- **Files:** `js/ui/leaderboardModal.js` (lazy-loaded modal from main app via `App.showLeaderboard()`) and `js/leaderboardPage.js` (standalone page script loaded by `leaderboard/index.html`).
- **Status:** Both are live but render the *same* data with *parallel* skeleton/render/sort logic. Not a bug, but a maintainability liability: any change to leaderboard formatting must be made in two places.
- **Recommended action:** **Keep both** but extract shared render/sort helpers into `js/ui/leaderboardRender.js` and import from both.

---

## Issues List

### 1. `Sidebar.updateUserInfo()` is called but does not exist — runtime error
- **Severity:** High
- **Files:** `js/ui/app.js:346-347` (caller), `components/Sidebar.js` (no method)
- **Description:** `App.setup()` executes:
  ```js
  if (this.components.sidebar && this.components.sidebar.updateUserInfo) {
    this.components.sidebar.updateUserInfo();
  }
  ```
  The guard (`if (... && this.components.sidebar.updateUserInfo)`) prevents a crash, but `updateUserInfo` is never defined on `Sidebar`. The user profile in the sidebar footer is rendered once in `render()` using `getUserInitials()`/`getUserName()`/`getUserEmail()` and is **never refreshed** when auth state changes after initial mount (e.g., profile update, email verification, phone binding).
- **Why it matters for SaaS:** Stale user identity in the UI is a trust/account-confusion risk; a user who updates their name or email sees the old value until a full page reload.

### 2. `CustomModal` injects `message`/`itemName`/`title` into `innerHTML` without escaping — XSS
- **Severity:** Critical
- **Files:** `components/CustomModal.js:59-61` (`confirmDelete`), `:151` (`confirm`), `:175-179` (`toast`)
- **Description:** `confirmDelete` interpolates `itemName` directly: `Are you sure you want to delete "${itemName || 'this item'}"?`. `confirm` interpolates `message`. `toast` sets `toast.innerHTML` with `${message}`. None of these call `sanitizeHTML()` (which the file imports at line 6 for `escapeHtml()` but only uses in `editThread`'s input value). Thread titles come from user input (Sidebar rename) and flow through `customModal.editThread` (escaped for the input `value`) but `confirmDelete` renders `itemName` into HTML.
- **Attack path:** A user renames a thread to `<img src=x onerror=alert(document.cookie)>`, clicks delete → `confirmDelete({ itemName: thread.title })` executes the payload.
- **Why it matters for SaaS:** Stored XSS in a multi-tenant SaaS. Account takeover via cookie exfiltration.

### 3. `ChatInput` attachments are collected but never transmitted
- **Severity:** High
- **Files:** `components/ChatInput.js:175-185` (`submit` dispatches `chat-submit` with `{ message, attachments }`), `js/ui/app.js:655-687` (`handleChatSubmit` ignores `data.attachments`)
- **Description:** `ChatInput` has full attachment UI: file picker, image preview via FileReader, remove buttons, `add-btn`/`image-btn`. On submit it dispatches `chat-submit` with `attachments: [...this.attachments]`. `App.handleChatSubmit` reads only `data.message` and never passes attachments to `runArenaDemo`/`runArenaApi`/`runDirectApi`. The backend `api.arena.dualChat()` call has no attachments parameter.
- **Why it matters for SaaS:** A visible, functional-looking feature that silently does nothing is a trust killer and a support-ticket generator. Either remove the attachment UI or implement upload.

### 4. `ChatView.attachModelSelectorListeners` uses `alert()` and `cloneNode` to manage handlers
- **Severity:** Medium
- **Files:** `components/chat/ChatView.js:763-782` (cloneNode pattern), `:796` (`alert('Please select different models for left and right')`)
- **Description:** To "remove existing handlers", the code clones each `<select>` with `cloneNode(true)` and replaces the original. This is a sledgehammer: it destroys *all* listeners and forces a re-query. Additionally, same-model validation uses `alert()` (blocking, style-inconsistent, a11y-poor). This method is called after every `render()` via `requestAnimationFrame`.
- **Why it matters for SaaS:** `alert()` blocks the main thread and breaks automated test flows; `cloneNode` on every render is wasteful and can cause flicker. Modern users expect inline validation.

### 5. `document.execCommand('copy')` fallbacks are deprecated
- **Severity:** Low
- **Files:** `components/chat/ChatView.js:743`, `components/ShareModal.js:323`
- **Description:** Both copy paths fall back to `document.execCommand('copy')`, which is deprecated and may be removed from browsers. `ShareModal.copyLink` also sets `textSpan.textContent = 'Copied!'` then resets to `'Copy'` (mismatch with the initial label `'Copy Link'`).
- **Why it matters for SaaS:** Reliability regression risk; inconsistent button label after copy.

### 6. `ShareModal` has no focus trap and no `aria-modal` / `role="dialog"`
- **Severity:** Medium
- **Files:** `components/ShareModal.js:39-131` (modal markup)
- **Description:** The share modal overlay lacks `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. There is no focus trap: Tab can leave the modal into background content. Escape closes it (good), but focus is not returned to the trigger button on close.
- **Why it matters for SaaS:** WCAG 2.1 AA non-compliance; keyboard users can interact with background content behind a modal they believe is blocking.

### 7. `CustomModal` has no focus trap
- **Severity:** Medium
- **Files:** `components/CustomModal.js:196-240` (`show`/`attachHandlers`)
- **Description:** Same issue as ShareModal: no focus trapping, no focus restoration. `editThread` does focus the input after 100ms (good), but `confirmDelete`/`confirm` do not move focus into the modal at all.
- **Why it matters for SaaS:** Same a11y concern; modals are a core SaaS interaction.

### 8. `Sidebar.handleDeleteThread` reaches into `window._APP` internals — tight coupling
- **Severity:** Medium
- **Files:** `components/Sidebar.js:454-458`
- **Description:** On delete, Sidebar directly mutates `window._APP.state.currentThreadId`, `window._APP.state.turns`, and calls `window._APP.hideFloatingVoting()` / `window._APP.renderChat()`. This bypasses the CustomEvent bus and couples Sidebar to App's private state shape.
- **Why it matters for SaaS:** Any refactor of `App.state` breaks Sidebar silently. The event bus exists precisely to avoid this.

### 9. `SharedThreadView.getBaseUrl()` uses fragile hostname substring matching
- **Severity:** Medium
- **Files:** `components/SharedThreadView.js:88-100`
- **Description:** Detects production via `hostname.includes('dualmindlab.tech') || hostname.includes('workers.dev')`. This misses staging/preview hosts, misclassifies any subdomain containing those strings, and hardcodes `https://api.dualmindlab.tech`. It then cascades through 4 fallback config keys with another hardcoded `http://localhost:5079`.
- **Why it matters for SaaS:** Broken shared links on any non-prod deployed environment; config drift.

### 10. `ShareModal.updateVisibility()` has a direct-fetch fallback with hardcoded URL
- **Severity:** Medium
- **Files:** `components/ShareModal.js:259-286`
- **Description:** If `api.updateThreadVisibility` is unavailable, it falls back to a raw `fetch` with `window.DUALMIND_CONFIG?.apiBaseUrl || ... || 'http://localhost:5079'`. This bypasses the `HttpClient` retry/auth/abort logic and the `apiInstance` singleton. The token is fetched ad hoc via `window.DualMindAuth?.getAccessToken?.()`.
- **Why it matters for SaaS:** Inconsistent auth/retry behavior; a localhost default in production code is a leak risk if the guard ever fails.

### 11. `ChatView` and `SharedThreadView` both define their own `renderMarkdown()` — duplication
- **Severity:** Low
- **Files:** `components/chat/ChatView.js:75-91`, `components/SharedThreadView.js:346-361`
- **Description:** Near-identical implementations (marked.parse → DOMPurify.sanitize → escapeHtml fallback). `ChatView` also has a module-level `escapeHtml` wrapper around `sanitizeHTML` *and* imports `sanitizeHTML` directly; `SharedThreadView` does the same.
- **Why it matters for SaaS:** A sanitization regression fixed in one place but not the other is an XSS gap. Extract to `js/ui/markdown.js`.

### 12. `SharedThreadView._modeLabel` uses emoji and inconsistent labels vs main app
- **Severity:** Low
- **Files:** `components/SharedThreadView.js:182-185`
- **Description:** Returns `⚔ Battle Mode`, `🏟 Arena Mode`, `💬 Direct Chat` with emoji; `Header.modes` uses plain names (`Battle`, `Side by Side`, `Direct Chat`) and `Sidebar` nav uses `Leaderboard` without emoji. The shared view is user-facing public branding.
- **Why it matters for SaaS:** Brand inconsistency on the public share page.

### 13. `ChatInput.setLoading(true)` triggers full re-render + listener re-attachment
- **Severity:** Medium
- **Files:** `components/ChatInput.js:198-202`
- **Description:** `setLoading` calls `this.render()` (full `innerHTML` rebuild) and `this.attachEventListeners()`. This runs on every message send and every stream completion — twice per turn. The textarea loses focus and selection. The action buttons are re-queried and re-bound.
- **Why it matters for SaaS:** Focus loss after every send hurts UX; repeated re-binding is a performance and correctness hazard (e.g., if a previous handler closure captured stale state).

### 14. `ShareModal.attach()` registers 5 separate `click` listeners on the same overlay
- **Severity:** Low
- **Files:** `components/ShareModal.js:173-215`
- **Description:** Five `overlay.addEventListener('click', ...)` calls, each filtering by a different selector. Functionally correct but inefficient and hard to audit. Could be consolidated into one delegated handler.
- **Why it matters for SaaS:** Maintenance cost; small perf overhead.

### 15. `ChatView` inline SVGs duplicate `Icons` factory
- **Severity:** Low
- **Files:** `components/chat/ChatView.js:11-29` (`renderRefreshIcon`, `renderExpandIcon`)
- **Description:** Two module-level SVG functions are defined inline instead of added to `js/icons.js`. AGENTS.md explicitly says "never inline SVGs in component templates." The TTS button at line 446 also inlines an SVG.
- **Why it matters for SaaS:** Violates the documented convention; icon drift risk.

### 16. `ChatView` `alert()` on vote failure and on same-model selection
- **Severity:** Low
- **Files:** `js/ui/app.js:1228` (`alert('Failed to submit vote: ' + error.message)`), `components/chat/ChatView.js:796`
- **Description:** Vote submission failure surfaces via `alert()` with a raw error message. Same-model validation uses `alert()`. `CustomModal.toast()` exists and should be used.
- **Why it matters for SaaS:** Inconsistent error UX; raw backend messages leaked to users.

### 17. `SharedThreadView` markdown rendering fails silently if DOMPurify not loaded
- **Severity:** Low
- **Files:** `components/SharedThreadView.js:346-361`
- **Description:** `share/index.html` loads DOMPurify without `defer`, so it should be ready, but if the CDN fails, `renderMarkdown` falls back to `escapeHtml(text).replace(/\n/g, '<br>')` — safe but loses all formatting. There is no user-visible warning that rendering degraded.
- **Why it matters for SaaS:** Public share pages with broken markdown look broken to prospects.

### 18. `ChatView.attachResponseBodyScrollListeners` mutates DOM elements with `_overflowListenerAttached`
- **Severity:** Low
- **Files:** `components/chat/ChatView.js:996-1019`
- **Description:** Uses `body._overflowListenerAttached = true` as a guard. Setting expando properties on DOM nodes is a code smell (GC leak risk, conflicts with future framework bindings). A `WeakSet` or a component-instance field is cleaner.
- **Why it matters for SaaS:** Maintainability; minor memory hygiene.

### 19. `Sidebar` resize listener is anonymous and never removed
- **Severity:** Low
- **Files:** `components/Sidebar.js:357` (`window.addEventListener('resize', () => this.handleResize())`)
- **Description:** Anonymous arrow listener on `window.resize` with no removal path. Since Sidebar is instantiated once, this is a minor leak, but it prevents any future re-instantiation and shows up as a leak in SPA-style navigations.
- **Why it matters for SaaS:** If the app ever moves to client-side routing without full reloads, listeners accumulate.

### 20. `ChatView` `regenerate` button re-dispatches `chat-submit` with the original prompt
- **Severity:** Low
- **Files:** `components/chat/ChatView.js:683-692`
- **Description:** The refresh button finds the turn's `prompt` and dispatches `chat-submit` with it. This creates a *new* turn (new UUID) rather than replacing the existing one, so the chat grows with each regenerate. There is no "replace turn" path.
- **Why it matters for SaaS:** Users expect regenerate to *replace*; accumulating turns pollutes history and the exported transcript.

---

## SaaS-readiness gaps specific to this domain

1. **No component-level tests.** No unit tests for `Header`, `Sidebar`, `ChatInput`, `ChatView`, `ShareModal`, `CustomModal`, `SharedThreadView`, `ChatExport`, or `Icons`. Playwright tests (`tests/ui-config-bugs.spec.js`) exist but are narrow regression tests, not component coverage. A SaaS launch needs snapshot/behavior tests for modals, voting, streaming, and export.
2. **No a11y audit pass.** Modals lack `role="dialog"`/`aria-modal`/focus traps (issues #6, #7). The floating vote buttons have `aria-label` but the vote container's `role="group"` is set on the inner div, not the `#floating-voting` region. Skip-link exists (`index.html:124`) but only targets `#chat-input`, not the main content.
3. **No internationalization layer.** All UI strings are hardcoded in template literals (e.g., "Message DualMind...", "Share Conversation", "Which response was better?"). A SaaS targeting multiple markets needs an extraction layer.
4. **No error boundary per component.** A throw in `ChatView.renderMarkdown` (e.g., marked.parse on malformed input) would break the entire chat area. `App` has a global `window.onerror` banner, but no component renders a local fallback.
5. **No telemetry on UI failures.** Modal open failures, copy failures, export download failures, and TTS failures all `console.warn`/`alert` and are not reported. Combined with the tests-tooling audit finding (no Sentry), production UI errors are invisible.
6. **Duplicate render logic across leaderboard paths.** Two leaderboard renderers (`leaderboardModal.js`, `leaderboardPage.js`) duplicate skeleton/sort/format code; divergent fixes are likely.
7. **No keyboard shortcut discoverability.** `Ctrl/Cmd+K` (focus input) and `Ctrl/Cmd+B` (toggle sidebar) are implemented (`app.js:1936-1957`) but never shown to users (no help overlay, no tooltips).
8. **Public share page (`SharedThreadView`) has no rate-limit/abuse handling.** It fetches thread + messages via unauthenticated `window._API` on the client; there is no client-side guard against enumeration and no server-side hint referenced here (out of scope but worth flagging).

---

## Recommended fixes / next steps prioritized by impact

### P0 — Block launch
1. **Fix `CustomModal` XSS (issue #2).** Wrap all interpolated `message`/`itemName`/`title` in `sanitizeHTML()` before inserting into `innerHTML`. This is a one-line-per-call-site fix using the already-imported `sanitizeHTML`.
2. **Implement `Sidebar.updateUserInfo()` (issue #1)** so the footer profile reflects auth state changes (call it on `user-logged-in`/profile-update events).
3. **Decide on `ChatInput` attachments (issue #3):** either remove the attachment UI (`#add-btn`, `#image-btn`, `attachments-preview`) or implement upload through `api.arena`. Do not ship a silent no-op feature.

### P1 — High impact
4. **Remove dead code:** `SkeletonLoader.js`, `arena-core.js`, `arena-redesign.css`, `Header.js` 7 stub methods, `Sidebar.updateSidebarState()`, `ChatView.renderVoteBar()`, `old-html-backup/`. Add `dist/` and `deploy_build/` to `.gitignore`.
5. **Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, and focus restoration to `ShareModal` and `CustomModal` (issues #6, #7).** Use the same pattern already in `Sidebar.enableFocusTrap()`.
6. **Replace `alert()` with `CustomModal.toast()` (issue #16, #4).** Applies to `ChatView` same-model validation and `App` vote-failure paths.
7. **Extract shared markdown renderer to `js/ui/markdown.js` (issue #11)** and import in both `ChatView` and `SharedThreadView`. Centralize the DOMPurify-availability guard and a degraded-rendering warning.
8. **Move `Sidebar.handleDeleteThread` to the event bus (issue #8):** dispatch `thread-delete` with `{ threadId }` and let `App` own the state mutation.

### P2 — Medium impact
9. **Refactor `ChatView.attachModelSelectorListeners` (issue #4):** stop using `cloneNode`; use a single delegated `change` handler bound once. Replace `alert()` with inline validation text.
10. **Fix `ChatInput.setLoading` (issue #13):** update only the disabled state of the textarea/buttons and the submit-button class instead of a full re-render. Preserve focus.
11. **Replace `document.execCommand('copy')` fallbacks (issue #5)** with a `navigator.clipboard.writeText` polyfill or a graceful "copy failed" toast. Fix the `Copy`/`Copy Link` label mismatch in `ShareModal.copyLink`.
12. **Consolidate `ShareModal.attach()` click handlers (issue #14)** into one delegated listener.
13. **Move `SharedThreadView.getBaseUrl()` to config (issue #9):** read a single `window.DUALMIND_CONFIG.apiBaseUrl` set by `config.js`; remove hostname sniffing.
14. **Remove `ShareModal.updateVisibility` direct-fetch fallback (issue #10);** require `api.threads.updateVisibility` on the `apiInstance` and fail gracefully via toast if missing.

### P3 — Polish
15. **Add inline SVGs to `js/icons.js` (issue #15):** `refresh`, `expand`, `tts`.
16. **Unify mode labels (issue #12)** between `SharedThreadView._modeLabel` and `Header.modes`.
17. **Replace `body._overflowListenerAttached` with a `WeakSet` (issue #18).**
18. **Store and remove the `Sidebar` resize listener (issue #19)** for future SPA support.
19. **Implement "replace turn" semantics for regenerate (issue #20)** so the chat history doesn't grow on each regenerate.
20. **Extract shared leaderboard render helpers (duplicate-leaderboard note above)** to eliminate the two-implementation maintenance hazard.

---

*Audit complete. Findings are current-state only based on source review; no runtime instrumentation was performed.*
