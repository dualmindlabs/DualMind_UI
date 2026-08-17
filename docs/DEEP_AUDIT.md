# DualMind Arena — Deep Per-File Audit

This file supplements `docs/CODEBASE_AUDIT.md` with fine-grained findings per critical file.


## `js/ui/app.js` (2112 lines)

### Classes
- Line 14: `App`

### Methods (52)
`constructor`, `waitForAuth`, `init`, `checkBackendAvailability`, `showBackendUnavailableBanner`, `hideBackendUnavailableBanner`, `fetchModels`, `prettifyModelName`, `getModelIdByName`, `setup`, `showOfflineIndicator`, `attachGlobalListeners`, `_openExportDropdown`, `handleNavigation`, `handleChatSubmit`, `renderChat`, `cancelStreams`, `runArenaDemo`, `runArenaApi`, `runDirectDemo`, `runDirectApi`, `showFloatingVoting`, `hideFloatingVoting`, `handleVoteSubmit`, `updateTurnVisibilityAfterVote`, `cleanModelName`, `resetTtsButton`, `stopTextToSpeech`, `handleTextToSpeech`, `syncUserWithBackend`, `getPendingUserSyncQueue`, `setPendingUserSyncQueue`, `enqueuePendingUserSync`, `removePendingUserSync`, `flushPendingUserSync`, `getPendingVoteQueue`, `setPendingVoteQueue`, `enqueuePendingVote`, `flushPendingVotes`, `createThread`, `loadThread`, `startNewChat`, `showLeaderboard`, `adjustLayout`, `handleResize`, `handleKeyboard`, `handleLogout`, `resetVoteState`, `highlightResponseCards`, `applyVoteSelection`, `getState`, `getComponent`

### innerHTML assignments
- Line 382: `indicator.innerHTML = ``
- Line 918: `if (leftEl) leftEl.innerHTML = '';`
- Line 919: `if (rightEl) rightEl.innerHTML = '';`
- Line 1114: `container.innerHTML = ``
- Line 1144: `container.innerHTML = '';`
- Line 1345: `buttonElement.innerHTML = originalContent;`
- Line 1410: `buttonElement.innerHTML = '⏳';`
- Line 1423: `buttonElement.innerHTML = '⏹';`
- Line 1458: `buttonElement.innerHTML = '⏹';`
- Line 1857: `iconEl.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" st`
- Line 1876: `iconEl.innerHTML = originalIcon;`

### addEventListener calls
- Line 36: `document.addEventListener('toggle-code-mode', (e) => {`
- Line 45: `document.addEventListener('toggle-web-search', (e) => {`
- Line 55: `document.addEventListener('user-logout', () => this.handleLogout());`
- Line 160: `document.addEventListener('DOMContentLoaded', () => this.setup());`
- Line 270: `btn.addEventListener('click', async () => {`
- Line 412: `document.addEventListener('toggle-mobile-menu', () => {`
- Line 417: `document.addEventListener('nav-action', (e) => {`
- Line 422: `document.addEventListener('mode-change', (e) => {`
- Line 428: `document.addEventListener('api-toggle', (e) => {`
- Line 433: `document.addEventListener('click', (e) => {`
- Line 461: `document.addEventListener('chat-submit', (e) => {`
- Line 466: `document.addEventListener('vote-submit', (e) => {`
- Line 471: `document.addEventListener('mouseover', (e) => {`
- Line 482: `document.addEventListener('mouseout', (e) => {`
- Line 494: `document.addEventListener('sidebar-toggle', (e) => {`
- Line 499: `document.addEventListener('thread-clicked', (e) => {`
- Line 504: `window.addEventListener('resize', () => {`
- Line 509: `document.addEventListener('keydown', (e) => {`
- Line 514: `document.addEventListener('open-share-modal', () => {`
- Line 531: `document.addEventListener('open-export-menu', async () => {`

### window.* references/assignments
- Line 68: `window._DUALMIND_API = this.api;`
- Line 292: `window._DUALMIND_MODELS = response.items || response || [];`
- Line 295: `window._DUALMIND_MODELS = [];`
- Line 332: `window._APP = this;`
- Line 373: `window._DUALMIND_APP_READY = true;`
- Line 2108: `window.DualMindArena = app;`
- Line 2109: `window._APP = app;`

## `components/chat/ChatView.js` (1075 lines)

### Classes
- Line 35: `ChatView`

