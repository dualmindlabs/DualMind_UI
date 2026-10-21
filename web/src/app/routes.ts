import { index, route, type RouteConfig } from '@react-router/dev/routes';

/**
 * The explicit route table: every URL this app serves, mapped to a thin route module in
 * src/app/routes/. Paths are the exact public URLs, so legacy links keep working as pages move here.
 * Prerendered paths are listed in react-router.config.ts; the rest of the site is still served by
 * the legacy files in the repo root until their slice lands (docs/redesign/migration-plan.md).
 */
export default [
  // The landing page (signed out); signed-in visitors are handed to the legacy arena (S3).
  index('routes/home.tsx'),
  // Living style guide (noindex).
  route('design', 'routes/design.tsx'),
  // Live rankings and the model directory (slice S7), from the public model-stats API.
  route('leaderboard', 'routes/leaderboard.tsx'),
  route('models', 'routes/models.tsx'),

  // Info and legal pages (slice S4).
  route('about', 'routes/about.tsx'),
  route('how-it-works', 'routes/how-it-works.tsx'),
  route('faq', 'routes/faq.tsx'),
  route('privacy', 'routes/privacy.tsx'),
  route('terms', 'routes/terms.tsx'),
  route('cookies', 'routes/cookies.tsx'),

  // Anything else: the 404 page. Prerendered as /404 (build.js moves it to dist/404.html, which
  // the Worker serves with status 404); this entry also covers client-side navigation.
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
