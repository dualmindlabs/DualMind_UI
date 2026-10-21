import type { Config } from '@react-router/dev/config';

/**
 * Static output only: no runtime server. The dualmind-arena Worker (../worker.js) serves the
 * files that build.js composes into ../dist.
 *
 * - `ssr: false` + `prerender`: each listed path is rendered to HTML at build time
 *   (`/design` -> build/client/design/index.html) and hydrates in the browser.
 * - `/` is prerendered (the landing page, slice S3), so React Router writes its SPA fallback (the
 *   root route's HydrateFallback) to build/client/__spa-fallback.html; build.js copies it to
 *   dist/ and the Worker serves it for client-only routes. The landing page replaces the legacy
 *   dist/index.html, whose copy lives on as dist/legacy-app.html until the arena slice (S8).
 *
 * Add a path here when its slice moves a page to this app (see docs/redesign/migration-plan.md).
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
    '/how-it-works',
    '/faq',
    '/privacy',
    '/terms',
    '/cookies',
    // The splat route renders the 404 page; build.js turns 404/index.html into dist/404.html.
    '/404',
  ],
} satisfies Config;
