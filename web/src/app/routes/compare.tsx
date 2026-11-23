import { COMPARE_SEO, ComparePage } from '@/features/compare';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/compare';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: COMPARE_SEO.title,
    description: COMPARE_SEO.description,
    path: COMPARE_SEO.path,
    robots: COMPARE_SEO.robots,
  });

/**
 * `/compare/` and `/compare/<shareId>`: client-only (the Worker answers with the SPA fallback,
 * status 200, noindex; SPA_FALLBACK_ROUTES in server/routing.js), never prerendered.
 */
export default function CompareRoute() {
  return <ComparePage />;
}
