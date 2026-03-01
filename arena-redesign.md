# Arena UI Full Redesign — ChatGPT/Claude Level Polish

## Goal
Completely redesign the DualMind Arena app shell, sidebar, header, chat area, response cards, and empty states to match the visual quality of ChatGPT/Claude — polished, minimal, purposeful.

---

## Context

**Stack:** Vanilla JS, no build step. CSS loaded in this order:
`tokens.css → styles.css → auth-styles.css → model-selector.css → sidebar-actions.css → share-modal.css → custom-modal.css → leaderboard-page.css → voting-ui.css → ai-input.css → ui-improvements.css`

**`ui-improvements.css` wins all specificity conflicts — edit it for final overrides.**

**Font:** `Outfit` (already loaded). `JetBrains Mono` for code.

**Key color tokens (never hardcode):**
- `--color-cyan` = `#4AABC2` (primary, left-side)
- `--color-terra` = `#CB9275` (secondary, right-side)
- Surfaces: `--surface-0` (#000), `--surface-1` (#0a0a0a), `--surface-2` (#0f111a), `--surface-3` (#111)
- Glass: `--glass-bg`, `--glass-sidebar`, `--glass-header`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Borders: `--border-subtle`, `--border-default`, `--border-strong`

**Key class names to preserve (JS depends on them):**
`#app`, `main-wrapper`, `#header-container`, `#main-content`, `#sidebar-container`, `#chat-input-container`, `#floating-voting`, `main-header`, `sidebar`, `sidebar.collapsed`, `sidebar.open`, `sidebar-overlay`, `chat-area`, `chat-turns`, `chat-turn`, `responses-grid`, `response-card`, `response-header`, `response-body`, `model-badge`, `model-dot`, `vote-btn-light`, `floating-voting-container`, `vote-buttons`, `chat-item`, `chat-item.active`, `nav-item`, `nav-item.active`, `mode-btn`, `mode-dropdown`, `user-avatar`, `user-dropdown`

---

## Tasks

- [ ] **Task 1 — App Shell & Background** (`css/styles.css` + `css/ui-improvements.css`)

  Replace the current grey/muted background with a rich dark canvas:
  - `body` / `#app`: `background: #000` base, add `radial-gradient` glow from top-left in cyan-dim, remove current `app-background` image blur
  - `main-wrapper`: no change structurally — just ensure zero gap/overflow issues
  - `#main-content`: seamless dark, no visible seam with sidebar
  - Auth loading overlay: keep but style with centered ⚡ spinner using cyan

  → Verify: Open `localhost:8000` — solid dark canvas, subtle glow, no bright flash

- [ ] **Task 2 — Sidebar Redesign** (`css/styles.css` sidebar section + `css/ui-improvements.css`)

  Target: sleek left rail like Claude's sidebar
  - Sidebar background: `var(--glass-sidebar)` = `rgba(10,10,10,0.70)` with `backdrop-filter: blur(24px)`. Add very subtle right border `rgba(255,255,255,0.05)`.
  - Logo area: ⚡ icon + "DualMind" in a gradient text (`cyan → #8ab4ff`), font-weight 700
  - Nav items (`nav-item`): pill shape on hover/active, icon + label with gap 10px, `--color-cyan` left accent bar on active
  - Thread list items (`chat-item`): `border-radius: 10px`, hover background `rgba(255,255,255,0.05)`. Trim title to 1 line. Actions (rename/delete) slide in on hover. No bottom border per item.
  - New Chat button: full-width pill button at top of thread section with cyan accent
  - Sidebar footer: compact, `--text-muted` links, consistent padding
  - Collapsed state: icon-only mode, center icons, tooltip on hover
  - Mobile drawer: full-width with dark overlay

  → Verify: Sidebar looks like Claude.ai left panel — clean, no clutter, active item clearly highlighted

- [ ] **Task 3 — Header Redesign** (`css/styles.css` header section + `css/ui-improvements.css`)

  Target: minimal floating top bar like ChatGPT
  - `main-header`: transparent or `rgba(0,0,0,0.4)` with `backdrop-filter: blur(16px)`. Height 56px. No hard bottom border — use a very faint `rgba(255,255,255,0.04)` line.
  - Mode selector button (`mode-btn`): pill with border `var(--border-default)`, shows current mode icon + name, subtle hover. Dropdown items have icon + title + subtitle.
  - Share + Export buttons (`header-icon-btn`): 36px circle, glass background, icon only, tooltip on hover
  - User avatar (`user-avatar`): 32px circle, cyan-to-teal gradient bg, initials, opens clean dropdown
  - User dropdown: glass card, user info at top (name + email), logout button at bottom

  → Verify: Header is minimal, does not dominate. Mode dropdown opens with animation.

- [ ] **Task 4 — Chat Empty State Redesign** (`css/ui-improvements.css`)

  Target: Claude-like centered welcome with mode-specific context
  - Battle mode empty state (`.chat-empty`): centered in viewport, large gradient ⚔ or ⚡ icon, bold "Choose your models" title, subtitle "Two AIs. One prompt. You decide."
  - Random battle card (`.random-battle-card`): two model chips separated by glowing VS badge. Better padding, border-radius 20px, cyan-terra gradient border.
  - `random-model` chips: pill-shaped, glass background, model name truncated, `battle-pulse` animation on both before first prompt
  - Prompt suggestions: 4 prompt chips below the model selector, subtle border, hover shows cyan accent. Clicking pre-fills the input.
  - Arena mode empty: similar but shows 2 selectable dropdowns with a centered ⇄ divider
  - Direct mode empty: single model card, centered, "Choose your AI assistant" label

  → Verify: All three empty states look intentional, not like broken placeholders

- [ ] **Task 5 — Response Cards Redesign** (`css/ui-improvements.css`)

  Target: clean elevated cards like Claude's response bubbles
  - `.response-card`: `border-radius: 20px`. Background: `rgba(14,16,26,0.85)` with `backdrop-filter: blur(8px)`. Remove heavy gradient. Border: `1px solid rgba(255,255,255,0.07)`. Subtle `box-shadow`.
  - Left card: `border-left: 2px solid var(--color-cyan)`. Right card: `border-right: 2px solid var(--color-terra)`.
  - Response header (`.response-header`): model dot (cyan/terra) + model name in `--text-secondary` + provider in `--text-muted`. Right side: copy + speak + expand buttons (icon-only, appear on hover).
  - `.model-badge`: pill with semi-transparent bg, colored dot on left, font-weight 500
  - Battle VS divider (`.battle-vs-divider`): 2px vertical line `rgba(255,255,255,0.08)` + "VS" label in terra, no glow needed, centered vertically
  - Winner state (`.is-winner`): subtle green left border + win badge. Loser (`.is-loser`): opacity 0.5, grayscale filter.
  - Streaming state (`.is-streaming`): gentle shimmer sweep animation only on the border, not the whole card
  - User prompt bubble (`.user-bubble`): right-aligned, `border-radius: 18px`, background `rgba(74,171,194,0.12)`, border `var(--border-cyan)`. Max-width 75%.
  - `.responses-grid`: `grid-template-columns: minmax(0,1fr) 40px minmax(0,1fr)`, gap 0

  → Verify: Send a message in battle mode — cards look elevated, VS divider is clean, user bubble is clean

- [ ] **Task 6 — Voting UI Redesign** (`css/voting-ui.css` + `css/ui-improvements.css`)

  Target: voting bar looks like a native part of the UI, not bolted on
  - `.floating-voting-container`: reduce height, pill shape (`border-radius: 32px`), dark glass `rgba(10,12,18,0.97)`, clean border `rgba(255,255,255,0.12)`. Tighter padding.
  - Vote prompt text: smaller, `--text-muted`, "Which response was better?"
  - Vote buttons (`.vote-btn-light`): pill buttons with icons + short label. Colors:
    - Left (A wins): cyan bg on active
    - Right (B wins): terra bg on active
    - Tie: cream/yellow
    - Both bad: red dim
  - Hover: each button shows colored bg at 12% opacity. Active: 25% opacity + colored border
  - Container slides up from below chat input with `transform: translateY` animation

  → Verify: After a battle response, voting bar appears above input — clean, not obtrusive

- [ ] **Task 7 — Chat Input Redesign** (`css/ui-improvements.css` + `css/ai-input.css`)

  Target: ChatGPT-quality input box
  - `.chat-input-container` wrapper: centered, max-width 760px, no background (transparent)
  - Inner input box (`.input-field-wrapper`): `border-radius: 24px`, background `rgba(18,20,28,0.92)`, border `rgba(255,255,255,0.1)`. Focus: border becomes `rgba(74,171,194,0.5)`, glow `rgba(74,171,194,0.08)`.
  - Textarea (`.chat-input`): no border, no background, `Outfit` font, 15px, `--text-primary`, placeholder color `--text-muted`
  - Action buttons (`.action-btn`): 32px pill, icon-only, glass hover
  - Submit button (`.submit-btn`): 36px circle, cyan gradient fill when has text, disabled when empty. Icon: arrow-up SVG.
  - Bottom bar: left side has web-search toggle + code-mode toggle as pill chips. Right has submit.

  → Verify: Type text — submit button activates with cyan color. Input expands on multiline.

- [ ] **Task 8 — Typography & Markdown Polish** (`css/ui-improvements.css`)

  Target: AI responses are readable and beautiful
  - `.response-body` base: `font-size: 15px`, `line-height: 1.75`, `--text-primary`, `Outfit`
  - Headings in markdown (`h1-h3`): font-weight 700, slight top margin
  - Inline code: `JetBrains Mono`, `border-radius: 6px`, background `rgba(255,255,255,0.08)`, padding `2px 6px`, cyan text color
  - Code blocks (`pre`): `border-radius: 14px`, dark background `rgba(0,0,0,0.5)`, border `rgba(255,255,255,0.08)`, lang label top-right, copy button top-right
  - Lists: proper spacing, bullet color `--color-cyan`
  - Blockquotes: left border in cyan, italic text
  - Tables: clean alternating row bg, no heavy borders
  - Links: cyan underline, open in new tab icon

  → Verify: Paste a markdown-heavy response — it renders beautifully, code blocks are styled

- [ ] **Task 9 — Micro-interactions & Polish** (`css/ui-improvements.css` + `css/tokens.css`)

  The difference between "good" and "ChatGPT-level":
  - All buttons: `transition: all 0.18s cubic-bezier(0.25,0.46,0.45,0.94)`. Active state: `transform: scale(0.96)`.
  - Chat turns entrance: `fadeInUp` 0.3s with `opacity 0` → `1`, `translateY(8px)` → `0`. Stagger per turn.
  - Scrollbar: `width: 4px`, thumb `rgba(255,255,255,0.12)`, no track. On hover thumb becomes `rgba(255,255,255,0.2)`.
  - Focus rings: all interactive elements get `outline: 2px solid rgba(74,171,194,0.5)` on focus-visible, not on click
  - Toast notifications (from `CustomModal.js`): slide in from bottom-right, match glass aesthetic
  - Loading states: 3-dot animated ellipsis inside response card while streaming, not a spinner
  - Reduced motion: `@media (prefers-reduced-motion: reduce)` — all animations to `none`

  → Verify: Click buttons — they feel springy. Scrollbar is barely visible. Focus ring appears on Tab.

- [ ] **Task 10 — Leaderboard Modal & Sidebar Actions** (`css/leaderboard-page.css` + `css/sidebar-actions.css`)

  Apply consistent glass card aesthetic:
  - Leaderboard modal: dark glass background, proper border-radius, `backdrop-filter`
  - Table rows: subtle hover, rank medals with gold/silver/bronze colors
  - Sidebar rename/delete actions: match existing design but ensure icons are aligned, transitions consistent

  → Verify: Open leaderboard — table looks clean. Hover a thread in sidebar — action buttons appear smoothly.

---

## Done When

- [ ] App looks at minimum as polished as ChatGPT dark mode when opened on desktop
- [ ] Battle mode: two cards with VS divider, user bubble right-aligned, voting bar looks native
- [ ] Sidebar is sleek — clean logo, nav items, thread list, no clutter
- [ ] Chat input feels premium — smooth focus ring, cyan submit button
- [ ] All text is readable — proper hierarchy, markdown renders cleanly
- [ ] Zero regressions — share button, export, mode switching, voting all still work
- [ ] Responsive — works cleanly at 375px mobile width

## Files to Edit (Priority Order)
1. `css/ui-improvements.css` — primary target, wins all specificity
2. `css/styles.css` — layout/structural fixes
3. `css/voting-ui.css` — voting bar
4. `css/tokens.css` — any missing token additions (add, don't modify existing)
5. `css/model-selector.css` — model selector improvements
6. `css/sidebar-actions.css` — sidebar hover actions

## DO NOT TOUCH
- Any `.js` files (component logic is not changing)
- `css/auth-modern.css` (auth pages are separate)
- `css/shared-thread.css` (share page already redesigned)
- `css/info-pages.css` (info pages already redesigned)
- HTML structure in JS templates — class names must stay the same
