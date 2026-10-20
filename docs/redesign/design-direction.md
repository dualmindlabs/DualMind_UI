# DualMind Arena redesign: design direction

Status: **approved** by Harsh on 2026-10-20. Build started (see migration-plan.md, slice S1).

Companion documents:

- [screen-inventory.md](./screen-inventory.md): every current screen, URL and known issue
- [migration-plan.md](./migration-plan.md): architecture, URL map, deploy, tests and the PR-sized slices
- [new-features.md](./new-features.md): new feature proposals, frontend first
- [component-catalog.md](./component-catalog.md): 40 component sources for AI websites, their licences, and the final pick list per screen

This document sets the look, feel and rules for every screen of the new Arena frontend (React + Vite + Tailwind CSS v4, same URLs, Cloudflare Workers, Supabase auth). It builds on the brand that already exists: the [Brand and design tokens](https://dev-doc.dualmindlab.tech/brand) page in the developer docs and the live waitlist at [early.dualmindlab.tech](https://early.dualmindlab.tech) (`waitlist-worker/`), which already uses React Bits and Magic UI on this stack.

---

## 1. North star

**"Two minds, one verdict."** The Arena should feel like a precision instrument for judging AI: calm, dark, exact, with a few cinematic moments where it counts (the first prompt, the reveal, the leaderboard). It should not feel like another chatbot clone.

Keywords: **precise, cinematic, editorial, instrumented, quiet until it matters.**

What the user should feel on each core moment:

| Moment | Feeling | How we get there |
| --- | --- | --- |
| Landing | "This is serious, and it's beautiful" | One strong hero, live data, real battle replay, no stock imagery |
| Asking | "I'm in control" | A single focused composer, keyboard-first, clear mode switch |
| Reading two answers | "Fair and readable" | Two equal panes, identical typography, no color that implies good or bad |
| Voting | "My vote counts" | Big, clear vote targets, instant feedback, shortcuts |
| Reveal | "Oh!" | The one signature animation in the app: names decrypt, the winner lights up |
| Leaderboard | "Data I can trust" | Tabular numbers, honest uncertainty, live counts, fast filters |

### Anti-goals (how we avoid generic "AI slop")

- No purple-to-pink gradient blobs as decoration, no glassmorphism stacks, no floating 3D robots, no "sparkle" icons for everything, no emoji as icons.
- No animated text on anything people must read (model answers, legal text, forms). Text effects are for short headings and labels only.
- No cursor-follower effects, no scroll-jacking, no autoplaying sound.
- At most **one** WebGL background per page, and never behind the chat panes.
- Every effect must survive `prefers-reduced-motion`, a phone, light mode and a screen reader. If it can't, it doesn't ship.

---

## 2. Brand foundations

The developer docs describe **one brand with two voices**: the landing page's dark "two minds" look (cyan and violet) and the Arena's warmer product palette (cyan and terra). The redesign unifies them with **semantic roles** instead of picking one:

| Role | Meaning | Dark | Light |
| --- | --- | --- | --- |
| **Mind A** | The left / first model | Cyan `#00D9FF` | Deep cyan `#09738F` |
| **Mind B** | The right / second model | Violet `#8B5CF6` (text `#A78BFA`) | Violet `#6D28D9` |
| **Human** | You: your prompt, your vote, the winner you picked | Terra `#CB9275` | Burnt terra `#9A5434` |

Why: a battle UI needs two colors of **equal status** that don't read as good/bad (so never red vs green), plus a third, warm color that belongs to the person judging. Cyan and violet are already "the two minds"; terra is already the Arena's accent. Machine voices are cool, the human voice is warm. This also matches the typography rule below (Playfair italic = the human voice).

Color is never the only signal: Mind A and Mind B always carry an **A / B letter badge** and keep a fixed position (A left or top, B right or bottom). Cyan and violet can look alike with some color-vision deficiencies, so the letters and positions do the real work.

Wordmark and emblem: keep the existing SVG wordmark rule from the brand page (`DUALMIND` in Bricolage 800 caps with a cyan suffix, here `ARENA`), shipped as inline SVG paths, no font dependency. The emblem is used for the favicon, app icon and social cards.

---

## 3. Color tokens

Tokens live in one CSS file (`web/src/styles/tokens.css`) as CSS variables, exposed to Tailwind v4 through `@theme inline`, with a `[data-theme="light"]` override and `prefers-color-scheme` for the "system" choice. **Dark is the default.** No hex values in components.

Contrast ratios below were computed against the base background of each theme (WCAG 2.x formula). Text tokens are all at least **4.5:1**; control borders at least **3:1** (WCAG 1.4.11).

### Dark (default)

| Token | Value | Use | Contrast on `--bg` |
| --- | --- | --- | --- |
| `--bg` | `#0F1115` | Page background (graphite ink) | |
| `--bg-deep` | `#0A0B0E` | Hero, footer, behind WebGL | |
| `--surface` | `#13161C` | Cards, panes, sidebar | |
| `--surface-2` | `#1A1E25` | Raised: menus, popovers, composer | |
| `--line` | `#2A3038` | Hairlines, dividers (decorative) | 1.4 |
| `--line-strong` | `#636B78` | Input and control borders | 3.5 |
| `--fg` | `#E6E8EB` | Body text | 15.4 |
| `--fg-soft` | `#B8BCC4` | Secondary text | 9.9 |
| `--muted` | `#8C919A` | Captions, metadata | 6.0 |
| `--mind-a` | `#00D9FF` | Mind A accents, focus ring | 11.1 |
| `--mind-b` | `#8B5CF6` | Mind B fills, borders (not small text) | 4.5 |
| `--mind-b-text` | `#A78BFA` | Mind B text | 6.9 |
| `--human` | `#CB9275` | Your prompt, vote, winner | 7.1 |
| `--ok` / `--warn` / `--bad` | `#34D399` / `#FBBF24` / `#F87171` | Status | 9.8 / 11.3 / 6.8 |
| `--focus` | `#00D9FF` | 2px focus ring, 3px offset | 11.1 |

### Light

| Token | Value | Contrast on `#FFFFFF` |
| --- | --- | --- |
| `--bg` | `#FFFFFF` (with `#F7F7F5` sections) | |
| `--surface` / `--surface-2` | `#FAFAF8` / `#FFFFFF` + shadow | |
| `--line` / `--line-strong` | `#E4E4E0` / `#7D838E` | 1.3 / 3.8 |
| `--fg` / `--fg-soft` / `--muted` | `#14161B` / `#3D424B` / `#5F6571` | 18.1 / 10.1 / 5.9 |
| `--mind-a` | `#09738F` | 5.4 |
| `--mind-b` | `#6D28D9` | 7.1 |
| `--human` | `#9A5434` | 5.7 |
| `--ok` / `--warn` / `--bad` | `#047857` / `#A16207` / `#B91C1C` | 5.5 / 4.9 / 6.5 |
| `--focus` | `#09738F` | 5.4 |

Brand cyan `#00D9FF` is only 1.7:1 on white, so light mode never uses it for text or thin lines (same rule the docs sites follow).

Buttons: primary is ink text on cyan in dark mode (11.6:1) and white on deep cyan in light mode (5.4:1). Terra buttons use ink text (7.4:1) in dark mode and white (5.7:1) in light mode.

Tints for pane headers and badges are 8-12% mixes of the role color into `--surface` (`color-mix(in oklab, ...)`), checked so the role text on top stays above 4.5:1 (A: 8.9, B: 6.3, Human: 6.0 in dark; 4.9 / 6.2 / 5.0 in light).

`prefers-contrast: more` swaps `--line` for `--line-strong`, removes translucent surfaces and thickens the focus ring to 3px.

---

## 4. Typography

| Voice | Family | Where |
| --- | --- | --- |
| Machine voice (UI and body) | **Bricolage Grotesque Variable** (opsz + wght axes) | Everything by default, including model answers |
| Human voice | **Playfair Display Italic** | One phrase per heading at most ("You decide.") |
| Labels | **DM Mono** 400/500 | Eyebrows, badges, keyboard hints, small caps labels |
| Code | **JetBrains Mono Variable** | Code blocks and inline code in answers |

This retires Outfit (the current Arena UI font) so the Arena, landing page, waitlist and docs share one type system. All fonts are self-hosted through Fontsource (OFL), subset to Latin + Latin Extended, `font-display: swap`, with the two critical files preloaded.

Scale (rem at 16px; display sizes are fluid with `clamp()`):

| Step | Size / line height | Use |
| --- | --- | --- |
| Display | `clamp(3rem, 8vw, 6.5rem)` / 0.95, weight 300, tracking -0.045em | Landing hero only |
| H1 | `clamp(2.25rem, 4vw, 3.5rem)` / 1.05 | Page titles |
| H2 | 1.75-2.25rem / 1.15 | Sections |
| H3 | 1.25rem / 1.3 | Cards, panes |
| Body | 1rem / 1.65 | Answers and prose (max 72ch per pane) |
| UI | 0.875-0.9375rem / 1.45 | Controls, sidebar, tables |
| Label | 0.6875rem / 1.2, DM Mono, tracking 0.26em, uppercase | Eyebrows and badges |

Rules: `text-wrap: balance` on headings and `pretty` on paragraphs; `font-variant-numeric: tabular-nums` for Elo, counts, timings and tables; never below 12px; answers stay at 16px on phones.

---

## 5. Layout, spacing and surfaces

- **Grid:** 4px base. Spacing scale 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128.
- **Radius:** 6 (chips, inputs), 10 (buttons, small cards), 14 (cards, panes), 20 (composer, dialogs), full (pills, avatars).
- **Containers:** marketing 1200px, prose 68ch, app content fluid with 24px gutters (16px on phones).
- **App shell:** header 56px; thread sidebar 272px, collapsible to a 64px rail (shortcut `[`); the composer floats at the bottom with safe-area insets.
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 (Tailwind defaults). Designs are drawn at 390, 768, 1440 and checked at 320 and 1920.
- **Surfaces:** depth comes from luminance steps plus 1px hairlines, not from blur. Translucency (with `backdrop-filter`) is allowed only for the sticky header and floating composer. Shadows are soft and only in light mode; dark mode uses a 1px inner highlight instead.
- **Glow is a state, not decoration:** a pane glows while it is generating (Border Beam) and the winner glows after the reveal. Nothing glows at rest.

---

## 6. Motion

Motion explains what is happening (sending, generating, revealing, ranking). It is never there only to look busy.

| Token | Value | Use |
| --- | --- | --- |
| `--dur-instant` | 90ms | Press states, toggles |
| `--dur-fast` | 160ms | Hovers, menus, tooltips |
| `--dur-base` | 240ms | Panels, tabs, list changes |
| `--dur-slow` | 420ms | Page transitions, drawers |
| `--dur-cinematic` | 700-1200ms | Hero entrance and the reveal only |
| `--ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for entrances |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Moves and morphs |
| Spring | stiffness 380, damping 32 | Layout changes (`motion` `layout`), the mode switch indicator |

Rules:

1. **One signature moment per screen.** Landing: hero entrance. Arena: the reveal. Leaderboard: rank numbers counting in on first view. Everything else stays subtle.
2. **Animate only `transform`, `opacity` and `filter`.** No layout-thrashing properties.
3. **WebGL backgrounds** (React Bits) are hero-only, lazy-loaded (`React.lazy` + `IntersectionObserver`), paused when off-screen or when the tab is hidden, DPR capped at 1.5, and replaced by a static gradient poster when: reduced motion is on, `pointer: coarse` on small screens, `navigator.deviceMemory < 4`, `Save-Data` is on, or WebGL2 is missing.
4. **Reduced motion is live.** A shared `useReducedMotion()` hook subscribes to changes, and React Bits wrappers remount when it flips (several components read it once at mount). With reduced motion: no movement, cross-fades only (or nothing), counters show final values, the reveal shows names at once.
5. **Answer text:** the battle endpoint returns both answers at once today. We show them with a quick progressive reveal (word-chunk fade at a readable pace, about 1-1.5 s per pane, both panes in parallel) with a "Show all" control, and render instantly under reduced motion. No fake character-by-character typing. When true streaming lands (see new-features.md, B-1), the same renderer streams real tokens.
6. **No motion on route changes for the app shell;** only content cross-fades (base duration), so the sidebar and composer stay put.

---

## 7. Accessibility (WCAG 2.2 AA, tested)

- Contrast: all tokens above meet AA (text 4.5:1, large text and controls 3:1). Checked again in CI with axe on every route, in both themes.
- **Keyboard:** everything reachable and operable; visible focus ring (`--focus`, 2px, 3px offset) on every interactive element; skip link to main content; logical order in the split view (A then B then vote bar).
- **Arena shortcuts** (shown in a `?` overlay and in tooltips): `Ctrl/Cmd+Enter` send, `1` vote A, `2` vote B, `3` tie, `4` both bad, `N` new battle, `Ctrl/Cmd+K` command palette, `[` toggle sidebar, `Esc` stop or close. Single-key shortcuts only fire when focus is not in a text field, and can be turned off in settings (WCAG 2.1.4).
- **Screen readers:** landmarks (`header`, `nav`, `main`, `aside`, `footer`); each pane is a labelled region ("Answer A"); a polite live region announces states ("Both answers ready. Vote with 1 or 2.", "You voted A. Model A was GPT-x."), not every token; the reveal is announced once.
- **Forms:** real `<label>`s, errors linked with `aria-describedby`, `aria-invalid`, OTP input announced as one field, password managers supported (`autocomplete` attributes).
- **Targets:** at least 24x24 CSS px everywhere (2.5.8) and 44x44 on touch layouts; vote buttons are large on every size.
- **Dialogs and drawers:** focus trap, `Esc` closes, focus returns to the trigger (handled by the shadcn primitives).
- **Reflow and zoom:** works at 320px wide and 200% zoom without horizontal scroll (checked in CI with an overflow test, as the waitlist already does).
- **Motion:** see section 6; nothing flashes more than 3 times per second.
- **Language and content:** `lang="en"`, descriptive link text, alt text for every meaningful image, decorative backgrounds `aria-hidden`.
- **Manual checks per slice:** keyboard pass, VoiceOver (Safari) and NVDA (Firefox) smoke test of the slice's main flow, recorded in the PR.

---

## 8. Responsive rules

| Screen | Phone (< 768) | Tablet (768-1023) | Desktop (>= 1024) |
| --- | --- | --- | --- |
| Header | Wordmark + menu button (Vaul drawer) | Full nav, condensed | Full nav, account menu |
| Arena empty state | Composer pinned to bottom, suggestions as a horizontal scroller | Centered composer | Centered composer, sidebar visible |
| Battle | A / B segmented tabs with swipe (CSS scroll-snap), sticky vote bar | Side by side, 50/50 | Side by side, optional sidebar |
| Sidebar | Drawer | Drawer or rail | Panel, collapsible to rail |
| Leaderboard | Card list, key stats only, drawer for details | Table with fewer columns | Full table + side detail sheet |
| Auth | Single column, brand panel becomes a slim header | Single column | Split: form + brand panel |

Mobile specifics: `100svh` / `dvh` units, safe-area insets on the composer and vote bar, `inputmode` and `enterkeyhint` on inputs, no hover-only affordances, and no WebGL on small touch screens (static poster instead).

---

## 9. Component stack and licenses

The full survey (40 sources, licences, AI-site components and the per-screen pick list) is in [component-catalog.md](./component-catalog.md); this table is the short version. All copied-in source keeps its license file next to it (as `waitlist-worker/src/components/reactbits/LICENSE.md` already does), and each file names its source and our changes.

| Library | License | Role | Decision |
| --- | --- | --- | --- |
| [shadcn/ui](https://ui.shadcn.com) | MIT | Base primitives (copied in): button, input, dialog, sheet, dropdown, tabs, tooltip, select, OTP input, accordion, table, chart, command, sonner | **Use.** Base UI primitives (shadcn's default since July 2026); pick once and stay consistent |
| [React Bits](https://reactbits.dev) | MIT + Commons Clause | Hero backgrounds, text effects, a few interactive pieces (`TS-TW` variants) | **Use selectively.** Allowed as part of a website; we may not redistribute the components on their own |
| [Magic UI](https://magicui.design) | MIT | Border Beam, Shine Border, Animated Beam, Number Ticker, Marquee | **Use** |
| [Motion](https://motion.dev) | MIT | Layout animation, presence, springs (`LazyMotion` + `m`) | **Use** |
| [Streamdown](https://github.com/vercel/streamdown) | Apache-2.0 | Streaming-safe Markdown for answers, with Shiki code and KaTeX math plugins | **Use, hardened** (see section 11) |
| [Lucide](https://lucide.dev) | ISC | Icons (already the docs' icon set), 1.75px stroke | **Use** |
| [Sonner](https://sonner.emilkowal.ski) | MIT | Toasts | **Use** |
| [cmdk](https://cmdk.paco.me) | MIT | Command palette | **Use** |
| [Vaul](https://vaul.emilkowal.ski) | MIT | Mobile drawers | **Use** |
| [Recharts](https://recharts.org) (via shadcn charts) | MIT | Leaderboard and model charts | **Use** |
| [TanStack Query](https://tanstack.com/query) | MIT | Server state, caching, retries | **Use** |
| [Aceternity UI](https://ui.aceternity.com) | Custom licence (free + Pro) | Hero prompt box (Placeholders And Vanish Input), backgrounds, Glowing Effect, Bento Grid, Timeline | **Use selectively:** free components only, in their own folder with a licence note, never as a kit (component-catalog.md section 2) |
| [prompt-kit](https://www.prompt-kit.com) | MIT | Prompt input, suggestions, chat container, loaders, thinking bar, feedback bar, code block | **Use** (copied in) |
| [Motion Primitives](https://motion-primitives.com) | MIT | Text Shimmer, Sliding/Animated Number, Animated Background, Morphing Dialog | **Use** |
| [Kokonut UI](https://kokonutui.com) | MIT | AI model selector, AI loading states, diff review patterns | **Use selectively** |
| [Tremor](https://tremor.so) | Apache-2.0 | Bar List, Tracker, Spark Chart for the leaderboard | **Use selectively** |
| Vercel AI Elements registry | Apache-2.0 | Chat components | **Avoid as a dependency** (being folded into shadcn by end of Nov 2026; assumes Next.js + AI SDK). Use shadcn's AI patterns as visual reference |
| [assistant-ui](https://www.assistant-ui.com) | MIT | Chat runtime + primitives | **Not now** (thread-centric; two synchronized panes and voting would fight its runtime) |

Explicitly avoided React Bits items: Lanyard (`three`), Ballpit, cursor effects (Target Cursor, Splash Cursor, Blob Cursor), Liquid Ether on mobile, and Magic Bento unless its icon dependency is stripped.

---

## 10. AI chat building blocks: options and pick

The Arena is not a normal chat. It needs two **synchronized** answer panes, a vote step that must happen before identities are shown, a reveal, and three modes (Battle, Side by side, Direct).

| Option | Pros | Cons for us |
| --- | --- | --- |
| assistant-ui | Polished primitives, stop/regenerate/branching, external-store runtime for custom backends | One runtime per thread; running two in lockstep with a shared vote is undocumented; heavy abstraction |
| Vercel AI SDK `useChat` + AI Elements | Parallel `useChat` instances are fine; good components | Our API does not emit the AI SDK stream protocol, so we'd write a transport; AI Elements registry is being deprecated and assumes Next.js |
| prompt-kit | Light shadcn-style pieces | Small project; unverified Tailwind v4 status |
| **Own state machine + Streamdown + prompt-kit pieces + shadcn AI patterns** | Exact fit for the battle flow; small; we own it; easy to test | We write the hook (about 150 lines), the battle layout, vote bar and reveal |

**Pick: own state machine,** with prompt-kit pieces (Prompt Input, Chat Container, Loader, Thinking Bar, Feedback Bar, copied in) for the chat parts. A `useBattle()` hook (typed, unit-tested) drives this flow:

```
idle -> submitting -> answering(A, B) -> awaiting_vote -> voting -> revealed
                \-> error (retry / back to idle)      \-> follow-up turn -> answering
```

- Rendering: Streamdown for both panes (same renderer for Direct mode and for future true streaming), code blocks with copy, math, tables.
- Pieces we build (shadcn-style, in `web/src/components/arena/`): `Composer` (auto-grow textarea, mode switch, model picker, attachments later), `AnswerPane`, `PaneHeader` (A/B badge, status, timing), `VoteBar`, `RevealCard`, `ThreadList`, `SuggestionChips`, `StopButton`, `CopyButton`, `ModelPicker` (cmdk).
- Shadcn's AI patterns (Message, Prompt Input, Suggestion, Model Selector, Reasoning) are the visual reference for spacing and a11y details.
- Network: one typed API client (see migration-plan.md) with abort support; `POST` battle calls are **not** retried automatically (today they are, which can create duplicate battles).

---

## 11. Content security for model output

- Streamdown with explicit `allowedLinkPrefixes` (`https://`), `allowedImagePrefixes` limited to our own origins (model answers cannot load remote images, which blocks exfiltration through image URLs), `allowDataImages: false`, raw HTML off, and the default sanitize plugin kept.
- Links in answers open with `rel="noopener noreferrer nofollow"` and show the destination host.
- No `dangerouslySetInnerHTML` anywhere except the sanitized Markdown renderer. ESLint rule enforces it.
- A strict Content-Security-Policy becomes possible once CDN scripts are gone (see migration-plan.md).

---

## 12. Screen-by-screen direction

Each screen lists its signature element and the concrete components. "RB" = React Bits, "MU" = Magic UI, "sh" = shadcn/ui. The final pick list per screen, including Aceternity UI, prompt-kit, Motion Primitives, Kokonut UI and Tremor pieces, is the table in [component-catalog.md](./component-catalog.md) section 3; where the two differ, the catalog wins.

### Global shell

- **Header:** wordmark (SVG), nav (Arena, Leaderboard, Models, How it works), theme toggle (system / dark / light), account menu (sh Dropdown). Active nav item uses a Motion `layoutId` underline. Sticky with a translucent `--bg` and hairline on scroll.
- **Footer:** quiet three-column links (product, company, legal), status dot for the API (`/health`), year and copyright. Same component on every page.
- **Command palette** (`Ctrl/Cmd+K`, cmdk): new battle, switch mode, jump to a thread, open leaderboard or a model, toggle theme, sign out.
- **Toasts** (Sonner): vote saved, link copied, offline/online, errors with retry.

### Landing: `/` when signed out

- **Signature:** the hero. Background RB **Light Rays** in two crossing beams, cyan and violet (brand continuity with the waitlist), on `--bg-deep`, static poster on phones and reduced motion.
- Headline with RB **Blur Text**: "Two models. One prompt. *You decide.*" (last phrase in Playfair italic, terra in this app's palette), then the real **composer** right in the hero, built on Aceternity's **Placeholders And Vanish Input** (rotating example prompts; the text vanishes into the battle on submit). Typing a prompt and pressing send opens a sign-in sheet, or runs a **demo battle** from recorded real battles (new-features.md, F-2).
- Under the composer: MU **Animated Beam** draws two beams from the prompt to two answer cards (A cyan, B violet) that play a recorded battle and reveal with RB **Decrypted Text**. This explains the product in five seconds without a paragraph.
- Live strip: battles, votes and models from the public `model-stats` endpoint with RB **Count Up** (honest fallback copy if the API fails, like the waitlist).
- RB **Logo Loop** of model providers (monochrome logos, paused on hover and under reduced motion).
- "How it works" in three steps (ask, compare, vote) with a scroll-linked progress line; top-5 leaderboard preview with RB **Spotlight Card** rows; closing CTA with RB **Star Border** and RB **Magnet** on the button (desktop only).

### Arena: `/` when signed in (Battle, Side by side, Direct)

- **Signature:** the reveal.
- Empty state: centered composer, mode switch as a segmented control with a spring indicator, rotating example prompts as placeholder (RB **Text Type**, paused while focused and off under reduced motion), suggestion chips by category (code, reasoning, writing, math). Background: flat `--bg` with a very faint dot grid. No WebGL in the app.
- Answering: two panes with an A/B header, a RB **Shiny Text** "Generating" label and a MU **Border Beam** around each pane while it works; stop button; elapsed time.
- Awaiting vote: a vote bar docks under the panes: **A is better**, **Tie**, **Both are bad**, **B is better** (large targets, shortcuts 1-4).
- Reveal: model names resolve with RB **Decrypted Text** in each pane header; the chosen pane gets a one-shot RB **Electric Border** that settles into a static terra outline; a small reveal card shows provider, latency and length per side. A polite live-region message announces the result.
- Follow-up turns keep the same pair; "New battle" resets. Direct mode is a single pane with the same renderer.
- Sidebar: threads grouped by date (Today, Yesterday, Last 7 days, Older), search, rename, delete, share; collapsible rail.

### Leaderboard: `/leaderboard/`

- **Signature:** ranks and Elo count in on first view (RB **Count Up**, tabular numbers).
- Header stats strip; top-3 podium cards (RB **Spotlight Card** with a MU **Shine Border** on #1); full table (sh Table): rank, model, provider logo, Elo with an inline bar, wins/losses/ties, win rate, battles; sort, search and provider filter; row opens a detail sheet (drawer on phones) with a win-rate chart (Recharts) and head-to-head when the API supports it.
- Honest data: show battle counts and mark low-sample models ("provisional" under N battles).

### Models: `/models/`

- Grid of model cards (RB **Spotlight Card**, subtle) with provider, Elo, rank and win rate; filters by provider; search. Card opens the same detail sheet as the leaderboard. Later: `/models/<slug>/` pages (new-features.md).

### Auth: `/login-modern.html`, `/signup-modern.html`, `/login/`, `/forgot-password.html`, `/update-password.html`, `/auth-callback.html`

- Split layout: form card on the left; brand panel on the right with RB **Silk** in deep ink and cyan (static poster on phones) and a looping, readable quote from a real battle.
- Tabs for email + password and email code; sh **Input OTP** for the 6-digit code; Google and GitHub buttons; clear inline errors; password visibility toggle; strength hint on sign-up; success states that say what happens next.
- Callback and update-password pages: a centered status card with a progress indicator, plain-language errors and a single next action. Same URLs (see migration-plan.md).

### Share: `/share/<id>`

- Read-only transcript of a battle (or chat) with the reveal already applied, author-safe (no account data), "Run your own battle" CTA, copy link, Open Graph tags. Fixes the broken share links (KNOWN_ISSUES.md #3).

### Info pages: `/about/`, `/how-it-works/`, `/faq/`, `/careers/`

- Editorial layout: big H1 with one Playfair phrase, 68ch prose, generous whitespace, RB **Fade Content** for sections (opacity only).
- How it works: MU **Animated Beam** diagram (prompt to two models to vote to Elo) and the Elo explanation with a small interactive calculator (new-features.md, F-9).
- FAQ: sh **Accordion**, deep-linkable questions, FAQ structured data.

### Legal: `/privacy/`, `/terms/`, `/cookies/`

- Plain, fast, printable: table of contents, "last updated" date, no effects.

### 404 and errors

- RB **Fuzzy Text** "404" in `--muted` (static under reduced motion), a short line in Playfair italic, links to Arena and Leaderboard, and the command palette hint. App errors use the same card with a retry.

### Settings: `/settings/` (new)

- Profile, theme, default mode, shortcut toggle, reduced-motion override, data export and sign-out everywhere. Simple sh form layout, no effects.

### Waitlist (separate app)

- Stays in `waitlist-worker/`. Once the design tokens are a shared package, the waitlist imports them so both apps stay in sync (migration-plan.md, slice S15).

---

## 13. Mood references (described, not copied)

1. **Control room at night:** a dark graphite room, two monitors side by side, each with a thin colored bezel light (cyan, violet). Everything else is off. That is the battle view.
2. **Editorial science magazine:** big light-weight headlines, one italic serif phrase, generous margins, small mono captions. That is the landing and info pages.
3. **Race timing board:** tabular mono numbers, ranks that tick into place, deltas in small arrows. That is the leaderboard.
4. **Courtroom verdict card:** a plain card that flips to show the names after the vote, with the winner's edge lighting up warm. That is the reveal.
5. **Precision instrument:** hairline borders, exact spacing, no ornament on tools. That is settings, auth and the composer.

---

## 14. Definition of done for every screen

- Matches tokens, type and spacing (no hex in components, no ad-hoc sizes).
- Dark and light themes, 320-1920px wide, reduced motion, keyboard-only and screen-reader smoke tested.
- axe: zero serious or critical violations; Playwright screenshots attached to the PR (desktop and mobile, both themes).
- Loading, empty, error and offline states designed, not just the happy path.
- Lighthouse (mobile) on marketing pages: performance >= 90, accessibility 100, best practices >= 95, SEO 100.
