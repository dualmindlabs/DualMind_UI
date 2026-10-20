# 0001. React + Vite + React Router framework mode (SPA + prerender)

- Status: Accepted
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

The Arena is static HTML and vanilla JavaScript with CDN scripts, four copies of the Supabase client and no build step. The redesign ([design-direction.md](../redesign/design-direction.md)) needs components, a token system, accessible primitives and tests. Public pages must be fast and readable without JavaScript (SEO, first paint), app pages are client-side, and the site is served by a Cloudflare Worker with static assets: there is no Node server at request time. The waitlist app (`waitlist-worker/`) already runs React 19 + Vite + Tailwind CSS 4 on the same account.

## Decision

- **React 19.2, TypeScript (strict), Vite, Tailwind CSS 4** in `web/`.
- **React Router 8 in framework mode with `ssr: false` and `prerender`**: an explicit route table (`src/app/routes.ts`) with the exact public URLs, per-route `meta`, code splitting per route, HTML generated at build time for the listed paths, and an SPA fallback page for client-only routes.
- Vite 8, because it is what React Router's current templates use (React Router 8.5 supports Vite 7 and 8).
- Node 22 for builds (`.node-version`); React Router 8 needs at least 22.22.

## Consequences

- Prerendered pages are static files, so the Worker serves them like any other asset; nothing runs server-side per request.
- Routes must be SSR-safe at build time (no `window` during render); browser state is read with `useSyncExternalStore` and a server snapshot.
- Loaders run at build time only for prerendered paths; runtime data is fetched in the browser (TanStack Query from slice S5).
- The SPA fallback is written as `index.html` while `/` is not prerendered; `build.js` renames it (see [ADR 0002](./0002-strangler-migration-composed-dist.md)).
- Slice S1 proved the setup on Cloudflare: `/design/` is prerendered and served by the Worker on the branch preview.

## Alternatives considered

- **React Router library mode + a custom prerender script** (the waitlist's approach): works for one page, but every route would need hand-written prerendering, meta handling and code splitting. Kept as the fallback if framework mode had failed the S1 spike.
- **Next.js or Astro:** a second hosting model (Next on Workers through an adapter) or a different component model for app pages; more than the Arena needs.
- **No framework (Vite + React only):** no per-route HTML, so public pages would ship empty until JavaScript runs.
