# CSS Class Inventory

**Generated**: Task 3.1 - CSS Audit and Baseline  
**Date**: Baseline audit before consolidation  
**Files Analyzed**: styles.css, ui-improvements.css, custom-modal.css, sidebar-actions.css

## Summary Statistics

- **Total CSS Files**: 4
- **Total Lines**: ~5,500+ lines
- **styles.css**: 3,300 lines
- **ui-improvements.css**: ~1,200 lines
- **custom-modal.css**: ~400 lines
- **sidebar-actions.css**: ~100 lines

## CSS Variables (Design Tokens)

### Defined in styles.css :root

#### Font Families
- `--font-family-base`: 'Inter', system fonts
- `--font-family-heading`: 'Inter', system fonts
- `--font-family-mono`: 'JetBrains Mono', 'Fira Code', 'Consolas'

#### Background Colors
- `--bg-0`: #000000
- `--bg-1`: #0a0a0a
- `--bg-2`: #111111
- `--bg-3`: #1a1a1a
- `--bg-card`: rgba(255, 255, 255, 0.03)
- `--bg-hover`: rgba(255, 255, 255, 0.05)

#### Brand Colors
- `--color-primary`: #6366f1
- `--color-primary-hover`: #4f46e5
- `--color-accent`: #22d3ee
- `--color-accent-hover`: #06b6d4
- `--color-success`: #10b981
- `--color-warning`: #f59e0b
- `--color-error`: #ef4444

#### Text Colors
- `--text-primary`: #ffffff
- `--text-secondary`: rgba(255, 255, 255, 0.7)
- `--text-tertiary`: rgba(255, 255, 255, 0.5)
- `--text-muted`: rgba(255, 255, 255, 0.4)


#### Border Colors
- `--border-primary`: rgba(255, 255, 255, 0.1)
- `--border-secondary`: rgba(255, 255, 255, 0.06)
- `--border-strong`: rgba(255, 255, 255, 0.15)
- `--border-focus`: 2px solid var(--color-primary)

#### Glass Effects
- `--glass-bg`: rgba(255, 255, 255, 0.03)
- `--glass-bg-strong`: rgba(255, 255, 255, 0.05)
- `--glass-border`: rgba(255, 255, 255, 0.1)
- `--glass-blur`: blur(24px)
- `--glass-hover`: rgba(255, 255, 255, 0.08)
- `--glass-sidebar`: rgba(10, 10, 10, 0.7)
- `--glass-header`: rgba(10, 10, 10, 0.6)
- `--glass-card`: rgba(255, 255, 255, 0.04)
- `--glass-input`: rgba(255, 255, 255, 0.06)

#### Layout Dimensions
- `--sidebar-width`: 260px
- `--sidebar-collapsed-width`: 80px
- `--header-height`: 64px
- `--input-width`: 760px

#### Border Radius Scale
- `--radius-xs`: 8px
- `--radius-sm`: 12px
- `--radius-md`: 16px
- `--radius-lg`: 20px
- `--radius-xl`: 24px
- `--radius-2xl`: 32px
- `--radius-full`: 9999px

#### Spacing Scale
- `--space-1` through `--space-16`: 4px to 64px increments

#### Typography Scale
- `--text-xs` through `--text-4xl`: 12px to 36px
- `--leading-tight`, `--leading-normal`, `--leading-relaxed`: 1.25 to 1.7
- `--font-normal` through `--font-bold`: 400 to 700

#### Transitions
- `--transition-fast`: 0.15s cubic-bezier(0.4, 0, 0.2, 1)
- `--transition-normal`: 0.2s cubic-bezier(0.4, 0, 0.2, 1)
- `--transition-slow`: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- `--transition-smooth`: 0.4s cubic-bezier(0.4, 0, 0.2, 1)

#### Shadows
- `--shadow-xs` through `--shadow-xl`: Various box-shadow definitions
- `--shadow-glow`, `--shadow-glow-strong`: Glow effects

#### Z-index Layers
- `--z-base`: 1
- `--z-header`: 10
- `--z-sidebar`: 20
- `--z-overlay`: 30
- `--z-dropdown`: 35
- `--z-modal`: 40
- `--z-toast`: 50