### Methods (26)
`constructor`, `setupMarkdown`, `renderMarkdown`, `setState`, `appendTurn`, `clear`, `render`, `renderEmptyArena`, `renderArena`, `renderTurn`, `renderResponseCard`, `ensureResponseModal`, `openResponseModal`, `closeResponseModal`, `renderToggleButton`, `renderVoteBar`, `renderDirect`, `attach`, `attachModelSelectorListeners`, `updateDirectResponse`, `finishDirectResponse`, `updateResponse`, `finishResponse`, `attachScrollListener`, `attachResponseBodyScrollListeners`, `scrollToBottom`

### innerHTML assignments
- Line 117: `temp.innerHTML = turnHtml;`
- Line 152: `this.container.innerHTML = ``
- Line 475: `modal.innerHTML = ``
- Line 554: `body.innerHTML = ``
- Line 563: `body.innerHTML = this.renderMarkdown(data.text || '') + (data.streaming ? '<span class="stream-caret" aria-hidden="true"`
- Line 871: `el.innerHTML = this.renderMarkdown(fullText) + (streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : ''`
- Line 898: `el.innerHTML = this.renderMarkdown(fullText) + (streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : ''`
- Line 909: `modalBody.innerHTML = this.renderMarkdown(fullText) + (streaming ? '<span class="stream-caret" aria-hidden="true"></span`

### addEventListener calls
- Line 498: `modal.addEventListener('click', (e) => {`
- Line 504: `document.addEventListener('keydown', (e) => {`
- Line 749: `this.container.addEventListener('click', this._onClick);`
- Line 772: `newSelect.addEventListener('click', (e) => {`
- Line 779: `newSelect.addEventListener('mousedown', (e) => {`
- Line 815: `freshLeftSelect?.addEventListener('change', handleModelChange);`
- Line 816: `freshRightSelect?.addEventListener('change', handleModelChange);`
- Line 817: `freshDirectSelect?.addEventListener('change', (e) => {`
- Line 824: `swapBtn?.addEventListener('click', () => {`
- Line 835: `randomBtn?.addEventListener('click', () => {`
- Line 853: `chip.addEventListener('click', () => {`
- Line 962: `scrollContainer.addEventListener('scroll', () => {`
- Line 1012: `body.addEventListener('scroll', updateAtBottom, { passive: true });`

## `js/auth/supabase-auth.js` (698 lines)

### Classes
- Line 9: `SupabaseAuthService`

### Methods (27)
`constructor`, `init`, `signup`, `signupWithPhone`, `login`, `logout`, `resetPassword`, `signupWithEmailOtp`, `loginWithEmailOtp`, `verifyEmailOtp`, `sendSmsOtp`, `verifySmsOtp`, `updatePhone`, `updateProfile`, `changePassword`, `getAccessToken`, `isAuthenticated`, `getUser`, `getUserEmail`, `getUserName`, `getUserInitials`, `getUserId`, `getSession`, `_saveSession`, `_clearSession`, `_parseError`, `signInWithOAuth`

### window.* references/assignments
- Line 694: `window.SupabaseAuthService = SupabaseAuthService;`
- Line 695: `window.initializeSupabaseAuth = initializeSupabaseAuth;`
- Line 696: `window.getSupabaseAuthService = getSupabaseAuthService;`

## `components/Sidebar.js` (692 lines)

### Classes
- Line 10: `Sidebar`

### Methods (29)
`constructor`, `init`, `scheduleLoadThreads`, `loadThreads`, `render`, `renderRecentChats`, `escapeHtml`, `getUserInitials`, `getUserName`, `getUserEmail`, `updateRecentChats`, `attachThreadClickHandlers`, `attachEventListeners`, `attachActionHandlers`, `handleRenameThread`, `handleDeleteThread`, `handleResize`, `updateClasses`, `toggle`, `updateSidebarState`, `open`, `close`, `lockScroll`, `unlockScroll`, `enableFocusTrap`, `disableFocusTrap`, `handleNavClick`, `addRecentChat`, `getState`

### innerHTML assignments
- Line 78: `this.container.innerHTML = ``
- Line 240: `listContainer.innerHTML = this.renderRecentChats();`

### addEventListener calls
- Line 273: `listContainer.addEventListener('click', this._threadClickHandler);`
- Line 279: `toggleBtn?.addEventListener('click', () => {`
- Line 295: `logoBtn?.addEventListener('click', () => {`
- Line 304: `floatingToggle?.addEventListener('click', () => {`
- Line 315: `overlay?.addEventListener('click', () => this.close());`
- Line 320: `item.addEventListener('click', (e) => {`
- Line 330: `settingsBtn?.addEventListener('click', (e) => {`
- Line 337: `document.addEventListener('click', (e) => {`
- Line 351: `logoutBtn?.addEventListener('click', (e) => {`
- Line 357: `window.addEventListener('resize', () => this.handleResize());`
- Line 360: `document.addEventListener('backend-available', (e) => {`
- Line 366: `document.addEventListener('threads-changed', () => {`
- Line 398: `listContainer.addEventListener('click', this._threadActionsClickHandler);`
- Line 630: `document.addEventListener('keydown', this._focusTrapHandler);`
- Line 640: `document.addEventListener('keydown', this._escapeHandler);`

## `components/ChatInput.js` (323 lines)

### Classes
- Line 8: `ChatInput`

### Methods (21)
`constructor`, `init`, `render`, `escapeHtml`, `renderLoader`, `renderAttachments`, `attachEventListeners`, `submit`, `clear`, `setLoading`, `handleAdd`, `handleImageUpload`, `processFiles`, `addAttachment`, `removeAttachment`, `updateAttachments`, `handleWebSearch`, `handleCodeMode`, `focus`, `setValue`, `autoResize`

### innerHTML assignments
- Line 26: `this.container.innerHTML = ``
- Line 269: `preview.innerHTML = this.renderAttachments();`

### addEventListener calls
- Line 128: `input?.addEventListener('input', (e) => {`
- Line 139: `input?.addEventListener('keydown', (e) => {`
- Line 148: `submitBtn?.addEventListener('click', () => this.submit());`
- Line 151: `this.container.querySelector('#add-btn')?.addEventListener('click', () => this.handleAdd());`
- Line 152: `this.container.querySelector('#web-btn')?.addEventListener('click', () => this.handleWebSearch());`
- Line 153: `this.container.querySelector('#image-btn')?.addEventListener('click', () => this.handleImageUpload());`
- Line 154: `this.container.querySelector('#code-btn')?.addEventListener('click', () => this.handleCodeMode());`
- Line 158: `btn.addEventListener('click', (e) => {`
- Line 165: `this.container.querySelector('.chat-input-container')?.addEventListener('click', (e) => {`
- Line 211: `fileInput.addEventListener('change', (e) => {`
- Line 224: `fileInput.addEventListener('change', (e) => {`
- Line 274: `btn.addEventListener('click', (e) => {`

## `components/ShareModal.js` (337 lines)

### Classes
- Line 8: `ShareModal`

### Methods (12)
`constructor`, `init`, `render`, `renderShareIcon`, `renderCopyIcon`, `getVisibilityHint`, `attach`, `open`, `close`, `updateVisibility`, `copyLink`, `rerender`

### innerHTML assignments
- Line 25: `overlay.innerHTML = this.render();`
- Line 233: `overlay.innerHTML = this.render();`
- Line 330: `overlay.innerHTML = this.render();`

### addEventListener calls
- Line 173: `overlay.addEventListener('click', (e) => {`
- Line 180: `overlay.addEventListener('click', (e) => {`
- Line 187: `overlay.addEventListener('click', (e) => {`
- Line 194: `overlay.addEventListener('change', async (e) => {`
- Line 202: `overlay.addEventListener('click', async (e) => {`
- Line 211: `overlay.addEventListener('click', async (e) => {`
- Line 218: `document.addEventListener('keydown', (e) => {`

### fetch calls
- Line 270: `const response = await fetch(`${baseUrl}/api/threads/${this.threadId}/visibility`, {`

## `components/CustomModal.js` (260 lines)

### Classes
- Line 8: `CustomModal`

### Methods (10)
`constructor`, `init`, `confirmDelete`, `editThread`, `confirm`, `toast`, `show`, `attachHandlers`, `close`, `escapeHtml`

### innerHTML assignments
- Line 22: `root.innerHTML = ``
- Line 175: `toast.innerHTML = ``
- Line 204: `if (contentEl) contentEl.innerHTML = content;`

### addEventListener calls
- Line 33: `root.querySelector('.custom-modal-overlay').addEventListener('click', () => this.close());`
- Line 36: `document.addEventListener('keydown', (e) => {`
- Line 115: `input.addEventListener('keydown', (e) => {`
- Line 220: `btn.addEventListener('click', (e) => {`

## `components/SharedThreadView.js` (368 lines)

### Classes
- Line 13: `SharedThreadView`

### Methods (16)
`constructor`, `init`, `loadThread`, `getBaseUrl`, `render`, `renderLoading`, `renderError`, `renderHeader`, `_modeLabel`, `renderMeta`, `renderMessages`, `renderTurn`, `renderFooter`, `prettifyModelName`, `renderMarkdown`, `attach`

### innerHTML assignments
- Line 106: `this.container.innerHTML = this.renderLoading();`
- Line 111: `this.container.innerHTML = this.renderError();`
- Line 115: `this.container.innerHTML = ``

### fetch calls
- Line 64: `const response = await fetch(`${this.getBaseUrl()}/api/threads/${this.threadId}`);`
- Line 71: `const messagesResponse = await fetch(`${this.getBaseUrl()}/api/threads/${this.threadId}/messages`);`

## `components/Header.js` (275 lines)

### Classes
- Line 8: `Header`

### Methods (19)
`constructor`, `init`, `render`, `attachEventListeners`, `toggleDropdown`, `closeDropdown`, `updateDropdownState`, `selectMode`, `toggleUserMenu`, `closeUserMenu`, `updateUserMenuState`, `handleLogout`, `getUserInitials`, `getUserName`, `getUserEmail`, `handleSidebarToggle`, `getCurrentMode`, `setShareVisible`, `setExportVisible`

### innerHTML assignments
- Line 33: `this.container.innerHTML = ``
- Line 192: `if (modeIcon) modeIcon.innerHTML = modeData.icon('white');`

### addEventListener calls
- Line 103: `mobileMenuBtn?.addEventListener('click', () => {`
- Line 109: `modeBtn?.addEventListener('click', () => this.toggleDropdown());`
- Line 114: `option.addEventListener('click', () => {`
- Line 121: `shareBtn?.addEventListener('click', () => {`
- Line 127: `exportBtn?.addEventListener('click', () => {`
- Line 138: `document.addEventListener('click', this._onDocumentClick);`
- Line 151: `document.addEventListener('keydown', this._onDocumentKeyDown);`
- Line 154: `document.addEventListener('sidebar-toggle', (e) => {`

## `worker.js` (298 lines)


### Methods (1)
`fetch`

### fetch calls
- Line 2: `async fetch(request, env) {`
- Line 39: `const backendResponse = await fetch(backendRequestUrl, {`
- Line 79: `let assetResponse = await env.ASSETS.fetch(new Request(shareUrl, request));`
- Line 217: `let assetResponse = await env.ASSETS.fetch(request);`
- Line 248: `assetResponse = await env.ASSETS.fetch(new Request(htmlUrl, request));`
- Line 263: `assetResponse = await env.ASSETS.fetch(new Request(indexUrl, request));`
- Line 279: `const errorResponse = await env.ASSETS.fetch(new Request(errorUrl, request));`

## `config.js` (146 lines)


### Methods (0)


### window.* references/assignments
- Line 1: `window.DUALMIND_CONFIG = window.DUALMIND_CONFIG || {};`

## `js/api/core/HttpClient.js` (356 lines)

### Classes
- Line 35: `HttpClient`

### Methods (14)
`constructor`, `buildUrl`, `buildHeaders`, `log`, `getRetryDelay`, `isRetryable`, `safeJsonParse`, `request`, `get`, `post`, `put`, `patch`, `delete`, `sleep`

### addEventListener calls
- Line 164: `signal.addEventListener('abort', () => controller.abort(), { once: true });`
- Line 260: `signal.addEventListener('abort', () => controller.abort(), { once: true });`

## `js/api/services/ArenaService.js` (139 lines)

### Classes
- Line 12: `ArenaService`

### Methods (6)
`constructor`, `chat`, `dualChat`, `textToSpeech`, `submitVote`, `getLeaderboard`

## `login/auth-complete.js` (242 lines)


### Methods (0)


### innerHTML assignments
- Line 118: `submitBtn.innerHTML = '<span>Verify Code</span><i class="ri-check-line"></i>';`
- Line 192: `submitBtn.innerHTML = '<span>Verify Code</span><i class="ri-check-line"></i>';`
- Line 194: `submitBtn.innerHTML = '<span>Send Code</span><i class="ri-smartphone-line"></i>';`
- Line 197: `submitBtn.innerHTML = isLogin`

### addEventListener calls
- Line 26: `tab.addEventListener('click', () => {`
- Line 57: `forgotBtn.addEventListener('click', async (e) => {`
- Line 165: `form.addEventListener('submit', async (e) => {`
- Line 205: `phoneInput.addEventListener('input', (e) => {`
- Line 230: `otpInput.addEventListener('input', (e) => {`


---
*End of deep audit.*
