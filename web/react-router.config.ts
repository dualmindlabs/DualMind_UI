import type { Config } from '@react-router/dev/config';

/**
 * Static output only: no runtime server. The dualmind-arena Worker (../worker.js) serves the
 * files that build.js composes into ../dist.
 *
 * - `ssr: false` + `prerender`: each listed path is rendered to HTML at build time
 *   (`/design` -> build/client/design/index.html) and hydrates in the browser.
 * - `/` is prerendered (the landing page, slice S3), so React Router writes its SPA fallback (the
 *   root route's HydrateFallback) to build/client/__spa-fallback.html; build.js copies it to
 *   dist/ and the Worker serves it for client-only routes. The landing page is dist/index.html
 *   (the classic arena is gone).
 *
 * Add a path here when its slice moves a page to this app (see docs/redesign/migration-plan.md).
 * Client-only routes (/update-password.html, /auth-callback.html, /share/<id>, /settings/) are
 * not listed: the Worker answers them with the SPA fallback (server/routing.js,
 * SPA_FALLBACK_ROUTES).
 */
export default {
  appDirectory: 'src/app',
  buildDirectory: 'build',
  ssr: false,
  prerender: [
    '/',
    '/design',
    '/leaderboard',
    '/models',
    '/about',
    '/credits',
    '/how-it-works',
    '/faq',
    '/privacy',
    '/terms',
    '/cookies',
    // The API reference (BE-5), rendered from docs/api/openapi.v2.json.
    '/developers',
    // Sign-in (slice S6). /update-password.html and /auth-callback.html are client-only.
    '/login',
    '/signup',
    '/forgot-password',
    // The splat route renders the 404 page; build.js turns 404/index.html into dist/404.html.
    '/404',
  ],
} satisfies Config;