### Custom Variables in ui-improvements.css
- `--chat-surface`: rgba(16, 18, 28, 0.92)
- `--chat-surface-strong`: rgba(10, 12, 18, 0.96)
- `--chat-border`: rgba(255, 255, 255, 0.08)
- `--chat-ink`: rgba(255, 255, 255, 0.92)
- `--chat-muted`: rgba(255, 255, 255, 0.62)
- `--chat-accent-left`: #4AABC2
- `--chat-accent-right`: #CB9275
- `--chat-accent-user`: #7aa6ff
- `--accent`: var(--chat-accent-left) (used in response cards)


## CSS Classes by Component

### App Layout
- `.app-background` - Background image
- `.main-content` - Main content area
- `.main-content.collapsed` - Collapsed sidebar state

### Chat Area
- `.chat-area` - Main chat container
- `.chat-empty` - Empty state card (DUPLICATE in ui-improvements.css)
- `.chat-empty-icon` - Empty state icon
- `.chat-empty-title` - Empty state title (DUPLICATE)
- `.chat-empty-subtitle` - Empty state subtitle (DUPLICATE)
- `.chat-turns` - Chat turns container
- `.scroll-sentinel` - Scroll anchor element
- `.chat-turn` - Individual turn container
- `.prompt-row` - Prompt row wrapper
- `.prompt-bubble` - Prompt bubble
- `.prompt-label` - Prompt label
- `.prompt-text` - Prompt text content

### User Messages
- `.user-message-container` - User message wrapper
- `.user-message` - User message flex container
- `.user-avatar` - User avatar (DUPLICATE in ui-improvements.css)
- `.user-bubble` - User message bubble (DUPLICATE in ui-improvements.css)
- `.user-text` - User message text (DUPLICATE in ui-improvements.css)

### Response Cards
- `.responses-grid` - Response grid container (DUPLICATE)
- `.responses-grid.single-response` - Single response mode (DUPLICATE)
- `.response-card` - Response card (DUPLICATE with conflicts)
- `.response-card.is-expanded` - Expanded card state
- `.response-card.is-streaming` - Streaming state (DUPLICATE)
- `.response-card.is-winner` - Winner state (DUPLICATE)
- `.response-card.is-loser` - Loser state (DUPLICATE)
- `.response-card.vote-highlight-green` - Vote highlight (DUPLICATE)
- `.response-card.vote-highlight-red` - Vote highlight (DUPLICATE)
- `.response-card.vote-selected-green` - Vote selected (DUPLICATE)
- `.response-card.vote-selected-red` - Vote selected (DUPLICATE)
- `.response-header` - Response header (DUPLICATE)
- `.response-body` - Response body (DUPLICATE)
- `.response-actions` - Response actions
- `.response-action-btn` - Response action button

### Model Badges
- `.assistant-tag` - Assistant tag (DUPLICATE)
- `.model-badge` - Model badge (DUPLICATE)
- `.model-dot` - Model indicator dot
- `.model-dot.left` - Left model dot
- `.model-dot.right` - Right model dot
- `.model-name` - Model name text
- `.message-actions` - Message action buttons

### Voting UI
- `.vote-row` - Vote row container
- `.vote-panel` - Vote panel
- `.vote-title` - Vote title
- `.vote-actions` - Vote actions container
- `.vote-btn` - Vote button
- `.vote-btn.active` - Active vote button
- `.vote-hint` - Vote hint text
- `.vote-hint.is-error` - Error hint
- `.floating-voting` - Floating voting container (DUPLICATE)
- `.floating-voting-container` - Voting container wrapper
- `.vote-buttons` - Vote buttons wrapper
- `.vote-btn-light` - Light vote button (DUPLICATE, TRUNCATED in styles.css)
- `.vote-btn-light.active` - Active light vote button
- `.vote-btn-light[data-vote="left"]` - Left vote button
- `.vote-btn-light[data-vote="right"]` - Right vote button
- `.vote-btn-light[data-vote="tie"]` - Tie vote button
- `.vote-btn-light[data-vote="both-bad"]` - Both bad vote button


