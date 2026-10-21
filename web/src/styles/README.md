# src/styles

- `tokens.css`: every design token (colour for dark and light, type scale, radius, containers, motion), mapped to Tailwind utilities with `@theme inline`. The one source of truth; values from [docs/redesign/design-direction.md](../../../docs/redesign/design-direction.md) sections 3 to 6.
- `tokens.ts`: the colour and motion values as data, for the `/design/` page and the contrast tests. `tests/unit/styles/tokens.test.ts` fails if it drifts from `tokens.css`.
- `base.css`: page defaults, focus ring, selection, text wrapping, reduced motion, and shared utilities (`eyebrow`, `human-voice`, `wordmark`, `hit-area` for 24px / 44px pointer targets).
- `prose.css`: the `prose` utility for long text (info and legal pages): headings, lists, links, quotes, code and tables on the tokens; `not-prose` opts a block out.
- `print.css`: printing (legal pages): light tokens in any theme, no site chrome, link addresses after links.
- `app.css`: the entry that imports Tailwind and the files above.

`tokens.css` also maps shadcn/ui's colour names (`background`, `foreground`, `primary`, `border`, `ring`...) onto the tokens, so registry and vendored code renders in our palette, and defines derived interaction tokens (`--hover`, `--pressed`, `--surface-3`, `--scrim`).

**Rules:** components never use hex values or the default Tailwind palette (it is switched off); a new colour is a new token in both themes, with its contrast checked in `tokens.ts`.

Owner: @harshbhx
