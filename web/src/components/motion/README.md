# src/components/motion

Our own motion wrappers, the pieces that make effects safe to use: a reduced-motion gate (renders the still version when `useReducedMotion()` is true and remounts the effect when the setting flips) and the WebGL gate with a static poster fallback (phones, low memory, Save-Data, no WebGL2). Empty in slice S1; slice S2 adds them.

Third-party effect code does not go here: it lives in `components/vendor/<source>/` with its licence (see `vendor/README.md`).

**Rules**

- Every effect has a still version and reads `useReducedMotion()` (`@/hooks/use-reduced-motion`).
- Animate only `transform`, `opacity` and `filter`; at most one WebGL background per page, never behind the answer panes.

Owner: @harshbhx