### Sidebar Component
- `#sidebar-container` - Sidebar container
- `.sidebar-overlay` - Sidebar overlay
- `.sidebar-overlay.active` - Active overlay
- `.sidebar` - Sidebar main element
- `.sidebar.collapsed` - Collapsed state
- `.sidebar.open` - Open state
- `.sidebar-header` - Sidebar header
- `.logo-btn` - Logo button
- `.logo-btn.dropdown-open` - Dropdown open state
- `.logo-icon` - Logo icon
- `.logo-text` - Logo text
- `.logo-chevron` - Logo chevron
- `.sidebar-toggle` - Sidebar toggle button
- `.floating-toggle` - Floating toggle (collapsed state)
- `.sidebar-nav` - Sidebar navigation
- `.nav-item` - Navigation item
- `.nav-item.active` - Active nav item
- `.nav-icon` - Navigation icon
- `.nav-text` - Navigation text
- `.recent-chats-section` - Recent chats section
- `.section-title` - Section title
- `.recent-chats-list` - Recent chats list
- `.chat-item-wrapper` - Chat item wrapper (DUPLICATE in sidebar-actions.css)
- `.chat-item` - Chat item (DUPLICATE)
- `.chat-item.active` - Active chat item
- `.chat-item.editing` - Editing state
- `.chat-icon` - Chat icon
- `.chat-title` - Chat title
- `.chat-title-input` - Chat title input (editing)
- `.chat-actions` - Chat action buttons (DUPLICATE in sidebar-actions.css)
- `.chat-action-btn` - Chat action button (DUPLICATE)
- `.empty-chats` - Empty chats state
- `.sidebar-footer` - Sidebar footer
- `.footer-link` - Footer link
- `.footer-row` - Footer row (MISSING CSS DEFINITION)

### Header Component
- `#header-container` - Header container
- `.main-header` - Main header
- `.mobile-menu-btn` - Mobile menu button
- `.mode-selector` - Mode selector
- `.mode-btn` - Mode button
- `.mode-btn.open` - Open mode button
- `.mode-icon` - Mode icon
- `.mode-text` - Mode text
- `.mode-chevron` - Mode chevron
- `.mode-chevron.rotated` - Rotated chevron
- `.mode-dropdown` - Mode dropdown
- `.mode-dropdown.open` - Open dropdown
- `.mode-option` - Mode option
- `.mode-option.active` - Active option
- `.mode-option-content` - Option content
- `.mode-option-text` - Option text
- `.mode-option-title` - Option title
- `.mode-option-subtitle` - Option subtitle
- `.mode-option-icon` - Option icon
- `.mode-option-divider` - Option divider
- `.header-controls` - Header controls
- `.api-btn` - API button (UNUSED)
- `.api-indicator` - API indicator (UNUSED)
- `.api-indicator.active` - Active indicator (UNUSED)
- `.api-text` - API text (UNUSED)
- `.more-btn` - More button (UNUSED)
- `.user-menu` - User menu
- `.user-btn` - User button
- `.user-avatar` - User avatar
- `.user-avatar-large` - Large user avatar
- `.user-dropdown` - User dropdown
- `.user-dropdown.open` - Open dropdown
- `.user-info` - User info
- `.user-details` - User details
- `.user-name` - User name
- `.user-email` - User email
- `.user-actions` - User actions
- `.user-action-btn` - User action button
- `.user-action-icon` - User action icon


### Chat Input Component
- `#chat-input-container` - Chat input container
- `.chat-input-wrapper` - Chat input wrapper
- `.chat-input-container` - Chat input container (class, not ID)
- `.attachments-preview` - Attachments preview
- `.attachments-preview.has-items` - Has items state
- `.attachment-item` - Attachment item
- `.attachment-preview` - Attachment preview image
- `.attachment-file` - Attachment file
- `.attachment-name` - Attachment name
- `.attachment-remove` - Attachment remove button
- `.input-field-wrapper` - Input field wrapper
- `.chat-input` - Chat input textarea
- `.action-buttons` - Action buttons container
- `.left-actions` - Left actions
- `.action-btn` - Action button
- `.action-btn.active` - Active action button
- `.submit-btn` - Submit button
- `.submit-btn.loading` - Loading state
- `.loader` - Loader container
- `.loader-spinner` - Loader spinner

### Direct Chat
- `.direct-thread` - Direct thread container
- `.direct-msg` - Direct message
- `.direct-msg.user` - User message
- `.direct-msg.assistant` - Assistant message
- `.direct-bubble` - Direct bubble
- `.direct-meta` - Direct metadata
- `.direct-text` - Direct text

