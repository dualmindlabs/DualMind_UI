import { PRIVATE_ARENA_SEO, PrivateArenaPage } from '@/features/private-arena';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/private';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: PRIVATE_ARENA_SEO.title,
    description: PRIVATE_ARENA_SEO.description,
    path: PRIVATE_ARENA_SEO.path,
    robots: PRIVATE_ARENA_SEO.robots,
  });

/**
 * `/private/` (cycle 2, flag off by default): run blind battles on your own prompt set and read
 * your own board. Client-only like /settings/ (the Worker answers with the SPA fallback, status
 * 200 and `X-Robots-Tag: noindex`; SPA_FALLBACK_ROUTES in server/routing.js), never prerendered.
 */
export default function PrivateRoute() {
  return <PrivateArenaPage />;
}
