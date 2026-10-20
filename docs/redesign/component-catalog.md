# DualMind Arena redesign: component catalog

Checked on 2026-10-20. This catalog lists the component sources for an AI website that were considered for the Arena redesign (40 sources): their licences, whether their code may be copied into this **public** repository, what they offer for an AI site, and what we pick for each screen.

Companion documents: [design-direction.md](./design-direction.md) (look, rules and the screen-by-screen direction), [migration-plan.md](./migration-plan.md), [screen-inventory.md](./screen-inventory.md), [new-features.md](./new-features.md).

How it was checked: licence files and terms pages were fetched from each project (links in section 5); repository data (stars, last push) came from GitHub. Anything that could not be confirmed on a fetched page is marked "(unverified)" in section 5. Licences change, so re-check a source's licence before copying a new component from it.

---

## 1. Summary

Verdicts: **Use** (a main source), **Selective** (a few named pieces), **Reference** (ideas and patterns only, no copied code), **Avoid**.

### Effects and animated components

| Source | Licence | Copy into this public repo? | Verdict | Best for DualMind |
| --- | --- | --- | --- | --- |
| [React Bits](https://reactbits.dev) | MIT + Commons Clause | Yes, as part of the site; keep the notice; never as a kit | **Use** | Hero backgrounds, text effects, Count Up, Spotlight Card, Star/Electric Border, AI micro pieces (Prompt Bar, Thought Line, Status Mark, Lattice Loader) |
| [Magic UI](https://magicui.design) | MIT | Yes, keep the notice | **Use** | Border Beam, Shine Border, Animated Beam, Number Ticker, Marquee, Blur Fade, Terminal, Code Comparison |
| [Aceternity UI](https://ui.aceternity.com) | Custom licence (free and Pro) | Free components: yes with conditions (see section 2); Pro: no | **Selective** | Placeholders And Vanish Input, Background Beams With Collision, Spotlight New, Glowing Effect, Bento Grid, Timeline, Encrypted Text, Floating/Resizable Navbar |
| [Motion Primitives](https://motion-primitives.com) | MIT | Yes, keep the notice | **Use** | Text Shimmer, Text Effect, Animated Background (segmented control), Sliding/Animated Number, Border Trail, Morphing Dialog |
| [Animate UI](https://animate-ui.com) | MIT + Commons Clause | Yes as part of the site, modified; never as a kit | Selective | Sliding Number, animated primitives (only where better than Motion Primitives) |
| [Smooth UI](https://smoothui.dev) | MIT | Yes | Selective | SiriOrb (voice/"thinking" orb), Typewriter Text |
| [Animata](https://animata.design) | MIT | Yes (needs Tailwind v4 porting) | Selective | Text effects, Animated Beam, Moving Gradient backgrounds |
| [Uiverse](https://uiverse.io) | MIT | Yes | Selective | Loader and button ideas (CSS snippets, port and add reduced motion) |
| [Hover.dev](https://www.hover.dev) | Custom licence | Free items only, not as standalone redistribution | Reference | Encrypt Button, nav ideas |
| [Skiper UI](https://skiper-ui.com) | Custom, mostly paid | No (paid, terms page unreachable) | Avoid | |
| [Spectrum UI](https://ui.spectrumhq.in) | Apache-2.0 | Yes | Reference | Number Ticker, Skeleton Reveal |

### shadcn ecosystem and component systems

| Source | Licence | Copy into this public repo? | Verdict | Best for DualMind |
| --- | --- | --- | --- | --- |
| [shadcn/ui](https://ui.shadcn.com) (incl. Oct 2026 AI patterns) | MIT | Yes | **Use (base)** | All primitives; AI patterns: Prompt Input, Message, Reasoning, Model Selector, Code Block; Chart, Data Table, Command, Input OTP, Sidebar, Resizable |
| [Kokonut UI](https://kokonutui.com) | MIT (Pro templates paid) | Free components: yes | **Use** | AI Input Selector, AI Model Selector, AI State Loading, AI Text Loading, AI Context Meter, AI Diff Review |
| [Cult UI](https://cult-ui.com) | MIT (paid agent blocks) | Free components: yes; paid blocks: no | Selective | Dynamic Island, Texture Button, terminal-style text |
| [21st.dev](https://21st.dev) | Per component (author's licence) + site terms | Only after checking each component's licence; terms ask for a visible link back and author credit | Selective | Community AI inputs and hero sections, each checked one by one |
| [Tremor](https://tremor.so) (Raw / Blocks) | Apache-2.0 / MIT | Yes | Selective | Bar List, Tracker, Spark Chart, Category Bar for the leaderboard |
| shadcn charts + [Evil Charts](https://evilcharts.com) | MIT | Yes | **Use** | Elo and win-rate charts on Recharts |
| [ReUI](https://reui.io) | MIT (free) / Pro paid | Free items only | Selective | Data Grid and Table variants |
| [Launch UI](https://www.launchuicomponents.com) | MIT | Yes (strip Next.js imports) | Selective | Landing section structure (stats, FAQ, footer) |
| [Eldora UI](https://www.eldoraui.site) | MIT | Yes | Reference | Few AI-specific pieces |
| [Kibo UI](https://www.kibo-ui.com) | MIT | Yes | Reference | Superseded by shadcn AI patterns; Ticker, Relative Time |
| [HeroUI](https://www.heroui.com) | Apache-2.0 | Yes | Reference | A second full design system would clash with shadcn |
| [HextaUI](https://hextaui.com) | MIT (Pro paid) | Free items only | Reference | |
| [Origin UI / coss ui](https://coss.com/ui) | AGPL-3.0 (repo) | **No** (AGPL would spread to the repo) | Avoid | |
| [shadcnblocks](https://www.shadcnblocks.com) | Paid licence | **No** (forbids publishing in a public repo) | Avoid | |
| [SyntaxUI](https://syntaxui.com) | MIT | Yes | Avoid | Slow maintenance, nothing better than the picks above |
| [Preline](https://preline.co) / HyperUI | MIT + "Fair Use" / MIT | Preline with conditions; HyperUI yes | Avoid / Reference | Vanilla JS model; HyperUI as plain Tailwind reference |

### AI chat kits

| Source | Licence | Copy into this public repo? | Verdict | Fit for the Arena |
| --- | --- | --- | --- | --- |
| [prompt-kit](https://www.prompt-kit.com) | MIT | Yes | **Use** | Prompt Input, Prompt Suggestion, Message, Chat Container (stick to bottom), Scroll Button, Loader, Thinking Bar, Text Shimmer, Reasoning, Feedback Bar, Code Block; no AI SDK needed |
| [Streamdown](https://streamdown.ai) | Apache-2.0 | npm dependency | **Use** | Streaming-safe Markdown with Shiki code and KaTeX math, hardened |
| shadcn AI patterns (successor of Vercel AI Elements) | MIT | Yes | **Use (reference + selective copy)** | Model Selector, Reasoning, Message layout |
| [Vercel AI Elements](https://elements.ai-sdk.dev) | Apache-2.0 | Yes, but deprecated end of Nov 2026 | Reference | Assumes Next.js and the AI SDK |
| [assistant-ui](https://www.assistant-ui.com) | MIT | Yes | Reference | One runtime per thread; no compare layout |
| Vercel AI SDK UI (`useChat`) | Apache-2.0 | npm | Avoid for now | Would need a custom transport for our SSE format |
| [LlamaIndex chat-ui](https://github.com/run-llama/chat-ui) | MIT | Yes | Reference | RAG-oriented |
| [shadcn-chatbot-kit](https://github.com/Blazity/shadcn-chatbot-kit) | MIT | Yes | Reference | Stale since Feb 2026 |
| [Chatscope](https://chatscope.io) | MIT | Yes | Avoid | Messenger-style, SCSS theme, inactive |
| [CopilotKit](https://www.copilotkit.ai) | MIT core | Yes | Avoid | Agent framework, not a UI kit |
| [NLUX](https://nlux.dev) | MPL-2.0 + extra restrictions | Unclear | Avoid | Non-standard licence |
| [Deep Chat](https://deepchat.dev) | MIT | Yes | Avoid | Web component with its own styling |
| [OpenAI ChatKit](https://github.com/openai/chatkit-js) | Apache-2.0 | Yes | Avoid | Relies on hosted scripts and sessions |

No kit provides a two-pane battle layout, a blind vote bar or a reveal. We build those ourselves on shadcn primitives (see design-direction.md section 10).

---

## 2. Licence rules for this repository

The repository is public, so every copied component is published. Rules:

1. **Permissive (MIT, Apache-2.0, ISC):** copy freely. Keep the copyright and licence text: one `LICENSE.md` per vendor folder (`web/app/components/<vendor>/LICENSE.md`) and a header comment in each file naming the source URL and what we changed.
2. **MIT + Commons Clause (React Bits, Animate UI):** allowed as part of this website. Keep the notice, never publish the components as a kit, registry or template, never sell them. This is the setup the waitlist app already uses.
3. **Aceternity UI (custom licence):** Harsh asked for it to be considered, so it is in, with care:
   - The licence page ([ui.aceternity.com/licence](https://ui.aceternity.com/licence)) allows use in unlimited personal and commercial projects and needs no attribution. It forbids redistributing "the Item ... or its source files, regardless of modifications" and reselling components as a template or library. The FAQ ([pricing](https://ui.aceternity.com/pricing)) says the only restriction on free components is not reselling or redistributing them "as a competing template or component library".
   - What is unclear: the licence never says whether a public GitHub repo of a website counts as redistributing source files.
   - Our pattern: **free components only**, in `web/app/components/aceternity/` with a `LICENSE-NOTES.md` that links the licence and lists each component, adapted to our tokens, never exported as a kit, no Pro blocks. Only a handful of pieces (listed in section 3).
   - Recommended (Harsh, optional): a short email to support@aceternity.com asking for a written OK for a public portfolio repository. Until then we keep the Aceternity count small so swapping is cheap.
4. **21st.dev:** each component has its author's licence; check it before copying. The site's terms ask for a visible link back and author credit, which the credits section (rule 6) covers.
5. **Never copy:** anything Pro or paid (Aceternity Pro, Magic UI Pro, Cult UI agent blocks, Kokonut Pro, ReUI Pro, Hover.dev Pro, Skiper UI), shadcnblocks (licence forbids public repos), Origin UI / coss ui (AGPL-3.0).
6. **Credits:** a "Built with" section on `/about/` (and `web/THIRD_PARTY_NOTICES.md`) lists every source with a link. It satisfies the credit rules above and shows reviewers the craft behind the site.

---

## 3. Picks per screen

Primary pick first; alternates in brackets. "RB" React Bits, "MU" Magic UI, "AC" Aceternity UI, "MP" Motion Primitives, "PK" prompt-kit, "KK" Kokonut UI, "TR" Tremor, "sh" shadcn/ui.

| Screen | Area | Pick |
| --- | --- | --- |
| **Global shell** | Header | Own header on sh; on marketing pages AC **Resizable Navbar** behaviour (shrinks into a pill on scroll) |
| | Command palette, toasts, dialogs | sh **Command** (cmdk), **Sonner**, sh **Dialog/Sheet**, MP **Morphing Dialog** for the model detail card |
| | Theme toggle, mode switch indicator | MP **Animated Background** (sliding highlight) |
| **Landing** (`/` signed out) | Hero background | RB **Light Rays** (cyan and violet beams; brand continuity with the waitlist) [AC **Background Beams With Collision**, RB **Silk**] |
| | Headline | RB **Blur Text**, one Playfair phrase [AC **Text Generate Effect**] |
| | Hero prompt box | AC **Placeholders And Vanish Input** (rotating example prompts, the text "vanishes" into the battle on submit) |
| | "How a battle works" | MU **Animated Beam** from the prompt to Mind A and Mind B, answers revealed with RB **Decrypted Text** |
| | Live numbers and model strip | MP **Sliding Number** / RB **Count Up**; RB **Logo Loop** [MU **Marquee**] |
| | Features | AC **Bento Grid** with AC **Glowing Effect** on hover [RB **Spotlight Card**] |
| | How it works | AC **Timeline** (scroll-linked) [sh steps] |
| | Closing CTA | RB **Star Border** + RB **Magnet** [MU **Shimmer Button**] |
| **Arena** (`/` signed in) | Composer | PK **Prompt Input** + PK **Prompt Suggestion** chips; model picker on sh Command following the KK **AI Model Selector** / sh **Model Selector** patterns; voice later with RB **Voice Pill** |
| | Mode switch | sh Tabs with MP **Animated Background** |
| | Answer panes | PK **Chat Container** (stick to bottom) + PK **Scroll Button**; **Streamdown** rendering with sh/PK **Code Block** styling |
| | Generating state | MP **Text Shimmer** ("Generating") or PK **Thinking Bar**; MU **Border Beam** around the active pane [MP **Border Trail**]; KK **AI Text Loading** for long waits |
| | Reasoning models (later) | sh **Reasoning** / RB **Thought Line** for thinking traces |
| | Vote bar | Own component on sh Button (big targets, shortcuts 1-4) |
| | Reveal | RB **Decrypted Text** for names [AC **Encrypted Text**]; one-shot RB **Electric Border** on the chosen pane [AC **Moving Border**]; MP **Animated Number** for the Elo change (B-2) |
| | Vote reasons (F-5) | PK **Feedback Bar** pattern |
| | Diff view (F-4) | KK **AI Diff Review** pattern + MU **Code Comparison** styling |
| | Sidebar | sh **Sidebar** block, sh Dropdown for rename/delete |
| | Status and errors | RB **Status Mark**, RB **Lattice Loader** [KK **AI State Loading**] |
| **Leaderboard** | Podium (top 3) | RB **Spotlight Card** + MU **Shine Border** on #1 |
| | Table | sh **Data Table** [ReUI free Data Grid]; TR **Bar List** for Elo bars, TR **Tracker** for recent wins and losses |
| | Numbers | MP **Sliding Number** for rank and Elo |
| | Charts | sh **Chart** (Recharts) with Evil Charts polish; TR **Spark Chart** for trends (B-3) |
| **Models** | Cards | RB **Spotlight Card** [AC **Card Spotlight**] |
| | Detail | MP **Morphing Dialog** (desktop), Vaul drawer (phones) |
| **Auth** | Brand panel | RB **Silk** (static poster on phones) |
| | Form | sh Form, sh **Input OTP**, sh Tabs; KK **AI Input** styling cues not needed |
| **Share** (`/share/<id>`) | Transcript | Same panes as the arena (read-only), MU **Blur Fade** entrance |
| **About, how it works, FAQ** | Sections | MU **Blur Fade**; AC **Timeline** (about); AC **Sticky Scroll Reveal** (how it works) [MU Animated Beam diagram]; sh **Accordion** (FAQ); "Built with" credits grid on `/about/` |
| **Legal** | Prose | No effects, sh typography only |
| **404** | Hero | RB **Fuzzy Text** "404" [RB **Faulty Terminal** background] |
| **Settings** | Forms | sh only |

Budget per screen: at most one WebGL background (landing hero, auth brand panel), and every effect follows the motion rules in design-direction.md section 6.

---

## 4. What we build ourselves

- Battle layout (two synchronised panes with A/B headers, phone swipe tabs), vote bar, reveal card, `useBattle` state machine.
- Theme and token plumbing, reduced-motion wrappers for all vendored effects, the WebGL gate with poster fallback.
- Leaderboard table logic (sorting, provisional flags) on top of the chosen table component.

---

## 5. Source details

Entries below are the research notes for each source, with the pages that were fetched.

### 5.1 Effects and animated components

#### Aceternity UI

| | |
| --- | --- |
| URL | https://ui.aceternity.com (org: https://github.com/aceternity has only saasternity + nextjs-boilerplate, no component repo) |
| Licence / terms | Custom "Aceternity License" (page titled "Licence \| Aceternity UI Pro", applies to "each item available for purchase or download"). Key: "You cannot re-distribute the Item as a stock image or its source files, regardless of modifications." Also "End products may be sold, licensed, sub-licensed, or freely distributed." Fetched: https://ui.aceternity.com/licence, https://ui.aceternity.com/pricing |
| Copy into a PUBLIC repo? | **Unclear (leaning Yes with conditions).** Not an OSS licence; no attribution required (none stated). Using free components in a public portfolio website is the intended use ("personal and commercial projects"; FAQ: "only restriction is that you cannot resell or redistribute the components themselves as a competing template or component library"). Ambiguity: the licence bans redistributing "source files", and a public GitHub repo does publish the source. The page never addresses public repos or the free tier separately. Safe pattern: keep components in one folder (e.g. src/components/aceternity/) with a LICENSE-NOTES.md linking the licence page, modify/compose them, never publish them as a kit/template/registry, never sell the repo, keep Pro blocks out of the repo entirely. For certainty, email support@aceternity.com. |
| Free vs paid | Free: 114 components listed on /components (no signup, "Free forever", MCP access). Paid All-Access: $169 1-yr / $199 lifetime / $1,590 team(10): 200+ blocks, 15+ templates, 3 pages. Pro = block collections (Hero Sections, Backgrounds, Shaders, Text Animations, Bento Grids, Cards, Navbars...). |
| Install | `npx shadcn@latest add @aceternity/<component-name>` (registry in components.json) or copy-paste |
| Stack fit | React/Next.js, Tailwind, Motion (formerly Framer Motion), TypeScript types; works in Vite (per FAQ). Tailwind v4 / React 19 per-component (unverified). Some use three/ogl/canvas. |
| Maintenance | Actively updated (new free items e.g. Liquid Glass, Image Generation Loader, Notch, Encrypted Text); no public repo to measure stars |

**AI-site components** (all verified on https://ui.aceternity.com/components as FREE unless noted):
- Hero backgrounds: Aurora Background, Background Beams, Background Beams With Collision, Background Lines, Background Ripple Effect, Background Gradient Animation, Vortex Background, Wavy Background, Lamp Section Header, Spotlight, Spotlight New, Sparkles, Shooting Stars and Stars Background, Meteor Effect, Google Gemini Effect, Noise Background, Dotted Glow Background, Cloud Shader, Dither Shader, Grid and Dot Backgrounds, Hero Highlight
- Prompt box / chat input: Placeholders And Vanish Input, Gooey Input
- Chat bubbles / messages: none
- Streaming text / typewriter / text reveal: Typewriter Effect, Text Generate Effect, Flip Words, Container Text Flip, Layout Text Flip, Encrypted Text, Colourful Text, Text Hover Effect, Text Reveal Card, Canvas Text, Squiggly Text, Pointer Highlight
- Thinking / loading indicators: Multi Step Loader, Loaders, Image Generation Loader
- Compare / battle / split layouts: Compare (slider), Layout Grid
- Leaderboard / tables / numbers / charts: none (3D Globe, World Map, GitHub Globe only)
- Code blocks: Code Block, Terminal
- Cards / bento / feature sections: Bento Grid, Card Spotlight, Glowing Effect, Moving Border, Hover Border Gradient, Evervault Card, Glare Card, Wobble Card, 3D Card Effect, Expandable Cards, Focus Cards, Infinite Moving Cards, Animated Testimonials, Timeline, Tracing Beam, Sticky Scroll Reveal
- Navigation / command palette / misc: Floating Dock, Floating Navbar, Resizable Navbar, Animated Tooltip, Animated Tabs, Container Scroll Animation, Macbook Scroll (Fey.com Macbook Scroll), Stateful Button, File Upload, Lens

**Accessibility and performance notes:** reduced-motion handling not documented, per-component (unverified); several heavy canvas/WebGL items (Vortex, Sparkles, Cloud/Dither Shader, Globes); Motion dependency.

**Verdict for DualMind:** Use selectively. Best-looking free hero/text effects, but licence is custom and "redistribute source files" is fuzzy for a public repo; use a few, modified, in an isolated folder with a licence note, and get written OK from support if more than a handful.

#### Magic UI

| | |
| --- | --- |
| URL | https://magicui.design (repo: https://github.com/magicuidesign/magicui) |
| Licence / terms | MIT, "Copyright (c) Magic UI", standard permission grant. Fetched raw LICENSE.md. Pro terms page not found (unverified). |
| Copy into a PUBLIC repo? | Yes. MIT: keep the copyright and permission notice with copied code (a header comment or THIRD_PARTY note is enough). Public website repo is fine. |
| Free vs paid | Free: 77 components on /docs/components. Magic UI Pro (templates/blocks) is paid; terms unverified. |
| Install | shadcn registry: `npx shadcn@latest add @magicui/<name>` (also CLI/copy-paste) |
| Stack fit | React, Tailwind, TypeScript, motion; Tailwind v4/React 19 supported (unverified detail) |
| Maintenance | about 22.8k stars; last push 2026-10-17 |

**AI-site components** (verified on https://magicui.design/docs/components):
- Hero backgrounds: Retro Grid, Dot Pattern, Flickering Grid, Grid Pattern, Animated Grid Pattern, Interactive Grid Pattern, Particles, Floating 3D Particles, Light Rays, Warp Background, Meteors, Ripple, Noise Texture, Hexagon Pattern, Striped Pattern, Backlight
- Prompt box / chat input: none
- Chat bubbles / messages: Animated List (notification-style stream), Tweet Card
- Streaming text / typewriter / text reveal: Typing Animation, Text Animate, Text Reveal, Aurora Text, Animated Shiny Text, Animated Gradient Text, Hyper Text, Morphing Text, Word Rotate, Sparkles Text, Line Shadow Text, Text Highlighter, Dia Text Reveal, Blur Fade
- Thinking / loading indicators: Animated Circular Progress Bar, Scroll Progress
- Compare / battle / split layouts: Code Comparison, Animated Beam (connect two nodes, good for A vs B)
- Leaderboard / tables / numbers / charts: Number Ticker, Animated Circular Progress Bar, Marquee
- Code blocks: Terminal, Code Comparison
- Cards / bento / feature sections: Bento Grid, Magic Card, Neon Gradient Card, Border Beam, Shine Border, Glare Hover, Orbiting Circles, Globe, Icon Cloud
- Navigation / command palette / misc: Dock, Hero Video Dialog, Shimmer/Rainbow/Pulsating/Ripple/Shiny/Interactive Hover Button, Confetti, File Tree, Smooth Cursor, Progressive Blur. (Script Copy Btn not on the list now; unverified.)

**Accessibility and performance notes:** reduced-motion varies per component (unverified); Particles/Globe/Warp are canvas/WebGL-ish; mostly light CSS + motion.

**Verdict for DualMind:** Use. MIT, current, large set; best picks: Border Beam, Shine Border, Number Ticker, Animated Beam, Aurora Text, Typing Animation, Terminal, Code Comparison, Marquee.

#### Motion Primitives

| | |
| --- | --- |
| URL | https://motion-primitives.com (repo: https://github.com/ibelick/motion-primitives) |
| Licence / terms | MIT per GitHub page (file is `LICENCE.md`, not LICENSE.md; the raw LICENSE URL 404s). Docs page says "open source" without naming a licence. |
| Copy into a PUBLIC repo? | Yes (MIT, keep notice). Pro ("Advanced" at pro.motion-primitives.com) terms unverified; keep Pro code out of the repo. |
| Free vs paid | Core library free; "Advanced" pro site exists (pricing unverified) |
| Install | shadcn registry / CLI per /docs/installation (exact command unverified), or copy-paste |
| Stack fit | React, Tailwind, TypeScript, motion |
| Maintenance | about 6.8k stars; last push 2026-09-28 |

**AI-site components** (verified on https://motion-primitives.com/docs):
- Hero backgrounds: Animated Background (hover/active highlight, not a hero bg)
- Prompt box / chat input: none
- Chat bubbles / messages: Animated Group (staggered list entrance)
- Streaming text / typewriter / text reveal: Text Effect (per-word/char blur/fade), Text Shimmer, Text Shimmer Wave, Text Morph, Text Scramble, Text Loop, Text Roll
- Thinking / loading indicators: Text Shimmer (classic "Thinking..." shimmer)
- Compare / battle / split layouts: Image Comparison, Transition Panel
- Leaderboard / tables / numbers / charts: Animated Number, Sliding Number (rank/Elo changes)
- Code blocks: none
- Cards / bento / feature sections: Border Trail, Glow Effect, Spotlight, Tilt, Magnetic
- Navigation / command palette / misc: Morphing Dialog, Morphing Popover, Disclosure, Accordion, Dock, Infinite Slider, Progressive Blur, Toolbar Dynamic/Expandable, Carousel, Cursor, In View, Scroll Progress, Spinning Text

**Accessibility and performance notes:** small, motion-only, no WebGL; reduced-motion handling unverified.

**Verdict for DualMind:** Use. Small MIT primitives; Text Shimmer, Animated/Sliding Number, Text Effect, Border Trail, Morphing Dialog are the picks.

#### Skiper UI

| | |
| --- | --- |
| URL | https://skiper-ui.com (repo: none found) |
| Licence / terms | Not stated on homepage; links to Terms of Service (https://skiper-ui.com/terms returned 404, so unverified). |
| Copy into a PUBLIC repo? | Unclear. Most components are "Premium"; publishing paid source in a public repo almost certainly violates it. Free ones: terms unverified. |
| Free vs paid | Premium $129 one-time; Exclusive $549 (templates, Figma, "Coming Soon"). Only a few free (e.g. Dynamic Island). 106+ components advertised. |
| Install | `npx shadcn add @skiper-ui/skiper40` (single file per component) |
| Stack fit | Next.js, Tailwind, Motion.dev; single-file |
| Maintenance | unverified |

**AI-site components:** showcase-style interactions (Image reveal, Hover members, Vercel Tooltip, Aave token swap, Image cursor trail, Dynamic Island, sign-in animations); no AI-chat-specific items seen. Other slots: none verified.

**Accessibility and performance notes:** unverified.

**Verdict for DualMind:** Avoid. Mostly paid, terms unreachable; at most take ideas from free items after reading the terms.

#### Hover.dev

| | |
| --- | --- |
| URL | https://www.hover.dev |
| Licence / terms | Custom licence, https://www.hover.dev/license. Allowed: "Use on unlimited websites/projects", "No attribution is required", "Use of components for open source projects". Forbidden: "The sale or redistribution of Hover Dev, LLC components as standalone products". Footer: "may not be redistributed without the written consent of Hover.dev". |
| Copy into a PUBLIC repo? | Yes with conditions, for FREE-marked components only: open-source use is explicitly permitted, but not as standalone redistribution. Pro components: "require the purchase of Hover Pro"; keep them out of a public repo. |
| Free vs paid | Components marked free need no purchase; others need Hover Pro (price not shown on pages fetched, unverified) |
| Install | copy-paste (React + Tailwind) |
| Stack fit | React, Tailwind (version unspecified), Framer Motion/Motion or vanilla JS |
| Maintenance | unverified |

**AI-site components:** Encrypt Button (free), Wet Paint Button, Navbars and Menus, Testimonial Sections, Hero Sections, Carousels, Feature Sections, Dropdowns, Toggles, 3D Sections, Kanban Boards. No AI-chat items seen; other slots none verified.

**Accessibility and performance notes:** unverified.

**Verdict for DualMind:** Reference only. Free tier is small, mostly buttons/nav; the licence text is workable but ambiguous for a public repo.

#### React Bits

| | |
| --- | --- |
| URL | https://reactbits.dev (repo: https://github.com/DavidHDev/react-bits) |
| Licence / terms | MIT + Commons Clause. LICENSE.md: right to "use, copy, modify, merge, publish, and distribute the Software as part of an application, website, or product", with notice kept in copies. |
| Copy into a PUBLIC repo? | Yes with conditions: keep the copyright/permission notice; do not sell the components themselves or redistribute them as a standalone kit (Commons Clause). A public portfolio website repo is within "as part of an application, website". |
| Free vs paid | All free (about 216 items: Text Animations 33, Animations 38, Components 48, Micro 34, Backgrounds 63) |
| Install | `npx shadcn@latest add @react-bits/<Name>-TS-TW` (variants JS/TS x CSS/Tailwind); jsrepo also; exact registry names unverified |
| Stack fit | React, TS + Tailwind variants; deps vary: gsap, motion, three, ogl, postprocessing |
| Maintenance | about 49.8k stars; last push 2026-10-19 |

**AI-site components** (verified on https://reactbits.dev/get-started/index):
- Hero backgrounds: Aurora, Soft Aurora, Beams, Light Rays, Light Pillar, Prism, Dark Veil, Silk, Plasma, Galaxy, Orb, Particles, Pixel Snow, Faulty Terminal, Grid Scan, Dither, Liquid Ether, Lightning, Hyperspeed, Gradient Blinds, Iridescence, Ripple Grid, Dot Grid
- Prompt box / chat input: Prompt Bar (Micro; chat composer with @ sources, / commands, model picker, dictation, attachments), Curved Input
- Chat bubbles / messages: none
- Streaming text / typewriter / text reveal: Text Type, Decrypted Text, Scrambled Text, Shiny Text, Blur Text, Split Text, Gradient Text, Scroll Reveal, True Focus, Count Up, Text Cursor
- Thinking / loading indicators: Thought Line (reasoning trace header), Call Chip (tool-call chip with timer), Status Mark (agent task status glyph), Lattice Loader (agent status row with stopwatch), Voice Pill (mic equalizer), Refine Frame (image generation stages)
- Compare / battle / split layouts: none dedicated (Card Swap, Stack)
- Leaderboard / tables / numbers / charts: Count Up, Counter, Slosh Gauge, Comet Dial
- Code blocks: Code Slots (purpose unverified)
- Cards / bento / feature sections: Magic Bento, Spotlight Card, Border Glow, Electric Border, Star Border, Glare Hover, Chroma Grid, Reflective Card
- Navigation / command palette / misc: Dock, Pill Nav, Card Nav, Bubble Menu, Staggered Menu, Stepper

**Accessibility and performance notes:** many backgrounds are WebGL (ogl/three), heavy on mobile; reduced-motion support inconsistent (unverified); lazy-load and gate by `prefers-reduced-motion`.

**Verdict for DualMind:** Use. Largest free set and the only one with AI-agent micro components (Prompt Bar, Thought Line, Call Chip, Status Mark); pick one cheap background and keep GL to the hero.

### 5.2 shadcn ecosystem

#### 1. shadcn/ui

| | |
| --- | --- |
| URL | https://ui.shadcn.com (repo: https://github.com/shadcn-ui/ui) |
| Licence / terms | MIT. "Permission is hereby granted, free of charge, to any person obtaining a copy..." Copyright notice must be kept. Fetched: raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md |
| Copy into a PUBLIC repo? | Yes. MIT allows publishing copied source in a public website repo; keep the licence notice (a NOTICE/THIRD_PARTY line is enough). |
| Free vs paid | All free. Community registries are third-party (review code on install, per docs). |
| Install | `npx shadcn@latest add <name>`; Base UI is the default flavour since July 2026 changelog. |
| Stack fit | Native: React 19, Tailwind v4, TS. Base UI or Radix. |
| Maintenance | Very active; changelog entries monthly through Oct 2026 (fetched ui.shadcn.com/docs/changelog). |

**AI-site components** (all from https://ui.shadcn.com/docs/components, fetched):
- Hero backgrounds: none.
- Prompt box / chat input: AI Elements "Prompt Input", "Chat", plus Input Group, Textarea, Attachment.
- Chat bubbles / messages: Message, Bubble, Marker, Message Scroller (Message Scroller and Questionnaire ship in @shadcn/react).
- Streaming text / typewriter / text reveal: shimmer utility (docs mention); Reasoning, Chain of Thought (unverified how streaming is done).
- Thinking / loading indicators: Reasoning, Chain of Thought, Spinner, Skeleton, Task, Queue.
- Compare / battle / split layouts: Resizable, Tabs (no dedicated component).
- Leaderboard / tables / numbers / charts: Chart (separate Charts section), Data Table, Table, Progress.
- Code blocks: Code Block (Oct 2026), Terminal, Stack Trace, Trace, Test Results.
- Cards / bento / feature sections: Card, Item, Empty, Sidebar blocks.
- Navigation / command palette / misc: Command, Combobox, Input OTP, Sidebar, Model Selector, Suggestion, Sources, Inline Citation, Tool, Plan, Subagent, Confirmation, Context.

Oct 2026 changelog: "Trace, Code Block and AI Elements": 21 agentic patterns; AI Elements replaces AI SDK Elements (being deprecated). Full AI Elements list: Chain of Thought, Chat, Checkpoint, Confirmation, Context, File Tree, Inline Citation, Message, Model Selector, Plan, Prompt Input, Queue, Reasoning, Sources, Stack Trace, Subagent, Suggestion, Task, Terminal, Test Results, Tool.
Registry directory: the docs page did not list entries via fetch, so notable third-party registries are not verified here. Kokonut UI, Animate UI, Kibo UI and Cult UI below all work as shadcn registries.

**Accessibility and performance notes:** Base UI/Radix primitives give keyboard and ARIA; zero heavy deps beyond primitives; Chart pulls recharts (unverified).

**Verdict for DualMind:** Use. Base layer; take Message, Prompt Input, Reasoning, Model Selector, Chart, Data Table, Command as needed.

---

#### 2. Cult UI

| | |
| --- | --- |
| URL | https://cult-ui.com (repo: https://github.com/nolly-studio/cult-ui) |
| Licence / terms | MIT. "Free, open-source components for shadcn/ui. MIT licensed." Repo LICENSE: MIT, copyright 2023 Jordan-Gilliam. Fetched: cult-ui.com, raw LICENSE. |
| Copy into a PUBLIC repo? | Yes, keep MIT notice. Applies to the free library only; paid AI SDK Agents blocks must not be committed publicly. |
| Free vs paid | Free: 154 components (58 recently added). Paid: "AI SDK Agents" blocks, 150+, one-time purchase (separate site; footer links "Cult Pro downloads", details unverified). |
| Install | shadcn CLI registry; exact command not shown on the page (unverified). |
| Stack fit | React/TS/Tailwind; motion-heavy; Tailwind v4 status unverified. |
| Maintenance | about 6.6k stars, pushed 2026-10-14 (GitHub API). |

**AI-site components:**
- Hero backgrounds: none confirmed.
- Prompt box / chat input: none in free list (paid agent blocks only).
- Chat bubbles / messages: none in free list.
- Streaming text / typewriter / text reveal: Text Gif and terminal-animation items (names from brief; not confirmed on page, unverified).
- Thinking / loading indicators: unverified.
- Compare / battle / split layouts: none confirmed.
- Leaderboard / tables / numbers / charts: Analytics chart, Kanban board (seen on page).
- Code blocks: unverified.
- Cards / bento / feature sections: Shift Card, Dynamic Island, Agent Suggest Card Stack, Globe (seen on page).
- Navigation / command palette / misc: Apple Watch Ultra demo, Dynamic Island.

**Accessibility and performance notes:** not verified; expect motion-based animations, check reduced-motion per component.

**Verdict for DualMind:** Use selectively. Good for one or two showpiece widgets (Shift Card, Dynamic Island); do not copy the paid agent blocks.

---

#### 3. Kokonut UI

| | |
| --- | --- |
| URL | https://kokonutui.com (repo: https://github.com/kokonut-labs/kokonutui) |
| Licence / terms | MIT. Repo LICENSE "MIT License, Copyright (c) 2025 kokonutUI"; GitHub API MIT. Site says only "Free and open source". Fetched: kokonutui.com, raw LICENSE. |
| Copy into a PUBLIC repo? | Yes, keep MIT notice. Pro templates (Agenta, Lume, Sonae) are not MIT and must not be committed. |
| Free vs paid | Free: 75 components. Pro: complete website templates and premium sections. |
| Install | `npx shadcn@latest add @kokonutui/particle-button`; add `@kokonutui` namespace to components.json (`https://kokonutui.com/r/{name}.json`). |
| Stack fit | shadcn registry, React/TS/Tailwind; deps per component (motion likely, unverified); v4 status unverified. |
| Maintenance | about 2.2k stars, pushed 2026-10-20 (today). Very active. |

**AI-site components** (site AI category, fetched):
- Hero backgrounds: none confirmed.
- Prompt box / chat input: AI-01 AI Input Selector, AI-02 AI Input Search, AI-11 AI Autocomplete, AI-05 AI Voice.
- Chat bubbles / messages: none.
- Streaming text / typewriter / text reveal: AI-04 AI Text Loading.
- Thinking / loading indicators: AI-03 AI State Loading, AI-04 AI Text Loading, AI-07 AI Context Meter.
- Compare / battle / split layouts: AI-09 AI Diff Review (closest to side by side).
- Leaderboard / tables / numbers / charts: none confirmed.
- Code blocks: none confirmed.
- Cards / bento / feature sections: Card Flip (name from brief, unverified on page).
- Navigation / command palette / misc: AI-10 AI Model Selector, AI-08 AI Inline Citations, AI-06 AI Tool Approval, Action Search Bar and Particle Button (particle-button confirmed in install example).

**Accessibility and performance notes:** not verified; particle effects likely canvas or motion, check reduced-motion.

**Verdict for DualMind:** Use. Best fit of the community kits: AI Model Selector, AI State/Text Loading, AI Input are directly relevant and MIT.

---

#### 4. Eldora UI

| | |
| --- | --- |
| URL | https://eldoraui.site (repo: https://github.com/karthikmudunuri/eldoraui) |
| Licence / terms | MIT. Repo LICENSE "MIT License, Copyright (c) Mudunuri Bhaskara Karthikeya Varma". Site: "free and open-source". Fetched: site, raw LICENSE. |
| Copy into a PUBLIC repo? | Yes, keep MIT notice. |
| Free vs paid | All free; no Pro tier mentioned. |
| Install | shadcn registry JSON links (`@/registry/eldoraui/...`); command not shown (unverified). |
| Stack fit | React, TypeScript, Tailwind, Motion (per site). v4/React 19 unverified. |
| Maintenance | about 2.0k stars, pushed 2026-09-26. |

**AI-site components:**
- Hero backgrounds: unverified.
- Prompt box / chat input: none seen.
- Chat bubbles / messages: none seen.
- Streaming text / typewriter / text reveal: unverified.
- Thinking / loading indicators: none seen.
- Compare / battle / split layouts: none seen.
- Leaderboard / tables / numbers / charts: none seen.
- Code blocks: none seen.
- Cards / bento / feature sections: Testimonials Slider, Animated Frameworks card.
- Navigation / command palette / misc: Clerk OTP card, Map with avatar markers.

**Accessibility and performance notes:** not verified.

**Verdict for DualMind:** Reference only. Licence is fine but little AI-specific content seen; pick text/background effects only if a gap remains.

---

#### 5. Origin UI (now coss ui)

| | |
| --- | --- |
| URL | https://originui.com 301-redirects to https://coss.com/ui (repo: https://github.com/cosscom/coss; old repo origin-space/originui resolves to the same repo) |
| Licence / terms | AGPL-3.0 (GitHub API and LICENSE file "GNU AFFERO GENERAL PUBLIC LICENSE Version 3"). README: "coss.com is licensed under the GNU Affero General Public License v3.0" (Cal.com Inc.), MIT only for packages sdk/mcp/cli/kloq. packages/ui is not in the exception list (inferred). Fetched: README, LICENSE, API. |
| Copy into a PUBLIC repo? | No / Unclear. Copying AGPL source into the site would make that code (and arguably the combined work) AGPL, a poor fit. Legacy Origin UI was MIT historically (from memory, unverified); legacy apps/origin directory licence not checked. |
| Free vs paid | Free; no pricing seen. CLA allows Cal.com to relicense commercially. |
| Install | Not shown; docs at https://coss.com/ui/docs (unfetched). |
| Stack fit | Built on Base UI; Tailwind/React presumably (unverified). |
| Maintenance | about 10.7k stars, pushed 2026-10-20. Cal.com acquired the project ("official design system of Cal.com"). |

**AI-site components:**
- Prompt box / chat input: "Composer" component listed on site (fit unverified).
- Leaderboard / tables: Table ("simple table component").
- Navigation / misc: Input, Textarea, Number Field, OTP Field, Select, Combobox, Checkbox, Dialog, Menu, Tabs, Calendar, Drawer.
- Other categories: none seen.

**Accessibility and performance notes:** Base UI primitives, so good keyboard and ARIA by design.

**Verdict for DualMind:** Avoid for copy-paste (AGPL). Reference only for patterns; write own code.

---

#### 6. 21st.dev

| | |
| --- | --- |
| URL | https://21st.dev (community marketplace; no single repo) |
| Licence / terms | Per component, set by each author; no blanket licence. Terms (https://21st.dev/terms, fetched): content is "sole and exclusive property of their respective authors and 21st Labs Inc."; may not redistribute or sell without authorization; copies on other sites must include a visible link to the original 21st.dev page; MIT-based work must keep licence and credit author. |
| Copy into a PUBLIC repo? | Yes with conditions, case by case. Using the code in your own site is the intended use ("you own the code once it lands in your repo", home page), but check the component's licence, keep author credit, and add a visible link to the 21st.dev page. Do not copy demos, screenshots, media. Terms are ambiguous about what licence publishers grant (the page notes a gap). Do not use components lacking a stated licence. |
| Free vs paid | Catalog is free; 21st AI add-on (monthly credits) is paid. |
| Install | shadcn CLI per component (`npx shadcn add "https://21st.dev/r/<author>/<component>"`, unverified) |
| Stack fit | React + Tailwind; each component differs. Dependencies per component. |
| Maintenance | Active; Animate UI is also listed there under skyleen77. |

**AI-site components:** home page names hero sections, pricing, testimonials, buttons, inputs, dialogs, shaders, gradients, shadcn themes. AI chat input and prompt box categories were not confirmed on the fetched page (unverified; they exist in the catalog from general knowledge).

**How to verify licence of a component:** open the component page on 21st.dev, check its licence field (shown as "unknown" on some, e.g. Animated Tabs per a search snippet), then open the author profile or original repo to read the LICENSE. If unknown, treat as all rights reserved and skip.

**Accessibility and performance notes:** varies by author; audit each.

**Verdict for DualMind:** Use selectively. Only MIT-confirmed items with credit and a source link; prefer Kokonut or shadcn when equal.

---

#### 7. Uiverse

| | |
| --- | --- |
| URL | https://uiverse.io (repo: https://github.com/uiverse-io/galaxy) |
| Licence / terms | MIT. Galaxy README: "All UI elements in this repository are available under the MIT License." Attribution not required but appreciated. uiverse.io/license returned 403; site footer MIT claim only via search snippet. |
| Copy into a PUBLIC repo? | Yes, keep MIT notice (credit author and Uiverse as courtesy). Check that an individual element does not embed a third-party brand asset. |
| Free vs paid | Free; elements are community made. UI kits page exists (unverified). |
| Install | Copy-paste HTML+CSS or Tailwind; no CLI. |
| Stack fit | Plain CSS or Tailwind snippets; need porting to React/TS and Tailwind v4; no dependencies. |
| Maintenance | 3,000+ elements auto-synced to Galaxy repo; PRs to repo ignored. |

**AI-site components:**
- Thinking / loading indicators: loaders and spinners (the strength).
- Cards / bento / feature sections: cards, buttons, toggles, checkboxes, inputs.
- Others (prompt box, chat bubbles, hero, tables, code): none relevant.

**Accessibility and performance notes:** CSS-only so light, but often lacks focus states, ARIA and prefers-reduced-motion; add them when porting.

**Verdict for DualMind:** Use selectively. Loaders and a few buttons, ported to Tailwind with reduced-motion handling.

---

#### 8. Animate UI

| | |
| --- | --- |
| URL | https://animate-ui.com (repo: https://github.com/imskyleen/animate-ui) |
| Licence / terms | MIT + Commons Clause. "You may use this Software, including for any commercial purpose, so long as you do not sell or redistribute the components themselves in their original form." Fetched: raw LICENSE.md. GitHub API shows NOASSERTION. |
| Copy into a PUBLIC repo? | Unclear, lean yes with conditions. Using components inside a website is explicitly allowed ("as part of an application, website, or product"); but committing the unmodified component source in a public repo is arguably "redistribution in original form". Keep copyright notice; prefer modified/composed use; ask the author if unsure. |
| Free vs paid | Free; no Pro tier found. |
| Install | `npx @animate-ui/cli@latest animate all` or shadcn registry; also on 21st.dev (skyleen77). |
| Stack fit | Animated primitives for Radix, Base UI and React Aria; React, TS, motion. Tailwind v4 unverified. |
| Maintenance | about 4.5k stars, pushed 2026-10-19. |

**AI-site components:**
- Prompt box / chat input, chat bubbles, code blocks: none seen.
- Streaming text / text reveal, backgrounds, counters: names in brief; only Sliding Number confirmed on the home page (rest unverified).
- Thinking / loading: Progress, Toast (primitives seen).
- Navigation / misc: Switch, Tabs, Accordion, Checkbox, Radio Group, Icons.

**Accessibility and performance notes:** wraps accessible primitives; motion cost moderate; check reduced-motion (unverified).

**Verdict for DualMind:** Use selectively. Good Base UI animated Tabs/Sliding Number (e.g. Elo counters); do not paste raw files unmodified into a public repo without accepting the Commons Clause risk.

---

#### 9. Kibo UI

| | |
| --- | --- |
| URL | https://www.kibo-ui.com (repo: https://github.com/haydenbleasel/kibo) |
| Licence / terms | MIT per GitHub API and the docs page ("MIT licensed and open source"). Raw LICENSE file not retrievable at /main/LICENSE (empty), so the text itself is unverified. |
| Copy into a PUBLIC repo? | Yes, keep MIT notice (unverified file, but API and docs agree). |
| Free vs paid | Free ("Free and open source, forever"); no Pro seen. |
| Install | `npx kibo-ui add` or shadcn CLI. |
| Stack fit | shadcn registry; React/TS/Tailwind; v4 and React 19 status unverified. |
| Maintenance | about 4k stars, last push 2026-05-04 (about 5 months ago): slowing. Site lists 41 components, 28 blocks. |

**AI-site components:** site component list (fetched) has no AI-named components; the docs page mentions "AI chat primitives" but the list has none. The AI Input/Message/Response/Reasoning/Tool pieces appear to have moved out: shadcn now ships its own AI Elements (Oct 2026) and the author's earlier work was merged into the Vercel AI Elements line (unverified from memory). Treat Kibo AI as superseded.
- Code blocks: Code Block, Snippet, Sandbox.
- Leaderboard / tables / numbers: Table, Ticker, Gantt, Relative Time, Contribution Graph, Comparison (name suggests a compare slider, unverified).
- Cards / misc: Marquee, Banner, Announcement, Spinner, Status, Pill, Rating, Tags, Theme Switcher.

**Accessibility and performance notes:** not verified.

**Verdict for DualMind:** Reference only. Use shadcn AI Elements instead; maybe Table, Ticker, Comparison, Code Block.

### 5.3 Component systems, charts and blocks

Licence data for repos comes from the GitHub API (spdx_id, pushed_at, stars) and fetched README/site pages. "(unverified)" = not seen on a fetched page.

#### HeroUI

| | |
| --- | --- |
| URL | https://www.heroui.com (repo: https://github.com/heroui-inc/heroui) |
| Licence / terms | Apache-2.0 (GitHub API + repo page). Standard Apache terms: keep licence/NOTICE, state changes. |
| Copy into a PUBLIC repo? | Yes with conditions: Apache-2.0 allows use and redistribution in a public website repo; keep licence notice if you copy source. Normally used as an npm dependency, so no copying needed. |
| Free vs paid | All free. No Pro tier seen (unverified). |
| Install | npm package (`@heroui/react`, v3); not a shadcn registry (unverified). |
| Stack fit | README: Tailwind CSS v4, "works out of the box with React 19". TypeScript. Built on React Aria (unverified). |
| Maintenance | about 31k stars; v3 is default branch; latest release v3.2.6 (17 Sep 2026); pushed 20 Oct 2026. |

**AI-site components** (generic UI kit, no AI-specific parts seen):
- Hero backgrounds: none
- Prompt box / chat input: none (Input/Textarea only)
- Chat bubbles / messages: none
- Streaming text / typewriter / text reveal: none
- Thinking / loading indicators: Spinner, Skeleton, Progress (unverified)
- Compare / battle / split layouts: none
- Leaderboard / tables / numbers / charts: Table component (unverified); no charts
- Code blocks: none
- Cards / bento / feature sections: Card
- Navigation / command palette / misc: Navbar, Tabs, Modal, Dropdown (unverified)

**Accessibility and performance notes:** React Aria based accessibility (unverified). Own theme tokens and component styles would compete with shadcn tokens; extra bundle.

**Verdict for DualMind:** Reference only. A second full component system beside shadcn adds token and style conflicts; borrow ideas, not code.

#### Smooth UI

| | |
| --- | --- |
| URL | https://smoothui.dev (repo: https://github.com/educlopez/smoothui) |
| Licence / terms | MIT. README: "This project is licensed under the MIT License." |
| Copy into a PUBLIC repo? | Yes with conditions: MIT permits publishing copied source; keep the copyright/licence notice in copied files or a NOTICE. Not a UI kit redistribution in our case. |
| Free vs paid | All free (no Pro seen). |
| Install | shadcn CLI `npx shadcn@latest add @smoothui/<name>`, or `npx smoothui-cli add <name>`, or copy-paste. |
| Stack fit | React + Tailwind + shadcn + motion; deps: motion, lucide-react, clsx, tailwind-merge. Tailwind v4 not stated (unverified). |
| Maintenance | about 1.0k stars; v4.0.0 released 15 Oct 2026; pushed 16 Oct 2026 (very active). |

**AI-site components:**
- Hero backgrounds: none
- Prompt box / chat input: FloatInput (floating label), not chat-specific
- Chat bubbles / messages: none seen
- Streaming text / typewriter / text reveal: TypewriterText, WaveText, ScrambleHover
- Thinking / loading indicators: SiriOrb (voice/assistant orb, good "thinking" visual)
- Compare / battle / split layouts: ExpandableCards, ScrollableCardStack (could suit two-answer reveal, unverified)
- Leaderboard / tables / numbers / charts: none
- Code blocks: none
- Cards / bento / feature sections: MatrixCard, ExpandableCards, AppDownloadStack
- Navigation / command palette / misc: DynamicIsland, FluidMorph, RichPopover, ButtonCopy, CursorFollow

**Accessibility and performance notes:** reduced-motion support not verified. Light deps (motion only), no WebGL.

**Verdict for DualMind:** Use selectively. SiriOrb, TypewriterText and DynamicIsland-style pieces are polished and MIT; v4 major just shipped, check Tailwind v4 compatibility per component.

#### Animata

| | |
| --- | --- |
| URL | https://animata.design (repo: https://github.com/codse/animata) |
| Licence / terms | MIT (repo page: "MIT license", LICENSE.md). |
| Copy into a PUBLIC repo? | Yes with conditions: MIT; keep notice. Copy-paste model is intended. |
| Free vs paid | All free. |
| Install | Copy-paste per component; README asks for tailwind-merge, clsx, lucide-react, tailwindcss-animate; Framer Motion optional. No shadcn registry seen (unverified). |
| Stack fit | React + Tailwind (version not stated; README mentions `tailwind.config.js` and `tailwindcss-animate`, which suggests Tailwind v3 setup, so porting to v4 may be needed). TypeScript. |
| Maintenance | about 3.0k stars; v3.4.1 (14 Sep 2026); pushed 14 Oct 2026. |

**AI-site components** (docs categories: Background 10, Bento 3, Button 13, Card 11, Graphs & charts 5, Hero 4, Progress 2, Skeleton 6, Text 42, Widget 30):
- Hero backgrounds: Animated Beam, Moving Gradient, Interactive Grid, Shooting Stars, Blurry blob, Boids Ecosystem
- Prompt box / chat input: none seen
- Chat bubbles / messages: Text Explode (iMessage style), minor
- Streaming text / typewriter / text reveal: Typing Text, Split Text, Wave Reveal, Shimmer Sweep, Animated Gradient Text (largest text set)
- Thinking / loading indicators: PreLoader (2), Skeleton (6)
- Compare / battle / split layouts: none
- Leaderboard / tables / numbers / charts: "Graphs & charts" (5, names not verified), Led Board
- Code blocks: none
- Cards / bento / feature sections: Card Stack, Flip Card, Glowing Card, Collab Card, Bento grid
- Navigation / command palette / misc: Widgets are mostly novelty (alarm, weather)

**Accessibility and performance notes:** reduced-motion not verified; mostly CSS plus optional Framer Motion; Boids is canvas-based (unverified).

**Verdict for DualMind:** Use selectively. Text effects and backgrounds are handy; widgets are off-theme. Check Tailwind v4 per component.

#### SyntaxUI

| | |
| --- | --- |
| URL | https://www.syntaxui.com (repo: https://github.com/syntaxui/syntaxui) |
| Licence / terms | MIT (GitHub API; README says copy-paste components). Site returned HTTP 500 so no page terms read. |
| Copy into a PUBLIC repo? | Yes with conditions: MIT, keep notice (repo licence verified via API, site terms unverified). |
| Free vs paid | Free (any paid tier unverified). |
| Install | Copy-paste from the site; no package. |
| Stack fit | React + Tailwind + Framer Motion (README says Tailwind, "Framer Motion-enhanced"); version not stated. |
| Maintenance | about 1.0k stars; last push 18 May 2026 (about 5 months stale); no releases. |

**AI-site components:** component list not verified (site fetch failed). Described only as "pre-built, Tailwind CSS-powered components and animations".
- Hero backgrounds: (unverified)
- Prompt box / chat input: (unverified)
- Chat bubbles / messages: (unverified)
- Streaming text / typewriter / text reveal: (unverified)
- Thinking / loading indicators: (unverified)
- Compare / battle / split layouts: none known
- Leaderboard / tables / numbers / charts: (unverified)
- Code blocks: (unverified)
- Cards / bento / feature sections: (unverified)
- Navigation / command palette / misc: (unverified)

**Accessibility and performance notes:** unverified.

**Verdict for DualMind:** Avoid (as a source). Slower maintenance and nothing verified to beat Smooth UI or Animata.

#### Tremor (Tremor Raw / Blocks)

| | |
| --- | --- |
| URL | https://www.tremor.so (repos: https://github.com/tremorlabs/tremor = Raw, https://github.com/tremorlabs/tremor-blocks, https://github.com/tremorlabs/tremor-npm) |
| Licence / terms | Apache-2.0 (tremor Raw repo, tremor-npm); Blocks MIT. Vercel announcement: Blocks "free and open source for all users under an MIT license". Docs page shows only "(c) 2025 Tremor Labs, Inc. All rights reserved" footer. |
| Copy into a PUBLIC repo? | Yes with conditions: Apache-2.0 allows copying into a public repo; keep licence text and notices, mark changes. Blocks are MIT; keep notice. |
| Free vs paid | All free since Vercel acquired Tremor (Jan 2025). |
| Install | Copy-paste Tremor Raw components (Next.js/Vite guides; Vite guide marked "Updating Soon"); utilities `cx`, `chartUtils`, `focusRing`. npm package `@tremor/react` is the older v3 line. |
| Stack fit | Docs: Tailwind CSS v4.0+, React 18.2+ (React 19 not stated); TypeScript; Recharts is the underlying chart lib (known from the project, not on the fetched page); also Radix and `tailwind-variants` (unverified). Not tied to shadcn tokens, but easy to restyle. |
| Maintenance | about 3.7k stars (Raw repo), last push 10 Oct 2025 (about 1 year stale); npm repo 16.5k stars, last push Jan 2025. |

**AI-site components** (docs list):
- Hero backgrounds: none
- Prompt box / chat input: none
- Chat bubbles / messages: none
- Streaming text / typewriter / text reveal: none
- Thinking / loading indicators: none
- Compare / battle / split layouts: none (Category Bar for win-share splits)
- Leaderboard / tables / numbers / charts: Bar List (ranked bars, ideal leaderboard), Tracker (win/loss strip), Spark Chart, Progress Bar, Category Bar, Table, Area/Line/Bar/Combo/Donut charts, Progress Circle
- Code blocks: none
- Cards / bento / feature sections: Card, Callout, Badge
- Navigation / command palette / misc: Tabs, Dialog, Drawer, Tooltip, Date pickers

**Accessibility and performance notes:** Recharts is SVG (no WebGL); Radix primitives for UI; charts bundle cost moderate. Repo is quiet, so expect no fixes.

**Verdict for DualMind:** Use selectively. Bar List, Tracker, Spark Chart and Category Bar are the best leaderboard visuals; copy and restyle to shadcn tokens, verify against current Recharts.

#### Evil Charts and shadcn charts

| | |
| --- | --- |
| URL | https://evilcharts.com (repo: https://github.com/legions-developer/evilcharts); shadcn charts: https://ui.shadcn.com/docs/components/chart (repo: https://github.com/shadcn-ui/ui) |
| Licence / terms | Evil Charts: MIT (GitHub API and repo page, licence text not shown). shadcn/ui: MIT (GitHub API). |
| Copy into a PUBLIC repo? | Yes with conditions: MIT for both; keep notice in copied Evil Charts files. shadcn chart is installed via CLI into the repo as intended. |
| Free vs paid | Both free. |
| Install | `pnpm dlx shadcn@latest add chart` (docs); Evil Charts is copy-paste/registry (exact command unverified). |
| Stack fit | shadcn chart uses Recharts v3, Tailwind v4 syntax and oklch CSS vars (docs). Evil Charts: "built with shadcn and Recharts", site also mentions Apache ECharts. React 19 for shadcn not stated on the page. |
| Maintenance | shadcn/ui about 126k stars, release shadcn@4.22.1 (18 Oct 2026); Evil Charts about 3.1k stars, pushed 5 Oct 2026. |

**AI-site components:**
- Hero backgrounds: none
- Prompt box / chat input: none
- Chat bubbles / messages: none
- Streaming text / typewriter / text reveal: none
- Thinking / loading indicators: none
- Compare / battle / split layouts: none
- Leaderboard / tables / numbers / charts: shadcn: Area, Bar, Line, Pie, Radar, Radial via ChartContainer/ChartTooltip; Evil Charts: animated Bar, Line, Area, Pie, Radar variants (sparklines and rank-change charts not listed; build from Line/Area minimal config)
- Code blocks: none
- Cards / bento / feature sections: none
- Navigation / command palette / misc: none

**Accessibility and performance notes:** Recharts is SVG; shadcn ChartContainer needs fixed height or aspect; Evil Charts animation reduced-motion support unverified; ECharts (if used) is heavier.

**Verdict for DualMind:** Use. shadcn chart as the base for Elo history lines (already matches the stack); Evil Charts for polish where its animated variants fit.

#### Launch UI

| | |
| --- | --- |
| URL | https://www.launchuicomponents.com (repo: https://github.com/launch-ui/launch-ui). Note: launchui.com is not this project (unverified). |
| Licence / terms | MIT (GitHub API); search listing describes it as free and open source. |
| Copy into a PUBLIC repo? | Yes with conditions: MIT; keep notice. Fits a public website repo. |
| Free vs paid | Free (any Pro tier unverified). |
| Install | shadcn registry (19 components via CLI per listing, unverified), or clone the template. |
| Stack fit | package.json: React 19.2, Tailwind ^4.3, Next 16, Radix primitives. TypeScript. Next.js-flavoured (we use Vite, so avoid next/* imports). |
| Maintenance | about 870 stars; v2.10.1 (4 Sep 2026); active. |

**AI-site components:**
- Hero backgrounds: Hero section with glow/mockup (per listing, unverified detail)
- Prompt box / chat input: none
- Chat bubbles / messages: none
- Streaming text / typewriter / text reveal: none
- Thinking / loading indicators: none
- Compare / battle / split layouts: none
- Leaderboard / tables / numbers / charts: Stats section
- Code blocks: none
- Cards / bento / feature sections: Items (feature cards), bento, logos, testimonials per listing
- Navigation / command palette / misc: Navbar, FAQ, CTA, Footer

**Accessibility and performance notes:** Radix-based, dark mode; light dependencies, no WebGL (unverified).

**Verdict for DualMind:** Use selectively. Good landing section structure (navbar, hero, stats, FAQ, footer) on the same stack; restyle and strip Next-specific imports.

#### shadcnblocks.com and ReUI

| | |
| --- | --- |
| URL | https://www.shadcnblocks.com ; https://reui.io (repo: https://github.com/keenthemes/reui) |
| Licence / terms | shadcnblocks: paid licence; Restrictions include "Publishing the Components or Derivatives in a public repository." (https://www.shadcnblocks.com/license). Free blocks follow separate Terms & Conditions (not read). ReUI free: MIT (GitHub API and site: "Free components and primitives are under the MIT License"); Pro needs a licence. |
| Copy into a PUBLIC repo? | shadcnblocks: No for paid blocks (public repo publishing banned); free blocks Unclear, T&C not read. ReUI: Yes with conditions for MIT free items (keep notice); No for Pro blocks and Pro-licence templates in a public repo (Pro licence terms unverified). |
| Free vs paid | shadcnblocks: free blocks need login; Pro $149 / Premium $299 / Elite $399 one-time, single user. ReUI: 1,264 free components + 27 primitives; Pro from $249 one-time: 654 blocks, icons, templates. |
| Install | shadcnblocks: shadcn CLI registry with auth for paid. ReUI: `pnpm dlx shadcn@latest add @reui/<name>`. |
| Stack fit | ReUI: shadcn, Radix and Base UI variants, TanStack Table for Data Grid; Tailwind version not stated on page (unverified). shadcnblocks: shadcn/Tailwind (unverified detail). |
| Maintenance | ReUI about 3.8k stars, pushed 16 Oct 2026 (active). shadcnblocks: closed source. |

**AI-site components:**
- Hero backgrounds: shadcnblocks Hero (292 blocks, paid mostly); ReUI Hero (16, Pro)
- Prompt box / chat input: none identified
- Chat bubbles / messages: none identified
- Streaming text / typewriter / text reveal: none
- Thinking / loading indicators: none
- Compare / battle / split layouts: none
- Leaderboard / tables / numbers / charts: ReUI free Table (17 variants) and Data Grid (47 blocks, Base/Advanced/Filtering/Virtualization; free vs Pro split not verified); shadcnblocks Data Table (32), Stats (20)
- Code blocks: none
- Cards / bento / feature sections: shadcnblocks Feature (321); ReUI Stats (17, Pro-ness unverified)
- Navigation / command palette / misc: n/a

**Accessibility and performance notes:** Radix/Base UI primitives; Data Grid virtualization available; TanStack Table dependency.

**Verdict for DualMind:** ReUI: Use selectively, free MIT Table/Data Grid only (confirm each item is free before copying). shadcnblocks: Avoid, licence forbids public repos.

#### Preline UI (chosen over Hyper UI)

| | |
| --- | --- |
| URL | https://preline.co (repo: https://github.com/htmlstreamofficial/preline); alternative HyperUI https://www.hyperui.dev (https://github.com/markmead/hyperui, MIT, about 12k stars) |
| Licence / terms | Dual: MIT plus "Preline UI Fair Use License" (LICENSE header, fetched via GitHub API). Fair Use: no competing products; redistributions "must include this Fair Use License"; attribution with repo link. GitHub shows NOASSERTION. |
| Copy into a PUBLIC repo? | Yes with conditions: free for personal and commercial; keep both licence texts, notices, and attribute with link when redistributing. A portfolio site is not a competing product. Safer: use as npm dependency rather than copying. |
| Free vs paid | Core library and many examples free; Pro templates/blocks paid (unverified). |
| Install | npm `preline` plus Tailwind plugin; HTML-first with JS behaviours; not React-native (React wrappers unverified). |
| Stack fit | Tailwind v4 era (v5.0.0 on 31 Aug 2026); framework-agnostic vanilla JS, awkward in React 19 (unverified). |
| Maintenance | about 6.5k stars; v5.0.0 (31 Aug 2026). |

**AI-site components:**
- Hero backgrounds: none AI-specific
- Prompt box / chat input: none
- Chat bubbles / messages: chat bubble example (unverified)
- Streaming text / typewriter / text reveal: none
- Thinking / loading indicators: spinners (unverified)
- Compare / battle / split layouts: none
- Leaderboard / tables / numbers / charts: tables, ApexCharts-based charts (unverified)
- Code blocks: none
- Cards / bento / feature sections: many marketing sections
- Navigation / command palette / misc: navbars, command-style search (unverified)

**Accessibility and performance notes:** HTML plus JS plugin model; overlaps with shadcn/Radix.

**Verdict for DualMind:** Avoid. Extra licence conditions and a non-React model; HyperUI (plain MIT Tailwind snippets) is a lighter reference if needed.

#### Other 2026 sources: Prompt Kit, HextaUI, Spectrum UI

| | |
| --- | --- |
| URL | https://www.prompt-kit.com (https://github.com/ibelick/prompt-kit); https://hextaui.com (https://github.com/preetsuthar17/hextaui); https://ui.spectrumhq.in (https://github.com/arihantcodes/spectrum-ui) |
| Licence / terms | Prompt Kit MIT (GitHub API); HextaUI MIT, "free for personal and commercial use" (site, fetched); Spectrum UI Apache-2.0 (GitHub API; site states no licence). |
| Copy into a PUBLIC repo? | Yes with conditions for all three: keep MIT/Apache notice in copied source. HextaUI Pro blocks (paid, token-gated) not covered: No. |
| Free vs paid | Prompt Kit free; HextaUI free components + Pro AI blocks (chat, tool call, reasoning, voice); Spectrum UI free. |
| Install | Prompt Kit: shadcn registry (unverified command). HextaUI: `npx shadcn@latest add https://hextaui.com/r/<name>.json`. Spectrum UI: copy-paste. |
| Stack fit | Prompt Kit: shadcn + Tailwind (version unverified; site returned 403). HextaUI: Tailwind v4 tokens, Base UI (`@base-ui/react`), not Radix. Spectrum UI: built on Aceternity, Magic UI, shadcn; Tailwind version unverified. |
| Maintenance | Prompt Kit about 3.1k stars, pushed 28 Sep 2026; HextaUI about 117 stars, pushed 16 Oct 2026; Spectrum UI about 1.5k stars, pushed 21 Sep 2026. |

**AI-site components:**
- Hero backgrounds: none verified
- Prompt box / chat input: Prompt Kit PromptInput (repo describes "core building blocks for AI apps", component names unverified); HextaUI free prompt input; Spectrum UI Metal Prompt Bar
- Chat bubbles / messages: HextaUI chat message; Prompt Kit message/chat container (names unverified); Spectrum UI AI Chat Card
- Streaming text / typewriter / text reveal: Prompt Kit (text shimmer/response stream, unverified)
- Thinking / loading indicators: HextaUI Pro reasoning block (paid); Spectrum UI Spinner, Skeleton Reveal
- Compare / battle / split layouts: none
- Leaderboard / tables / numbers / charts: Spectrum UI Number Ticker, Data Table, Animated SVG Chart
- Code blocks: Prompt Kit code block (unverified)
- Cards / bento / feature sections: Spectrum UI Beam Card, 3D Tilt Card
- Navigation / command palette / misc: Spectrum UI Command Search, Beam Search Bar

**Accessibility and performance notes:** Spectrum UI hero text claims 250+ components but lists 58; reduced-motion unverified for all; HextaUI needs Base UI alongside shadcn.

**Verdict for DualMind:** Prompt Kit: Use selectively (best fit for prompt box and message patterns, verify names on GitHub). HextaUI: Reference only (Base UI mismatch, Pro paywall, small). Spectrum UI: Reference only (Number Ticker, Metal Prompt Bar ideas).

### 5.4 AI chat kits

Method: GitHub pages via WebFetch, repo metadata and LICENSE files via `gh api` (stars, pushed_at, releases), plus the doc pages named in each entry. Anything not seen on a fetched page is marked (unverified). Prices were not checked.

Arena key: (a) two synchronized answer panes, (b) streaming markdown with code and math, (c) thinking/loading indicators, (d) prompt input with model selector, (e) vote/feedback bars.

#### assistant-ui

| | |
| --- | --- |
| URL | https://www.assistant-ui.com (repo: https://github.com/assistant-ui/assistant-ui) |
| Licence / terms | MIT. "Assistant Cloud is optional and adds managed thread persistence and analytics." Source: github.com/assistant-ui/assistant-ui README, repo metadata (SPDX MIT) |
| Copy into a PUBLIC repo? | Yes. MIT only requires keeping the copyright notice. Publishing copied/generated component source in a public portfolio repo is allowed. |
| Free vs paid | Library MIT and free. Assistant Cloud (hosted threads/analytics) is the paid optional part. Not needed. |
| Install | npm `@assistant-ui/react`; CLI copies a shadcn-style starter (Base UI default or Radix flavour) into the project |
| Stack fit | React, TypeScript, shadcn-based UI. Tailwind v4 not stated on the fetched page (unverified, though shadcn starter implies Tailwind). |
| Maintenance | about 12.6k stars; latest release `@assistant-ui/react-generative-ui@0.1.5` on 2026-10-19; pushed 2026-10-20. Very active. |

**AI-site components:**
- Prompt box / chat input: `ComposerPrimitive` (Input, Send, AddAttachment). Unstyled primitives; model selector not seen (you build it).
- Chat bubbles / messages: `MessagePrimitive` (Root, Parts), `ActionBarPrimitive`, `BranchPickerPrimitive`, `ThreadPrimitive.Viewport`.
- Streaming text: runtime-driven; LocalRuntime `run` as `async *` generator yielding cumulative content (docs: runtimes/custom/local-runtime).
- Thinking / loading indicators: reasoning parts exist; only the last text/reasoning part reports `running` (docs).
- Compare / battle / split layouts: none found. The examples page (assistant-ui.com/examples) lists ChatGPT clones, copilots, generative UI, artifacts, multimodal; no compare example seen. Whether two `AssistantRuntimeProvider`s can sit on one page is not covered in the docs I read (unverified; must be tested).
- Leaderboard / tables / charts: none.
- Code blocks: markdown/code rendering exists via its markdown package (unverified in detail).
- Cards / bento: none.
- Navigation / misc: `ThreadList`, attachments, tool UIs (`makeAssistantToolUI`).

Runtimes: `useExternalStoreRuntime` (you own messages in your store; `onNew` required, `setMessages` enables branching, `onEdit/onReload/onCancel`), `useLocalRuntime` (one `ChatModelAdapter.run`), `useDataStreamRuntime` (AI SDK data-stream protocol, would need backend change), AI SDK, LangGraph, AG-UI, A2A.

**Accessibility and performance notes:** primitives are Radix/Base UI based (keyboard handling likely good, unverified). Bundle is sizeable; it is a whole thread framework.

**Arena fit (a-e):** a: no, would need two runtimes (untested). b: partial. c: partial. d: composer only, no model picker. e: ActionBar is a place to put vote buttons, no built-in vote. Overkill for Arena; with a custom SSE backend ExternalStore/Local runtime is feasible.

**Verdict for DualMind:** Reference only (maybe Use selectively for Direct chat mode). Heavy framework, no compare layout, a custom runtime adapter per pane is real work.

#### prompt-kit

| | |
| --- | --- |
| URL | https://www.prompt-kit.com (repo: https://github.com/ibelick/prompt-kit) |
| Licence / terms | MIT ("MIT license", LICENCE.md present). Source: github.com/ibelick/prompt-kit page + repo metadata |
| Copy into a PUBLIC repo? | Yes. Keep the MIT notice; copied source in a public website repo is fine. |
| Free vs paid | All free as far as seen. |
| Install | shadcn registry: `npx shadcn@latest add prompt-kit/[component]` |
| Stack fit | Repo package.json (read via gh): React ^19, Tailwind ^4.1.7, motion ^12, react-markdown ^10, marked ^15, shiki ^3, Next 15 for its docs site. `ai` / `@ai-sdk/react` appear in the repo's dependencies, but they are for the docs demo, not the components (components import none seen; unverified per component). |
| Maintenance | about 3.1k stars; last push 2026-09-28; no GitHub releases (registry-based). Moderate activity. |

**AI-site components** (file list from components/prompt-kit via gh api):
- Prompt box / chat input: `prompt-input` (auto-grow textarea, actions slot; build your own model select inside), `prompt-suggestion`, `file-upload`.
- Chat bubbles / messages: `message`, `system-message`, `chat-container` (stick-to-bottom scroll), `scroll-button`.
- Streaming text: `response-stream` (typewriter/fade modes), `markdown` (react-markdown + marked chunking, memoized blocks).
- Thinking / loading indicators: `loader` (many variants), `thinking-bar`, `text-shimmer`, `reasoning`, `chain-of-thought`, `steps`.
- Compare / battle / split layouts: none.
- Leaderboard / tables: none.
- Code blocks: `code-block` (shiki).
- Cards: `source`, `tool`, `image`, `jsx-preview`.
- Misc: `feedback-bar` (thumbs-style feedback; adaptable to A/B vote UI).

**Accessibility and performance notes:** motion dependency; reduced-motion handling not verified. Light weight, plain React components, no AI SDK needed.

**Arena fit (a-e):** a: no, but `chat-container` x2 is easy. b: yes for markdown+code; math needs remark-math/katex added (unverified it is wired). c: yes, best set seen (loader, thinking-bar, shimmer, reasoning). d: prompt-input yes, model selector DIY. e: `feedback-bar` partial.

**Verdict for DualMind:** Use. Best fit: shadcn-registry, Tailwind v4, React 19, MIT, no framework lock-in, pulls in only what you copy.

#### Vercel AI Elements

| | |
| --- | --- |
| URL | https://elements.ai-sdk.dev (repo: https://github.com/vercel/ai-elements) |
| Licence / terms | Apache-2.0 (LICENSE file read via gh: "Licensed under the Apache License, Version 2.0"); GitHub shows NOASSERTION only because of header formatting. |
| Copy into a PUBLIC repo? | Yes with conditions: Apache-2.0 needs the licence/notice kept and changed files marked. Public repo use is allowed. |
| Free vs paid | Free. |
| Install | shadcn custom registry via `npx ai-elements@latest` (CLI) |
| Stack fit | Requires per README: Node 18+, Next.js project with AI SDK, shadcn/ui, Tailwind CSS variables mode. package.json: `ai` ^6, react 19.2, motion, `streamdown` ^2.4, `use-stick-to-bottom`. Components type against AI SDK `UIMessage` types, so non-AI-SDK use needs adapters. Vite works in practice (unverified). |
| Maintenance | about 2.5k stars; release ai-elements@1.9.1 on 2026-10-14. Site and README state: "This project will be deprecated at the end of November 2026" and is moving to shadcn/ui (confirmed on both fetched pages). |

**AI-site components** (site list): 
- Prompt box: `Prompt Input`, `Model Selector`, `Suggestion`, `Attachments`.
- Messages: `Conversation`, `Message`, `Inline Citation`, `Sources`, `Checkpoint`.
- Streaming: via `streamdown` (Message response).
- Thinking / loading: `Reasoning`, `Chain of Thought`, `Shimmer`, `Plan`, `Task`, `Queue`.
- Compare / split: none.
- Code blocks: `Code Block`, plus Code group (Terminal, Sandbox, File Tree etc., mostly irrelevant).
- Misc: Voice and Workflow (canvas) groups.

**Accessibility and performance notes:** built on shadcn/Radix; reduced motion not verified. Large registry but copy-per-component.

**Arena fit (a-e):** a: no. b: yes through Streamdown. c: yes. d: yes, only kit with a Model Selector component. e: none.

**Verdict for DualMind:** Use selectively as reference (Model Selector, Reasoning patterns). Do not build on it: deprecation announced for end Nov 2026, AI SDK/Next oriented.

#### Vercel AI SDK UI (useChat + custom ChatTransport)

| | |
| --- | --- |
| URL | https://ai-sdk.dev/docs/ai-sdk-ui/transport (repo: https://github.com/vercel/ai) |
| Licence / terms | Apache-2.0 (LICENSE file read via gh). |
| Copy into a PUBLIC repo? | Yes; it is an npm dependency, nothing to copy. |
| Free vs paid | Free. |
| Install | npm `ai`, `@ai-sdk/react` |
| Stack fit | React hook `useChat`; TypeScript. Active (release 2026-10-20). |
| Maintenance | about 27k stars; pushed 2026-10-20. |

Findings: the transport doc says the system enables "integration with any backend protocol or service" and points to the `ChatTransport` interface (`sendMessages`), `DefaultChatTransport`, `WebSocketChatTransport`. The stream must be `UIMessageChunk` objects (start chunk with messageId, etc.). The doc page gives no full custom-transport guide (read source) . So a custom `ChatTransport` would translate the ASP.NET SSE into `UIMessageChunk` stream, and `useChat` gives message state, status, stop, regenerate. Hooks are instance-based, so two `useChat` calls with different `id`s give two independent panes (inferred from the API, unverified).

**AI-site components:** none; it is state management only.

**Arena fit (a-e):** a: two `useChat` instances is a clean way to hold two streams (inferred). b-e: none.

**Cost/benefit:** benefit is free message/status state and compatibility with AI Elements/assistant-ui adapters; cost is a transport adapter plus a dependency on a fast-moving major version (`ai` 6 now), while Direct and Arena streams are simple enough to handle with a small custom hook over fetch+SSE.

**Verdict for DualMind:** Avoid for now (own ~60-line SSE hook is simpler); revisit only if you adopt AI Elements or assistant-ui.

#### Streamdown

| | |
| --- | --- |
| URL | https://streamdown.ai (repo: https://github.com/vercel/streamdown) |
| Licence / terms | Apache-2.0 (LICENSE file read via gh); GitHub API shows NOASSERTION. |
| Copy into a PUBLIC repo? | Yes; npm dependency, nothing copied. |
| Free vs paid | Free. |
| Install | npm `streamdown`; optional `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `@streamdown/cjk` |
| Stack fit | peerDependencies react and react-dom ^18 or ^19 (package.json). Tailwind needs `@source` line for the dist and for each plugin installed (README). Needs KaTeX CSS for math. |
| Maintenance | about 5.7k stars; streamdown@2.7.1 on 2026-10-19; pushed 2026-10-20. Very active. |

- Streaming markdown: drop-in replacement for react-markdown designed for unterminated/partial markdown while tokens stream.
- Code: `@streamdown/code` (Shiki); Math: `@streamdown/math` (KaTeX, import CSS); Mermaid with render button; CJK plugin (details not on page).
- Security: "Built with rehype-harden for safe rendering" (README). No documented tuning options on the page. `allowedTags` and `fallbackComponent` props exist for custom tags; do not enable them for untrusted model output without review.

**Alternative: react-markdown + rehype-sanitize** (both MIT; react-markdown about 15.9k stars, pushed 2026-10-03; rehype-sanitize about 224 stars, last push 2023-09, stable/small). Safe by default (no raw HTML unless rehype-raw), add remark-gfm, remark-math + rehype-katex, rehype-highlight or shiki. Does not repair partial markdown during streaming, so it needs memoized per-block rendering (prompt-kit's `markdown` does exactly this).

**Arena fit (a-e):** a: no. b: yes, the best answer (code, math, mermaid, security). c: no. d: no. e: no.

**Verdict for DualMind:** Use. Streamdown for answer panes (check bundle size of Shiki/Mermaid plugins in CI; load mermaid lazily or skip it). Fallback is react-markdown + rehype-sanitize.

#### Chatscope chat-ui-kit-react

| | |
| --- | --- |
| URL | https://chatscope.io (repo: https://github.com/chatscope/chat-ui-kit-react) |
| Licence / terms | MIT. Source: repo README + metadata |
| Copy into a PUBLIC repo? | Yes (MIT, keep notice); it is an npm package anyway. |
| Free vs paid | Free (a paid "Chat UI Kit" for Figma/other is mentioned on site? unverified). |
| Install | npm `@chatscope/chat-ui-kit-react` plus `@chatscope/chat-ui-kit-styles` (imports `styles.min.css`) |
| Stack fit | Ships SCSS-built global CSS theme; no Tailwind integration, would clash with shadcn tokens. React 19 not stated (unverified). |
| Maintenance | about 1.8k stars; last release v2.1.1 on 2025-05-15, no pushes since (about 17 months stale). |

- Components: `MainContainer`, `ChatContainer`, `MessageList`, `Message`, `MessageInput` (plus others, unverified).
- Built for human-to-human messenger UIs: no streaming markdown, code blocks, thinking indicators or model picker.

**Arena fit (a-e):** none.

**Verdict for DualMind:** Avoid. Wrong domain, SCSS theme, stale.

#### LlamaIndex chat-ui (@llamaindex/chat-ui)

| | |
| --- | --- |
| URL | https://github.com/run-llama/chat-ui |
| Licence / terms | MIT ("released under the MIT License"). |
| Copy into a PUBLIC repo? | Yes (MIT). |
| Free vs paid | Free. |
| Install | npm `@llamaindex/chat-ui` |
| Stack fit | shadcn/ui-based; supports Tailwind v4 (`@source` in globals.css) and v3. Example uses `useChat` from `@ai-sdk/react`, but a handler interface is generic. Markdown via highlight.js + KaTeX; PDF viewer. |
| Maintenance | about 596 stars; release @llamaindex/chat-ui@0.6.1 on 2025-08-28; last push 2025-12-16. Slowing. |

- Components: `ChatSection`, `ChatMessages`, `ChatInput` (Form, Field, Upload, Submit, Preview), `useChatUI`.
- Markdown with KaTeX and code highlight exists, but streaming-repair quality unverified.

**Arena fit (a-e):** a: no. b: yes (KaTeX, highlight.js). c: unverified. d: input yes, no model selector seen. e: none.

**Verdict for DualMind:** Reference only. Smaller community, RAG-flavoured, stale compared with prompt-kit + Streamdown.

#### CopilotKit

| | |
| --- | --- |
| URL | https://www.copilotkit.ai (repo: https://github.com/CopilotKit/CopilotKit) |
| Licence / terms | MIT (README: source "available under the MIT License"). |
| Copy into a PUBLIC repo? | Yes (MIT). |
| Free vs paid | Core MIT. "CopilotKit Intelligence" (rich threads, memories, analytics) is paid, hosted or self-hosted; prices not on page. |
| Install | npm `@copilotkit/*` |
| Stack fit | React/Next.js GA, plus Angular, Vue, React Native. Agent-centric via the AG-UI protocol (generative UI, shared state, human-in-the-loop). |
| Maintenance | about 38k stars; active (release 2026-10-16). |

- Chat UI exists but is designed around agents/copilots tied to its runtime/AG-UI; a custom ASP.NET SSE backend would need an AG-UI adapter.

**Arena fit (a-e):** a: no. b-e: generic chat UI only, nothing for Arena.

**Verdict for DualMind:** Avoid. Agent framework, wrong abstraction for an anonymous side-by-side battle.

#### NLUX

| | |
| --- | --- |
| URL | https://nlux.dev (repo: https://github.com/nlkitai/nlux) |
| Licence / terms | MPL 2.0 plus added clauses: LICENSE read via gh titled "Mozilla Public License Version 2.0 With AI Training And Code Translation Restriction"; README says clauses 3.6 and 3.7 restrict use of the source as AI training data or input to code translation tools. |
| Copy into a PUBLIC repo? | Unclear / risky. Public source containing copied NLUX files would be crawlable and the extra clauses are non-standard (not OSI-standard). Using it as an unmodified npm dependency is lower risk. |
| Free vs paid | Free. |
| Install | npm `@nlux/react` (`<AiChat />`, `useChatAdapter`) |
| Stack fit | React, adapters for OpenAI, LangChain, HF; React 19 / Tailwind not stated (unverified). |
| Maintenance | about 1.4k stars; pushed 2026-10-14 (lives); no GitHub releases found. |

**Arena fit (a-e):** a: no. b: markdown yes (unverified details). c-e: none seen.

**Verdict for DualMind:** Avoid. Non-standard licence and no feature advantage.

#### Deep Chat

| | |
| --- | --- |
| URL | https://deepchat.dev (repo: https://github.com/OvidijusParsiunas/deep-chat) |
| Licence / terms | MIT. Source: repo README + metadata. |
| Copy into a PUBLIC repo? | Yes (MIT). |
| Free vs paid | Free. |
| Install | npm `deep-chat` (web component `<deep-chat>`), `deep-chat-react` wrapper |
| Stack fit | Framework-agnostic web component with its own internal styling (CSS-in-JS style props), not Tailwind/shadcn; React 19 wrapper support not stated (unverified). |
| Maintenance | about 3.7k stars; release 2.5.1 on 2026-08-27; pushed 2026-10-14. |

- Features: connect to any API, 20+ AI APIs, avatars, files, camera/mic, speech, markdown, intro panels.
- Can point at a custom endpoint with SSE streaming (unverified for your protocol shape).

**Arena fit (a-e):** a: two `<deep-chat>` elements possible but styles isolated. b: markdown yes, math/code unverified. c: basic. d: no model selector seen. e: none.

**Verdict for DualMind:** Avoid. Web component styling would not match a bespoke shadcn design.

#### OpenAI ChatKit (extra 1)

| | |
| --- | --- |
| URL | https://github.com/openai/chatkit-js (server SDK: https://github.com/openai/chatkit-python) |
| Licence / terms | Apache-2.0 for both repos (repo metadata). But README quickstart loads the UI from `cdn.platform.openai.com` using a client token from an OpenAI session endpoint, so the hosted widget itself is not the repo licence. |
| Copy into a PUBLIC repo? | Unclear: client repo Apache-2.0, but the runtime flow needs OpenAI-hosted script/session; fully self-hosted use not verified. |
| Free vs paid | Needs OpenAI API usage; backend must speak ChatKit protocol. |
| Install | npm `@openai/chatkit-react` |
| Maintenance | about 1.96k stars; @openai/chatkit-react@1.6.1 on 2026-07-31. |

**Arena fit (a-e):** none; ties you to OpenAI and a single model. Anonymous multi-vendor battle does not fit.

**Verdict for DualMind:** Avoid.

#### shadcn-chatbot-kit (extra 2)

| | |
| --- | --- |
| URL | https://shadcn-chatbot-kit.vercel.app (repo: https://github.com/blazity/shadcn-chatbot-kit) |
| Licence / terms | MIT (badge and metadata). |
| Copy into a PUBLIC repo? | Yes (MIT, keep notice). |
| Free vs paid | Free. |
| Install | shadcn CLI registry (copy-paste components) |
| Stack fit | shadcn + Tailwind; example uses AI SDK (optional). Tailwind v4 / React 19 not verified. |
| Maintenance | about 806 stars; last push 2026-02-26 (about 8 months stale). |

- Components (README): `Chat`, auto-scroll message area, message input with attachments, prompt suggestions, message actions (copy, rate response), loading states; thinking block and voice input are WIP.

**Arena fit (a-e):** a: no. b: markdown+highlight yes (unverified math). c: basic. d: input yes, no model select. e: message-action rate buttons (thumbs) as a pattern.

**Verdict for DualMind:** Reference only; prompt-kit covers more and is fresher.

#### Kibo UI AI components (extra 3, note only)

https://www.kibo-ui.com/components/ai-input now returns HTTP 308 to https://ai-sdk.dev/elements/components, i.e. the AI components were folded into AI Elements (redirect seen, not followed). Kibo repo (https://github.com/haydenbleasel/kibo, MIT, about 4k stars, last push 2026-05-04) packages list has no AI chat package, only `code-block`, `comparison`, `table`, `sandbox`, `snippet`, `spinner`, `status` etc. `comparison` (image/slider compare, assumption) and `code-block` could be worth a look. Verdict: Reference only.

#### Recommended combination for the Arena

- Streaming markdown: Streamdown (code + math plugins; skip or lazy-load mermaid), fallback react-markdown + rehype-sanitize.
- Chat chrome: copy prompt-kit `chat-container`, `message`, `prompt-input`, `loader`, `thinking-bar`, `text-shimmer`, `reasoning`, `code-block`, `feedback-bar` into the repo (MIT).
- Model selector: build own with shadcn Combobox/Select; take layout cues from AI Elements Model Selector (Apache-2.0, deprecated soon).
- Two synchronized panes and the vote bar: custom (nothing off the shelf); two panes share one SSE hook each, vote bar after both done.
- State: small custom SSE hook for the ASP.NET backend; skip AI SDK and assistant-ui unless scope grows.
