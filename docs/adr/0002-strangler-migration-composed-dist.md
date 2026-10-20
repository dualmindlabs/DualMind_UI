# 0002. Strangler migration with a composed dist/

- Status: Accepted
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

Rewriting every Arena page before shipping anything would freeze the product for weeks and make one huge, unreviewable change. Every URL that works today must keep working (links in emails, search results, Supabase redirect targets). The Worker serves a single assets directory, `dist/`.

## Decision

- Old and new pages live side by side in **one `dist/`, composed by `build.js`**: the legacy allowlist first, then `web/build/client` on top.
- Each slice moves a set of URLs to the React app. A web file may replace a legacy file only when its slice lists it in `replacedByWeb` in `build.js`; otherwise the build fails.
- The SPA fallback is stored as `dist/__spa-fallback.html` and served by the Worker only for routes listed in `SPA_FALLBACK_ROUTES` (`server/routing.js`).
- `build.js` fails when a legacy file or a sitemap URL is missing from `dist/`, or when a file in `assets/` has no content hash (so caching stays correct).
- Production visitors stay on the waitlist (`FORCE_WAITLIST`) during the migration; reviewers use the preview cookie.

## Consequences

- Every slice is a small PR that can merge to `master` on its own.
- During the migration the site mixes two looks; the gate hides that from visitors.
- `build.js` carries the composition logic until the cutover (slice S13), when `dist/` becomes `web/build/client` alone and the overlay goes away.
- New hashed files share `dist/assets/` with legacy images; the hash pattern keeps their cache rules apart.

## Alternatives considered

- **Big-bang rewrite:** one risky switch, no feedback until the end.
- **Two Workers or a path prefix for the new app (`/next/...`):** would change URLs or need cross-Worker routing; the composed `dist/` keeps one origin and one Worker.
