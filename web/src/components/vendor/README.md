# src/components/vendor

Third-party component code copied into this repository, one folder per source: `reactbits/`, `magicui/`, `motion-primitives/`, `aceternity/`, `prompt-kit/`... Empty in slice S1; slice S2 adds the first pieces.

**Rules**

- **One folder per source**, named after it in kebab-case.
- **A licence file is required** in every folder: `LICENSE.md` with the source's copyright and licence text (MIT, Apache-2.0, MIT + Commons Clause...), or `LICENSE-NOTES.md` for sources with custom terms (Aceternity UI: link to the licence, the list of components used, and the note that they are never published as a kit).
- **Every file starts with a header comment** naming the source URL and what we changed (ported to TypeScript, tokens instead of hex, reduced-motion support...).
- **Inventory:** every vendored component is listed in `docs/redesign/licences.md`.
- **Never copy** paid or Pro code (Aceternity Pro, Magic UI Pro, Kokonut Pro, Cult UI paid blocks...), anything from shadcnblocks, or AGPL code (Origin UI / coss ui). See [docs/redesign/component-catalog.md](../../../../docs/redesign/component-catalog.md#2-licence-rules-for-this-repository) and [ADR 0003](../../../../docs/adr/0003-shadcn-base-ui-and-vendored-effects.md).
- Vendored code uses our tokens and respects reduced motion; app code uses it through a wrapper in `components/motion/` or a feature component, not directly from many places.

Owner: @harshbhx
