# src/lib

Framework-free code shared across features: plain TypeScript, no React components.

- `utils/`: small helpers (`cn()` for class names, WCAG contrast maths).
- `theme/`: the theme preference store and the inline script that applies it before the first paint.
- `api/`: the typed API client (slice S5; a placeholder today).
- `supabase/`: the Supabase client and session helpers (slice S6; a placeholder today).

**Rules:** no imports from `src/features`; every module is unit-tested in `tests/unit/lib/`.

Owner: @harshbhx