### Model Selector (ui-improvements.css)
- `.random-battle-card` - Random battle card
- `.random-model` - Random model
- `.random-icon` - Random icon
- `.random-label` - Random label
- `.vs-badge` - VS badge
- `.model-selector-hint` - Model selector hint
- `.model-selector-grid` - Model selector grid
- `.model-selector-column` - Model selector column
- `.model-label` - Model label
- `.model-select` - Model select dropdown
- `.model-selector-actions` - Model selector actions
- `.direct-model-selector` - Direct model selector

### Buttons (ui-improvements.css)
- `.icon-btn` - Icon button (DUPLICATE)
- `.secondary-btn` - Secondary button

### Loading States
- `.response-loading` - Response loading
- `.response-error` - Response error
- `.skeleton` - Skeleton loading
- `.skeleton-text` - Skeleton text
- `.skeleton-avatar` - Skeleton avatar
- `.dm-skel` - DM skeleton
- `.dm-skel.w-30`, `.dm-skel.w-40`, `.dm-skel.w-70` - Width variants

### Response Modal (ui-improvements.css)
- `.response-modal` - Response modal
- `.response-modal.open` - Open modal
- `.response-modal-scrim` - Modal scrim
- `.response-modal-card` - Modal card
- `.response-modal-header` - Modal header
- `.response-modal-heading` - Modal heading
- `.response-modal-tag` - Modal tag
- `.response-modal-title` - Modal title
- `.response-modal-subtitle` - Modal subtitle
- `.response-modal-body` - Modal body


### Leaderboard Modal
- `.dm-modal-overlay` - Modal overlay
- `.dm-modal` - Modal container
- `.dm-modal.open` - Open modal
- `.dm-modal-head` - Modal head
- `.dm-modal-title` - Modal title
- `.dm-modal-actions` - Modal actions
- `.dm-modal-btn` - Modal button
- `.dm-modal-close` - Modal close button
- `.dm-modal-body` - Modal body
- `.dm-lb-shell` - Leaderboard shell
- `.dm-lb-top` - Leaderboard top section
- `.dm-lb-title` - Leaderboard title
- `.dm-lb-subtitle` - Leaderboard subtitle
- `.dm-lb-refresh` - Refresh button
- `.dm-lb-table-wrap` - Table wrapper
- `.dm-lb-table` - Leaderboard table
- `.dm-lb-row` - Table row
- `.dm-lb-row-skel` - Skeleton row
- `.dm-lb-rank` - Rank column
- `.dm-lb-rank.rank-1`, `.rank-2`, `.rank-3` - Medal ranks
- `.dm-lb-rank-pill` - Rank pill
- `.dm-lb-model` - Model info
- `.dm-lb-model-name` - Model name
- `.dm-lb-model-provider` - Model provider
- `.dm-lb-win-pill` - Win rate pill
- `.dm-lb-num` - Number column
- `.dm-lb-state` - Empty/error state
- `.dm-lb-state-title` - State title
- `.dm-lb-state-subtitle` - State subtitle
- `.dm-lb-action` - State action button

### Custom Modal (custom-modal.css)
- `.custom-modal-root` - Modal root
- `.custom-modal-overlay` - Modal overlay
- `.custom-modal-overlay.show` - Show overlay
- `.custom-modal-container` - Modal container
- `.custom-modal-container.show` - Show container
- `.custom-modal-content` - Modal content
- `.custom-modal-icon` - Modal icon
- `.custom-modal-icon.delete` - Delete icon
- `.custom-modal-icon.edit` - Edit icon
- `.custom-modal-icon.confirm` - Confirm icon
- `.custom-modal-title` - Modal title
- `.custom-modal-message` - Modal message
- `.custom-modal-warning` - Modal warning
- `.custom-modal-form` - Modal form
- `.custom-modal-input` - Modal input
- `.custom-modal-input-hint` - Input hint
- `.custom-modal-actions` - Modal actions
- `.custom-modal-btn` - Modal button
- `.custom-modal-btn.primary` - Primary button
- `.custom-modal-btn.secondary` - Secondary button
- `.custom-modal-btn.danger` - Danger button
- `.custom-toast` - Toast notification
- `.custom-toast.show` - Show toast
- `.custom-toast.success` - Success toast
- `.custom-toast.error` - Error toast
- `.custom-toast.info` - Info toast
- `.custom-toast-icon` - Toast icon
- `.custom-toast-message` - Toast message

