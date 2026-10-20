# src/hooks

React hooks shared by more than one feature.

- `use-theme.ts`: the stored theme preference (system, dark or light) and a setter.
- `use-reduced-motion.ts`: true while the visitor asks for reduced motion, updated live.
- `use-should-reduce-motion.ts`: what effects read: the OS setting or a surrounding `ReducedMotionScope` (components/motion), whichever asks for less motion.
- `use-hydrated.ts`: false during the prerender and hydration, true afterwards.
- `use-in-view.ts`: true while an element is in the viewport (IntersectionObserver, with a fallback).
- `use-page-visible.ts`: false while the tab is hidden.
- `use-scrolled.ts`: true once the page has scrolled past a threshold (the header condenses).
- `use-modifier-key.ts`: `Cmd` on Apple platforms, `Ctrl` elsewhere, for shortcut hints.
- `use-command-palette.ts`: the command palette's state, and `useCommandPaletteGroup()` for features to add their own commands.

**Rules:** file names `use-*.ts`, one hook per file, exported as `useX`. SSR-safe: hooks read browser APIs through `useSyncExternalStore` with a server snapshot, because pages are prerendered. Tests live in `tests/unit/hooks/`.

Owner: @harshbhx
