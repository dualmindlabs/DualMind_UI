# src/styles

- `tokens.css`: every design token (colour for dark and light, type scale, radius, containers, motion), mapped to Tailwind utilities with `@theme inline`. The one source of truth; values from [docs/redesign/design-direction.md](../../../docs/redesign/design-direction.md) sections 3 to 6.
- `tokens.ts`: the colour and motion values as data, for the `/design/` page and the contrast tests. `tests/unit/styles/tokens.test.ts` fails if it drifts from `tokens.css`.
- `base.css`: page defaults, focus ring, selection, text wrapping, reduced motion, and shared utilities (`eyebrow`, `human-voice`, `wordmark`).
- `app.css`: the entry that imports Tailwind and the files above.

**Rules:** components never use hex values or the default Tailwind palette (it is switched off); a new colour is a new token in both themes, with its contrast checked in `tokens.ts`.

Owner: @harshbhx
