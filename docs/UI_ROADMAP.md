# DualMind Arena — UI/UX Improvement Roadmap

**Status:** Not yet implemented. This document captures the intended UI/UX work so it becomes part of the project backlog and agent context.

## P0 — Fix broken UX before any redesign

### 1. Repair the auth login flow
- **File:** `login/auth-complete.js`
- **Problem:** Undefined variables (`emailInput`, `setLoading`, `supabaseClient`, `SITE_URL`) crash the email/phone OTP flow.
- **Fix:** Define or import these symbols. Drop duplicate tab-switching logic already handled by another file.

### 2. Add loading / empty / error skeletons to the chat view
- **Files:** `components/chat/ChatView.js`, `components/SkeletonLoader.js`, `js/ui/app.js`
- Replace plain-text `innerHTML` placeholders with shimmer skeletons.
- Add retry CTA for failed thread loads and backend errors.

## P1 — Structural polish

### 3. Merge 12 stylesheets into one built bundle
- **Files:** All `css/*.css`, `index.html`, `build.js`
- Use a mini CSS bundler (or Vite/LightningCSS) that concatenates CSS, removes unused rules, and hashes filenames.
- Update `index.html` to load the single bundle.

### 4. Mobile-responsive battle view
- **File:** `components/chat/ChatView.js`
- Current two-column layout is unusable on phones.
- Below `768px`, switch to a stacked layout with swipeable tabs: "Model A" / "Model B" / "Diff".

### 5. Toast / connection status system
- **Files:** `components/CustomModal.js`, `js/ui/app.js`
- Add a toast queue for: vote confirmation, share copied, backend offline/online, file upload success/failure.
- Add a persistent connection status dot near the header avatar.

### 6. Thread search and organization
- **File:** `components/Sidebar.js`
- Add a search box at the top of the thread list.
- Group threads by date (Today / Yesterday / Last 7 days / Older).
- Add pin, rename, delete actions via an accessible context menu.

## P2 — Product & conversion

### 7. Public demo mode
- **File:** `js/ui/app.js` + landing page
- Let visitors run 3–5 anonymous battles before gating further use behind sign-up.
- Add an engaging hero on `index.html` explaining the value prop.

### 8. Model reveal micro-interaction
- **Files:** `components/chat/ChatView.js`, `css/voting-ui.css`
- Make the post-vote model reveal satisfying: animated identity card, model avatar, confidence badge ("72% preferred this reply").

### 9. Streaming message polish
- **File:** `components/chat/ChatView.js`
- Apply a subtle fade-in / typewriter easing to chunks instead of raw append.
- Keep typing indicators visible during model latency.

### 10. Leaderboard enhancements
- **File:** `leaderboard/index.html`, `js/leaderboardPage.js`
- Filters: time range, provider, model family.
- Sparkline of Elo change over time.
- Clicking a model opens its detailed stats drawer.

## P3 — Micro-interactions & accessibility

### 11. Accessible modals and focus traps
- **Files:** `components/CustomModal.js`, `components/ShareModal.js`
- Ensure `role="dialog"`, `aria-modal="true"`, focus trap, and return focus to trigger on close.

### 12. Button / toggle touch targets
- **File:** `components/ChatInput.js`
- All 16px icon-only buttons must become at least 40×40px touch targets on mobile.

### 13. WCAG color-contrast check
- **File:** `css/tokens.css`
- Verify `--color-terra` (`#CB9275`) on dark surfaces passes WCAG AA for small text.
- Add focus-visible rings to all interactive elements.

### 14. Keyboard shortcuts
- **File:** `js/ui/app.js`
- `1` = vote left
- `2` = vote right
- `n` = new chat
- `l` = open leaderboard modal
- `r` = regenerate response

## Implementation notes for agents

- Do **not** import React/Vue into the current vanilla app unless a full framework migration is explicitly planned.
- Keep using the `CustomEvent` bus; do not introduce Redux/Zustand for isolated UI polish.
- All new CSS variables must live in `css/tokens.css`.
- Each improvement must include a Playwright regression test once the test runner is installed.

---

**Owner:** core maintainers  
**Next action:** Tackle P0 auth crash, then P1 stylesheet consolidation + responsive battle view.
