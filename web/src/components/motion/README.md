# src/components/motion

Animated effects and the wrappers that make them safe to use. Empty in slice S1; slice S2 adds the first pieces.

**Layout**

- One folder per source: `reactbits/`, `magicui/`, `motion-primitives/`, `aceternity/`... Each keeps its licence text (`LICENSE.md`, or `LICENSE-NOTES.md` for Aceternity) and every file starts with a comment naming the source URL and what we changed. Licence rules: [docs/redesign/component-catalog.md](../../../../docs/redesign/component-catalog.md#2-licence-rules-for-this-repository) and [ADR 0003](../../../../docs/adr/0003-shadcn-base-ui-and-vendored-effects.md).
- Wrappers at the top level of this folder, such as a reduced-motion gate and the WebGL gate with a poster fallback.

**Rules**

- Every effect reads `useReducedMotion()` (`@/hooks/use-reduced-motion`) and has a still version.
- Animate only `transform`, `opacity` and `filter`; at most one WebGL background per page.

Owner: @harshbhx
