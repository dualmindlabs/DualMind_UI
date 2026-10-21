# DualMind Arena redesign: component licences

Decision recorded on 2026-10-20 (Harsh, 20:57 UTC). Companion documents: [component-catalog.md](./component-catalog.md) (the sources and the picks per screen), [buy-list.md](./buy-list.md) (ranked paid kits), [design-direction.md](./design-direction.md).

This file is the single inventory of every third-party component in the new `web/` app that is not plain permissive code. It exists so each piece can be licensed or replaced before or after the repository goes private.

---

## 1. Policy

The repository stays **public for now** (free GitHub Actions minutes). The goal is the best-looking site possible, so we use the best components from everywhere, under these rules:

1. **Any component whose terms allow use on a website may be used.** Free pieces with a restricted licence (Aceternity UI free tier, React Bits and Animate UI with Commons Clause, 21st.dev items with author licences, Hover.dev free items and similar) go into their own folder `web/src/components/vendor/<source>/` with a per-source `LICENSE-NOTES.md`, and are listed in the inventory in section 4, so they can be licensed or replaced.
2. **Never copy paid-tier (Pro) code or anything behind a paywall, and no AGPL code** (Origin UI / coss ui). Instead the ranked [buy list](./buy-list.md) tells Harsh what is worth paying for. Nothing paid is copied until Harsh decides.
3. **Everything else is permissive (MIT, Apache-2.0, ISC)** and is credited in a "Built with" section on `/about/` (and in `web/THIRD_PARTY_NOTICES.md`).
4. **Goal: the best-looking site possible.** Pick the best piece for the job; the licence class only decides where the file lives and what the swap plan is.

### Folder convention

```
web/src/components/
  ui/                      shadcn/ui primitives and permissive code (MIT/Apache/ISC)
  vendor/
    reactbits/             LICENSE-NOTES.md + components
    aceternity/            LICENSE-NOTES.md + components
    animate-ui/            ...
    twentyfirst/           21st.dev items (one subfolder per author, licence copied)
    hoverdev/              ...
```

- Each `vendor/<source>/` folder has a `LICENSE` (when the source ships one) or a `LICENSE-NOTES.md` that links the licence page, quotes the one-line restriction, lists each component used and the date it was checked.
- Every file starts with a header comment: source URL, licence, and what we changed.

```tsx
/**
 * Source: https://reactbits.dev/... (Light Rays)
 * Licence: MIT + Commons Clause (see ./LICENSE-NOTES.md)
 * Changes: Tailwind v4 tokens, reduced-motion fallback, TypeScript props.
 */
```

- Permissive code keeps its copyright notice in a `LICENSE.md` next to it and is credited on `/about/`.

### How to remove or swap a vendor

1. Find the source in the inventory (section 4) and read its "where used" column.
2. Replace each import of `@/components/vendor/<source>/...` with the replacement named in the "swap plan" column (a permissive equivalent or our own component).
3. Delete the folder `web/src/components/vendor/<source>/`.
4. Remove the source's row from the inventory (or set its status to "removed") and from the `/about/` credits.
5. Open a PR and let CI (Build & Lint) pass. Screenshots in CI show the visual change.

**Slice PRs must update the inventory table in this file whenever they add or remove vendored code.**

---

## 2. Licence classes

| Class | Sources | Rule |
| --- | --- | --- |
| **Permissive** (MIT, Apache-2.0, ISC, OFL for fonts) | shadcn/ui, Magic UI (free), Motion Primitives, prompt-kit, Kokonut UI (free), Tremor, Streamdown, Evil Charts, Smooth UI, Animata, Uiverse, Spectrum UI, Base UI, class-variance-authority, input-otp, Lucide, Motion, Sonner, cmdk, Recharts, TanStack Query, Radix UI, Fontsource fonts (OFL) | Copy freely. Keep the copyright notice and header comment. Credit on `/about/`. |
| **Restricted-free** | See the table below | Allowed on this website. Lives in `vendor/<source>/`. Listed in section 4. Never published as a kit, template or registry. |
| **Never** | Any paid or Pro tier (Aceternity UI Pro, Magic UI Pro, Cult UI paid agent blocks, Kokonut UI Pro, ReUI Pro, Hover.dev Pro, Skiper UI Premium, React Bits Pro, Tailwind Plus), shadcnblocks, anything AGPL (Origin UI / coss ui) | Do not copy. See the [buy list](./buy-list.md). |

### Restricted-free sources

