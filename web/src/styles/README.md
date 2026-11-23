# src/styles

- `tokens.css`: every design token (colour for dark and light, type scale, radius, containers, motion), mapped to Tailwind utilities with `@theme inline`. The one source of truth; values from [docs/redesign/design-direction.md](../../../docs/redesign/design-direction.md) sections 3 to 6.
- `tokens.ts`: the colour and motion values as data, for the `/design/` page and the contrast tests. `tests/unit/styles/tokens.test.ts` fails if it drifts from `tokens.css`.
- `base.css`: page defaults (a faint Mind A / Mind B mesh and fine grain behind the page), focus ring, selection, text wrapping, reduced motion, Geist display styling for `text-display`/`text-h1`/`text-h2`, and the type utilities `eyebrow`, `kicker`, `display`, `human-voice`, `numeric`, `wordmark`, `bg-grid`, plus `hit-area` for 24px / 44px pointer targets.
- `surfaces.css`: depth utilities. `surface-duel`, `surface-a`, `surface-b`, `surface-inset`, `surface-float`, `glow-a`, `glow-b`, `rule-a`, `rule-b`, `hairline-top`, `mesh-duel`, `mesh-a`, `mesh-b`, `grain`, `press`, `hover-rise`, `focus-ring-inset`. Shadows are tokens (`shadow-raise`, `shadow-lift`, `shadow-float`, `shadow-glow-a`, `shadow-glow-b`).
- `prose.css`: the `prose` utility for long text (info and legal pages): headings, lists, links, quotes, code and tables on the tokens; `not-prose` opts a block out.
- `print.css`: printing (legal pages): light tokens in any theme, no site chrome, link addresses after links.
- `app.css`: the entry that imports Tailwind and the files above.

Direction: Instrument. Fonts are Geist (display, UI and body) and Geist Mono (data and code), self-hosted with Fontsource; Midnight is dark, Paper is light; Mind A is cyan, Mind B terracotta, the human is mint green.

`tokens.css` also maps shadcn/ui's colour names (`background`, `foreground`, `primary`, `border`, `ring`...) onto the tokens, so registry and vendored code renders in our palette, and defines derived interaction tokens (`--hover`, `--pressed`, `--surface-3`, `--scrim`).

**Rules:** components never use hex values or the default Tailwind palette (it is switched off); a new colour is a new token in both themes, with its contrast checked in `tokens.ts`.

Owner: @harshbhx
