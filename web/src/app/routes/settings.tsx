import { SETTINGS_SEO, SettingsPage } from '@/features/settings';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/settings';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: SETTINGS_SEO.title,
    description: SETTINGS_SEO.description,
    path: SETTINGS_SEO.path,
    robots: SETTINGS_SEO.robots,
  });

/**
 * `/settings/` (slice S12), signed in only: client-only (the Worker answers with the SPA
 * fallback, status 200 and `X-Robots-Tag: noindex`; SPA_FALLBACK_ROUTES in server/routing.js),
 * never prerendered. Signed-out visitors go to `/login/?redirect=%2Fsettings%2F`.
 */
export default function SettingsRoute() {
  return <SettingsPage />;
}
