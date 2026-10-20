# src/components/vendor

Third-party component code copied into this repository, one folder per source. Every piece is listed in the inventory in [docs/redesign/licences.md](../../../../docs/redesign/licences.md) and credited in [`src/content/credits.ts`](../../content/credits.ts).

| Folder | Source | Licence | Licence file |
| --- | --- | --- | --- |
| `reactbits/` | [React Bits](https://reactbits.dev) | MIT + Commons Clause | `LICENSE.md` |
| `magicui/` | [Magic UI](https://magicui.design) | MIT | `LICENSE.md` |
| `motion-primitives/` | [Motion Primitives](https://motion-primitives.com) | MIT | `LICENSE.md` |
| `aceternity/` | [Aceternity UI](https://ui.aceternity.com) (free tier) | Custom | `LICENSE-NOTES.md` |

**Rules**

- **One folder per source**, named after it in kebab-case; file names in kebab-case, named exports only.
- **A licence file is required** in every folder: `LICENSE.md` with the source's copyright and licence text, copied verbatim (Prettier skips it), or `LICENSE-NOTES.md` for sources with custom terms (the licence link, the restriction, the component list, the check date, and the note that the files are never published as a kit).
- **Every file starts with the header comment** below. `tests/unit/components/vendor/vendor-folders.test.ts` fails without it.
- **Never copy** paid or Pro code (Aceternity Pro, Magic UI Pro, Kokonut Pro, Cult UI paid blocks...), anything from shadcnblocks, or AGPL code (Origin UI / coss ui). See [docs/redesign/licences.md](../../../../docs/redesign/licences.md) and [ADR 0003](../../../../docs/adr/0003-shadcn-base-ui-and-vendored-effects.md).
- **Ported, not pasted:** colours from tokens (`--mind-a`, `text-muted`...), never hex; reduced motion through `useShouldReduceMotion()`; decorative layers `aria-hidden`; text effects keep the real text for screen readers (a visually hidden copy, with the animated pieces hidden); props we do not use are removed.
- **WebGL effects** take `paused` and `maxDpr` props and are only rendered through `components/motion/webgl-gate.tsx`, loaded with `React.lazy`.
- **Motion:** use `m.*` components (the small build) and render them inside `components/motion/motion-provider.tsx`; prefer CSS keyframes (`styles/effects.css`) for loops that need no JavaScript.

## Header template

```tsx
/**
 * <Component name>, from <Source> (<author, if the source names one>).
 * Source: <registry or page URL> (copied YYYY-MM-DD)
 * Licence: <licence> (see ./LICENSE.md or ./LICENSE-NOTES.md).
 * Our changes:
 * - <what changed and why: tokens, reduced motion, accessibility, removed props...>
 */
```

## Adding a component

1. Check the licence page of the source on the day you copy (paid or Pro: stop).
2. Fetch the free registry JSON with `curl`, not `npx shadcn add`: React Bits `https://reactbits.dev/r/<Name>-TS-TW.json`, Magic UI `https://magicui.design/r/<name>.json`, Motion Primitives `https://motion-primitives.com/c/<name>.json`, Aceternity UI `https://ui.aceternity.com/registry/<name>.json`.
3. Save it as `<source>/<kebab-name>.tsx`, add the header, port it (rules above), and add any new npm dependency to `web/package.json` (the `web-lockfile` workflow resolves the lockfile).
4. Add a row to the inventory in `docs/redesign/licences.md`, the name to `uses` in `src/content/credits.ts`, and a frame to the `/design/` effects gallery (`features/design-system/lib/effects.ts`).
5. For a new source: a new folder with its licence file, a credit entry and a row in the table above.

Owner: @harshbhx
