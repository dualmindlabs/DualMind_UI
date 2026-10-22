# src/styles

- `tokens.css`: every design token (colour for dark and light, type scale, radius, containers, motion), mapped to Tailwind utilities with `@theme inline`. The one source of truth; values from [docs/redesign/design-direction.md](../../../docs/redesign/design-direction.md) sections 3 to 6.
- `tokens.ts`: the colour and motion values as data, for the `/design/` page and the contrast tests. `tests/unit/styles/tokens.test.ts` fails if it drifts from `tokens.css`.
- `base.css`: page defaults (faint Mind A / Mind B mesh and paper grain behind the page), focus ring, selection, text wrapping, reduced motion, the display voice (`text-display`, `text-h1`, `text-h2` are Instrument Serif) and the type utilities `eyebrow`, `kicker`, `display`, `human-voice`, `numeric`, `wordmark`, plus `hit-area` for 24px / 44px pointer targets.
- `surfaces.css`: depth utilities. `surface-duel`, `surface-a`, `surface-b`, `surface-inset`, `surface-float`, `glow-a`, `glow-b`, `rule-a`, `rule-b`, `hairline-top`, `mesh-duel`, `mesh-a`, `mesh-b`, `grain`, `press`, `hover-rise`, `focus-ring-inset`. Shadows are tokens (`shadow-raise`, `shadow-lift`, `shadow-float`, `shadow-glow-a`, `shadow-glow-b`).
- `prose.css`: the `prose` utility for long text (info and legal pages): headings, lists, links, quotes, code and tables on the tokens; `not-prose` opts a block out.
- `print.css`: printing (legal pages): light tokens in any theme, no site chrome, link addresses after links.
- `app.css`: the entry that imports Tailwind and the files above.

Direction: Duel Editorial. Fonts are Instrument Serif (display), Geist (UI and body) and Geist Mono (data and code), self-hosted with Fontsource; Midnight is dark, Paper is light; Mind A is cyan, Mind B terracotta, the human is champagne gold.

`tokens.css` also maps shadcn/ui's colour names (`background`, `foreground`, `primary`, `border`, `ring`...) onto the tokens, so registry and vendored code renders in our palette, and defines derived interaction tokens (`--hover`, `--pressed`, `--surface-3`, `--scrim`).

**Rules:** components never use hex values or the default Tailwind palette (it is switched off); a new colour is a new token in both themes, with its contrast checked in `tokens.ts`.

Owner: @harshbhx
