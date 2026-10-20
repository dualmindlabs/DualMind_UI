# src/hooks

React hooks shared by more than one feature.

- `use-theme.ts`: the stored theme preference (system, dark or light) and a setter.
- `use-reduced-motion.ts`: true while the visitor asks for reduced motion, updated live.

**Rules:** file names `use-*.ts`, one hook per file, exported as `useX`. SSR-safe: hooks read browser APIs through `useSyncExternalStore` with a server snapshot, because pages are prerendered. Tests live in `tests/unit/hooks/`.

Owner: @harshbhx
