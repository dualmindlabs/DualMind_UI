# src/components

Shared React components used by more than one feature.

- `ui/`: the UI kit, shadcn/ui primitives on Base UI adapted to our tokens (see `ui/README.md`). No barrel file: import each one from its own file (`@/components/ui/button`).
- `layout/`: the shell: `SiteHeader` (marketing and app variants), `SiteNav`, `MobileNav`, `SiteFooter`, `CommandPalette` with its provider and trigger (loaded after hydration by `DeferredCommandPalette`; `DeferredToaster` does the same for the toaster), `ApiProvider` (one API client and one TanStack Query cache; the client sends the signed-in user's token), `AuthProvider` (the auth store, read with `useAuth()`), `AppProviders` (mounted in the root; it includes both), `PageContainer`, `PageSection`, `SkipLink`, `ThemeToggle`, `Wordmark`, `Emblem`, the theme script and the landing page's signed-in hand-off script (`SessionHandoffScript`, rendered in `<head>` for routes whose `handle` asks for it).
- `motion/`: our motion wrappers: `MotionProvider`, `ReducedMotionScope`, `MotionSafe`, `Reveal`, `WebGLGate` with its posters, and the motion presets; see `motion/README.md`.
- `vendor/`: third-party component code, one folder per source (`reactbits/`, `magicui/`, `motion-primitives/`, `aceternity/`), each with its licence file; see `vendor/README.md`.

**Rules:** one component per file, kebab-case file names, PascalCase named exports, no default exports, colours and sizes only through the token utilities from `src/styles/tokens.css`.

Owner: @harshbhx