| Source | Terms (link) | The exact restriction | Public-repo note |
| --- | --- | --- | --- |
| React Bits | [MIT + Commons Clause](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) | Do not sell, sublicense or redistribute the components themselves, alone, in a bundle or as a ported version. | Use as part of a website is allowed. Keep the notice. The waitlist app already does this. |
| Animate UI | [MIT + Commons Clause](https://github.com/imskyleen/animate-ui/blob/main/LICENSE.md) | Do not sell the components or redistribute them as a kit. | Use as part of a website is allowed. |
| Aceternity UI (free tier) | [Custom licence](https://ui.aceternity.com/licence) | Do not redistribute the Item "or its source files, regardless of modifications", and do not resell it as a template or library. | The licence does not say whether a public website repo counts as redistribution. Risk accepted by Harsh; swap plan listed per component. Optional: ask support@aceternity.com for a written OK. |
| 21st.dev items | Each author's licence plus the [site terms](https://21st.dev/terms) | Per component: read the author's licence first. Terms ask for a visible link back and author credit. | Check each item before copying; record author and licence in `LICENSE-NOTES.md`. |
| Hover.dev (free items) | [Custom licence](https://www.hover.dev/license) | Components "may not be redistributed without the written consent of Hover.dev". | Free items only. Re-check the licence page before each copy. |

Licences change. Re-check the licence page when copying a new component from any source, and note the check date in `LICENSE-NOTES.md`.

---

## 3. Paid tiers: why they are not in the repo

Paid kits usually forbid redistributing their source files. A public GitHub repository publishes every file, so paid code in this repo would breach the terms. Magic UI Pro's licence is explicit (no redistribution or sharing; $10,000 liquidated damages per instance are written into it). See [buy-list.md](./buy-list.md) for what each paid kit costs and what it adds.

---

## 4. Inventory

Status values: **planned** (in the catalog, not yet written), **in use** (code exists), **removed**. "Slice" refers to the PR slices in [migration-plan.md](./migration-plan.md). Routes are the planned screens from [component-catalog.md](./component-catalog.md) section 3.

### Restricted-free sources

| Source | Class | Terms | Components | Where used | Swap or remove plan | Status |
| --- | --- | --- | --- | --- | --- | --- |
| React Bits | MIT + Commons Clause | [LICENSE](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) | LightRays, BlurText, DecryptedText, Magnet, SpotlightCard, CountUp, LogoLoop | `waitlist-worker/src/components/reactbits/` (waitlist page) | Replace with Motion Primitives and Magic UI equivalents (Text Effect, Sliding Number, Marquee) or own CSS; delete the folder | in use (waitlist-worker) |
| React Bits | MIT + Commons Clause | as above | Light Rays (`light-rays.tsx`), Blur Text (`blur-text.tsx`), Decrypted Text (`decrypted-text.tsx`), Count Up (`count-up.tsx`), Logo Loop (`logo-loop.tsx`), Star Border (`star-border.tsx`), Magnet (`magnet.tsx`) | `web/src/components/vendor/reactbits/`; `/design/` effects gallery; `/leaderboard/`: Decrypted Text (podium names, first view) and Count Up (stats strip); landing `/` (`web/src/features/marketing/`): Light Rays (hero background), Blur Text (headline), Count Up (live strip, #1 Elo), Logo Loop (model strip), Decrypted Text (demo reveal), Star Border and Magnet (closing CTA) | Magic UI Marquee, Motion Primitives Text Effect and Sliding Number, own CSS beams | in use (/, /design/, /leaderboard/) |
| React Bits | MIT + Commons Clause | as above | Spotlight Card (`spotlight-card.tsx`) | `web/src/components/vendor/reactbits/`; `/design/`; `/leaderboard/` podium; `/models/` model cards; landing `/` (the #1 card of the leaderboard preview) | CSS radial-gradient hover card (own, about 30 lines) | in use (/, /design/, /leaderboard/, /models/) |
| React Bits | MIT + Commons Clause | as above | Decrypted Text, Electric Border (`electric-border.tsx`, WebGL overlay behind WebGLGate), Shiny Text (`shiny-text.tsx`), Text Type (`text-type.tsx`) | `web/src/components/vendor/reactbits/`; `/design/` today; Arena reveal, generating label and composer examples next; landing `/` (demo battle: Electric Border on the chosen pane, Shiny Text "Writing" label) | Motion Primitives Text Effect and Text Shimmer; Magic UI Border Beam | in use (/, /design/) |
| React Bits | MIT + Commons Clause | as above | Status Mark, Lattice Loader, Thought Line, Voice Pill | Arena status, reasoning traces, voice (later) | Kokonut UI AI State Loading; shadcn Reasoning; own | planned |
| React Bits | MIT + Commons Clause | as above | Silk (`silk.tsx`, WebGL behind WebGLGate) | `web/src/components/vendor/reactbits/`; `/design/` today; auth brand panel next | Static gradient poster (`components/motion/silk-poster.tsx`, own) | in use (/design/) |
| React Bits | MIT + Commons Clause | as above | Fuzzy Text (`fuzzy-text.tsx`) | `web/src/components/vendor/reactbits/`; `/design/`; the 404 page (`features/info/components/not-found-page.tsx`) | Plain Playfair heading | in use (/design/) |
| React Bits | MIT + Commons Clause | as above | Faulty Terminal (alternate) | 404 page | Plain Playfair heading | planned (only if chosen) |
| Animate UI | MIT + Commons Clause | [LICENSE](https://github.com/imskyleen/animate-ui/blob/main/LICENSE.md) | Sliding Number, animated primitives (only where better than Motion Primitives) | Leaderboard numbers (alternate) | Motion Primitives Sliding Number | planned |
| Aceternity UI (free) | Custom | [licence](https://ui.aceternity.com/licence) | Placeholders And Vanish Input (`placeholders-and-vanish-input.tsx`) | `web/src/components/vendor/aceternity/`; `/design/`; landing `/` (hero composer, `size="lg"` added) | Own input with a rotating placeholder | in use (/design/, /) |
| Aceternity UI (free) | Custom | as above | Resizable Navbar (behaviour) | Marketing header | Own header with scroll state (shadcn + Motion) | planned |
| Aceternity UI (free) | Custom | as above | Bento Grid (`bento-grid.tsx`), Glowing Effect (`glowing-effect.tsx`) | `web/src/components/vendor/aceternity/`; `/design/`; landing `/` ("Why blind battles" features) | CSS grid plus React Bits Spotlight Card or own glow | in use (/design/, /) |
| Aceternity UI (free) | Custom | as above | Timeline (`timeline.tsx`) | `web/src/components/vendor/aceternity/`; `/design/`; landing `/` (the four steps); `/about/` and how it works next | Own scroll-linked list using Motion `useScroll` | in use (/design/, /) |
| Aceternity UI (free) | Custom | as above | Sticky Scroll Reveal | How it works | Own scroll-linked list using Motion `useScroll` | planned |
| Aceternity UI (free) | Custom | as above | Background Beams With Collision, Spotlight New, Text Generate Effect, Encrypted Text, Moving Border | Hero alternates, reveal alternates | React Bits Light Rays; Motion Primitives Text Effect; Magic UI Border Beam | planned (only if chosen over the primary) |
| 21st.dev | Per author | [terms](https://21st.dev/terms) | Community AI inputs and hero sections, checked one by one | Landing and Arena composer (only if clearly better) | Prompt-kit Prompt Input; own hero | planned (none chosen yet) |
| Hover.dev (free) | Custom | [licence](https://www.hover.dev/license) | Encrypt Button, nav ideas | Landing CTA (optional) | Own button on shadcn Button | planned (none chosen yet) |

### Permissive sources (credited on /about/)

| Source | Class | Terms | Components | Where used | Swap or remove plan | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Magic UI | MIT | [LICENSE](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md) | BorderBeam | `waitlist-worker/src/components/magicui/` | Own CSS conic-gradient border | in use (waitlist-worker) |
| Magic UI | MIT | as above | Border Beam (`border-beam.tsx`), Shine Border (`shine-border.tsx`), Animated Beam (`animated-beam.tsx`), Marquee (`marquee.tsx`), Blur Fade (`blur-fade.tsx`), Number Ticker (`number-ticker.tsx`) | `web/src/components/vendor/magicui/`; `/design/`; `/how-it-works/` (Animated Beam battle diagram); `/leaderboard/`: Shine Border on the #1 podium card, Number Ticker for battles and Elo; Arena generating state, share page next; landing `/` (Animated Beam in "how a battle works", with `play` and `repeat` added; Border Beam on the demo panes while they fill; Shine Border on the #1 card) | Motion equivalents, own CSS | in use (/, /design/, /leaderboard/) |
| Magic UI | MIT | as above | Code Comparison | Diff view (F-4) | Own | planned |
| shadcn/ui (Base UI flavour, `base-vega` registry) | MIT | [LICENSE](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) | Accordion (also `/faq/`), Avatar, Badge, Button, Card, Checkbox, Command, Dialog, Drawer, Dropdown Menu, Field, Input, Input OTP, Kbd, Label, Popover, Radio Group, Scroll Area, Select, Separator, Sheet, Skeleton, Sonner, Switch, Tabs, Textarea, Toggle, Toggle Group, Tooltip (adapted to our tokens; `web/src/components/ui/LICENSE.md`) | `web/src/components/ui/`, the site shell, `/design/` | Base UI directly (the primitives already sit on it) | in use (slice S2) |
| shadcn/ui | MIT | as above | Chart (`chart.tsx`: the Recharts frame and tooltip, token colours as CSS variables instead of an injected style element) | `web/src/components/ui/chart.tsx`; the win-rate chart in the model details sheet on `/leaderboard/` and `/models/` (loaded lazily) | Recharts directly | in use (slice S7) |
| shadcn/ui | MIT | as above | Sidebar, Data Table | Arena sidebar (the leaderboard table is our own on a plain `<table>`) | Base UI directly | planned |
| Motion Primitives | MIT | [LICENCE](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md) | Text Shimmer (`text-shimmer.tsx`), Animated Background (`animated-background.tsx`), Sliding Number (`sliding-number.tsx`), Border Trail (`border-trail.tsx`) | `web/src/components/vendor/motion-primitives/`; `/design/`; `/leaderboard/`: Sliding Number for the ranks in the table; Arena and header next | Own with Motion | in use (/design/, /leaderboard/) |
| Motion Primitives | MIT | as above | Text Effect, Morphing Dialog | Arena reveal (alternate), Models | Own with Motion | planned |
| prompt-kit | MIT | [LICENCE](https://github.com/ibelick/prompt-kit/blob/main/LICENCE.md) | Prompt Input (`prompt-input.tsx`), Prompt Suggestion (`prompt-suggestion.tsx`), Chat Container (`chat-container.tsx`, on the `use-stick-to-bottom` npm package, MIT), Scroll Button (`scroll-button.tsx`) | `web/src/components/vendor/prompt-kit/`; the arena at `/` (`web/src/features/arena/`): the composer, the prompt starters, the thread view | Own textarea and scroll container with shadcn | in use (arena, slice S8) |
| prompt-kit | MIT | as above | Thinking Bar, Feedback Bar | Arena battle flow | Own with shadcn | planned (S9) |
| Kokonut UI (free) | MIT | [LICENSE](https://github.com/kokonut-labs/kokonutui/blob/main/LICENSE) | AI Text Loading, AI State Loading, AI Diff Review (patterns) | Arena | Own | planned |
| Tremor Raw | Apache-2.0 | [LICENSE](https://github.com/tremorlabs/tremor-npm/blob/main/LICENSE) | Bar List, Tracker, Spark Chart | Leaderboard | shadcn Chart | planned |
| Streamdown | Apache-2.0 | [LICENSE](https://github.com/vercel/streamdown/blob/main/LICENSE) | Streaming Markdown (npm dependency, not vendored; hardened: no raw HTML, https-only links, no images) | Answer panes (`web/src/features/arena/components/markdown.tsx`) | react-markdown | in use (arena, slice S8) |

Base UI, class-variance-authority, Lucide, Motion, Sonner, cmdk, input-otp, Recharts, TanStack Query and Fontsource fonts are npm dependencies (not vendored); they are credited on `/about/` and in `web/THIRD_PARTY_NOTICES.md`.

---

## 5. Before going private or before buying

Checklist for Harsh and for the slice PRs.

1. Re-read the inventory in section 4. Every "planned" row is cheap to drop; every "in use" row has a swap plan.
2. For each restricted-free source you want to keep after going private: read the licence again (the public-repo question disappears for a private repo, but the "no redistribution as a kit" part stays).
3. Optionally email support@aceternity.com (and Hover.dev) for a written OK for a public portfolio repository.
4. Decide on purchases with [buy-list.md](./buy-list.md). Purchased code needs either a private repo or a private package or submodule kept out of this repo.
5. If the repo goes private: GitHub Actions minutes are limited on private repos (the free plan has a monthly quota), so check CI cost first (builds, screenshots) and move heavy jobs or add a self-hosted runner if needed.
6. Make sure `/about/` "Built with" and `web/THIRD_PARTY_NOTICES.md` match the inventory.
7. Confirm no Pro or paywalled file slipped in: search for source URLs in file headers (`pro.`, `/pro/`, `premium`).
