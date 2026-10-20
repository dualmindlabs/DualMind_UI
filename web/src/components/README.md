# src/components

Shared React components used by more than one feature.

- `ui/`: the UI kit, shadcn/ui primitives on Base UI adapted to our tokens (see `ui/README.md`). No barrel file: import each one from its own file (`@/components/ui/button`).
- `layout/`: the shell: `SiteHeader` (marketing and app variants), `SiteNav`, `MobileNav`, `SiteFooter`, `CommandPalette` with its provider and trigger, `AppProviders` (mounted in the root), `PageContainer`, `PageSection`, `SkipLink`, `ThemeToggle`, `Wordmark`, `Emblem` and the theme script.
- `motion/`: our motion wrappers: `MotionProvider`, `ReducedMotionScope`, `MotionSafe`, `Reveal`, `WebGLGate` with its posters, and the motion presets; see `motion/README.md`.
- `vendor/`: third-party component code, one folder per source (`reactbits/`, `magicui/`, `motion-primitives/`, `aceternity/`), each with its licence file; see `vendor/README.md`.

**Rules:** one component per file, kebab-case file names, PascalCase named exports, no default exports, colours and sizes only through the token utilities from `src/styles/tokens.css`.

Owner: @harshbhx
