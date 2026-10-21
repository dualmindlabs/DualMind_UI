import type { Config } from '@react-router/dev/config';

/**
 * Static output only: no runtime server. The dualmind-arena Worker (../worker.js) serves the
 * files that build.js composes into ../dist.
 *
 * - `ssr: false` + `prerender`: each listed path is rendered to HTML at build time
 *   (`/design` -> build/client/design/index.html) and hydrates in the browser.
 * - Because `/` is not prerendered yet, React Router writes its SPA fallback (the root route's
 *   HydrateFallback) to build/client/index.html. build.js renames it to dist/__spa-fallback.html
 *   so it never replaces the legacy dist/index.html; the Worker serves it for client-only routes.
 *
 * Add a path here when its slice moves a page to this app (see docs/redesign/migration-plan.md).
 */
export default {
  appDirectory: 'src/app',
  buildDirectory: 'build',
  ssr: false,
  prerender: ['/design', '/leaderboard', '/models'],
} satisfies Config;
