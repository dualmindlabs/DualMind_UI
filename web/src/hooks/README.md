# src/hooks

React hooks shared by more than one feature.

- `use-theme.ts`: the stored theme preference (system, dark or light) and a setter.
- `use-reduced-motion.ts`: true while motion should be reduced: the OS setting, unless the motion setting on `/settings/` overrides it (`reduce` or `allow`), both followed live; `useSystemReducedMotion()` is the OS setting alone.
- `use-motion-preference.ts`: the stored motion override (`system`, `reduce` or `allow`, `lib/motion/motion-preference.ts`) and a setter.
- `use-should-reduce-motion.ts`: what effects read: the OS setting or a surrounding `ReducedMotionScope` (components/motion), whichever asks for less motion.
- `use-hydrated.ts`: false during the prerender and hydration, true afterwards.
- `use-in-view.ts`: true while an element is in the viewport (IntersectionObserver, with a fallback).
- `use-page-visible.ts`: false while the tab is hidden.
- `use-scrolled.ts`: true once the page has scrolled past a threshold (the header condenses).
- `use-media-query.ts`: true while a media query matches, followed live (the leaderboard's table or cards, the arena's sidebar or drawer).
- `use-modifier-key.ts`: `Cmd` on Apple platforms, `Ctrl` elsewhere, for shortcut hints.
- `use-api-client.ts`: the app's API client from `ApiProvider` (components/layout), for the query builders in `@/lib/api`.
- `use-auth.ts`: the auth state from `AuthProvider` (components/layout): status, session, user, profile, `client()` and `signOut()`.
- `use-require-auth.ts`: the route guard for pages that need a session (`/settings/`): sign-in redirect with the loop guard; signing out on the page goes to `/` instead.
- `use-command-palette.ts`: the command palette's state, and `useCommandPaletteGroup()` for features to add their own commands.

**Rules:** file names `use-*.ts`, one hook per file, exported as `useX`. SSR-safe: hooks read browser APIs through `useSyncExternalStore` with a server snapshot, because pages are prerendered. Tests live in `tests/unit/hooks/`.

Owner: @harshbhx