### Utility Classes
- `.hidden` - Hidden element
- `.sr-only` - Screen reader only
- `.text-muted` - Muted text
- `.text-sm` - Small text
- `.text-center` - Center text
- `.flex` - Flex display
- `.flex-center` - Flex center
- `.flex-between` - Flex space-between
- `.glass-panel` - Glass panel (reusable)
- `.animate-fade-in` - Fade in animation (UNUSED)
- `.animate-slide-in` - Slide in animation (UNUSED)
- `.animate-scale-in` - Scale in animation (UNUSED)
- `.stagger-1` through `.stagger-5` - Stagger delays (UNUSED)

### Special Selectors
- `[data-tooltip]` - Tooltip attribute (UNUSED)
- `body.drawer-open` - Drawer open state
- `.skip-link` - Skip link for accessibility
- `.bg-glow` - Background glow effect
- `.stream-caret` - Streaming caret


### TTS Button (ui-improvements.css)
- `.tts-btn[data-tts-state="playing"]` - Playing state
- `.tts-btn[data-tts-state="loading"]` - Loading state
- `.copy-btn.copied` - Copied state

## Animations

### Defined in styles.css
- `@keyframes fadeInUp` - Fade in and move up
- `@keyframes slideInRight` - Slide in from right
- `@keyframes caretBlink` - Caret blinking
- `@keyframes pulse-glow` - Pulsing glow effect
- `@keyframes spin` - Spinner rotation
- `@keyframes skeleton-shimmer` - Skeleton loading shimmer
- `@keyframes fadeIn` - Fade in (UNUSED)
- `@keyframes slideIn` - Slide in (UNUSED)
- `@keyframes slideInLeft` - Slide in from left (UNUSED)
- `@keyframes scaleIn` - Scale in
- `@keyframes skeleton-loading` - Skeleton loading (DUPLICATE name)

### Defined in ui-improvements.css
- `@keyframes dm-stream-sweep` - Streaming sweep effect

### Defined in custom-modal.css
- `@keyframes modalPulse` - Modal pulse effect

## Key Duplicates and Conflicts

### Major Duplicates
1. **`.chat-empty`** - Defined in both styles.css and ui-improvements.css with different styles
2. **`.response-card`** - Defined in both files with conflicting background values
3. **`.user-bubble`** - Different styling in both files
4. **`.model-badge`** - Different implementations
5. **`.floating-voting`** - Different positioning and styles
6. **`.vote-btn-light`** - Truncated in styles.css, complete in ui-improvements.css
7. **`.responses-grid`** - Different grid configurations
8. **`.chat-area`** - Different max-widths and styling

### Variable Conflicts
1. **Accent colors**: #4AABC2 vs #22d3ee (--color-accent)
2. **Glass effects**: Multiple overlapping definitions
3. **Border radius**: Hardcoded values vs CSS variables
4. **Font families**: 'Inter' vs 'Outfit' vs 'Inria Sans'

### Z-index Issues
- styles.css uses --z-modal: 40
- custom-modal.css uses z-index: 99999
- Potential stacking conflicts

### Missing Definitions
- `.footer-row` - Referenced in Sidebar.js but no CSS definition found
- `.api-btn`, `.api-indicator`, `.api-text` - Defined but unused
- `.more-btn` - Defined but unused
- `[data-tooltip]` - CSS defined but no HTML implementation

### Animation Duplicates
- `skeleton-shimmer` vs `skeleton-loading` - Same effect, different names

## File Size Analysis

- **styles.css**: 3,300 lines (~120KB estimated)
- **ui-improvements.css**: ~1,200 lines (~45KB estimated)
- **custom-modal.css**: ~400 lines (~15KB estimated)
- **sidebar-actions.css**: ~100 lines (~4KB estimated)
- **Total**: ~5,000 lines (~184KB estimated uncompressed)

## Recommendations for Consolidation

1. Merge ui-improvements.css into styles.css, resolving conflicts
2. Integrate custom-modal.css with consistent design language
3. Integrate sidebar-actions.css into main sidebar styles
4. Remove unused classes (.api-btn, .more-btn, animation utilities)
5. Standardize all hardcoded colors to use CSS variables
6. Fix z-index scale to be consistent
7. Complete or remove incomplete implementations ([data-tooltip], .footer-row)
8. Consolidate duplicate animation names
9. Target final size: <100KB uncompressed

