# src/lib

Framework-free code shared across features: plain TypeScript, no React components.

- `utils/`: small helpers (`cn()` for class names, WCAG contrast maths, `css-color.ts` to read colour tokens for canvas and WebGL effects).
- `theme/`: the theme preference store and the inline script that applies it before the first paint.
- `motion/`: `webgl-policy.ts`, when a WebGL effect may run (reduced motion, Save-Data, memory, touch-first small screens, WebGL2).
- `api/`: the typed API client (slice S5): endpoints, schemas, errors, SSE, the vote queue, the mock adapter and TanStack Query bindings. See its README.
- `supabase/`: the Supabase client and session helpers (slice S6; a placeholder today).

**Rules:** no imports from `src/features`; every module is unit-tested in `tests/unit/lib/`.

Owner: @harshbhx
