import { authSeo, readCallbackUrl, UpdatePasswordPage } from '@/features/auth';
import { pageMeta } from '@/lib/site/page-meta';
import { landingUrl } from '@/lib/supabase';

import type { Route } from './+types/update-password';

/**
 * The reset email's target, rendered in place at /update-password.html (SPA fallback, status
 * 200; never prerendered or redirected, so links already in inboxes keep working). The loader
 * reads the URL the page loaded with (landingUrl()), so it sees the #hash even when supabase-js
 * has already taken the tokens out of the address bar.
 */
export function clientLoader() {
  return { link: readCallbackUrl(landingUrl()) };
}

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: authSeo.updatePassword.title,
    description: authSeo.updatePassword.description,
    path: '/update-password.html',
    robots: 'noindex, nofollow',
  });

export default function UpdatePasswordRoute({ loaderData }: Route.ComponentProps) {
  return <UpdatePasswordPage link={loaderData.link} />;
}
