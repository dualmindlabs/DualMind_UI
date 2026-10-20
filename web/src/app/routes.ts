import { route, type RouteConfig } from '@react-router/dev/routes';

/**
 * The explicit route table: every URL this app serves, mapped to a thin route module in
 * src/routes/. Paths are the exact public URLs, so legacy links keep working as pages move here.
 * Prerendered paths are listed in react-router.config.ts; the rest of the site is still served by
 * the legacy files in the repo root until their slice lands (docs/redesign/migration-plan.md).
 */
export default [
  // Living style guide (noindex).
  route('design', '../routes/design.tsx'),
] satisfies RouteConfig;
