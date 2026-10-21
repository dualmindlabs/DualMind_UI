import { AuthCallbackPage, authSeo, readCallbackUrl, recoveryForward } from '@/features/auth';
import { pageMeta } from '@/lib/site/page-meta';
import { landingUrl } from '@/lib/supabase';

import type { Route } from './+types/auth-callback';

/**
 * Where confirmation and sign-in emails land, rendered in place at /auth-callback.html (SPA
 * fallback, status 200). The loader reads the URL the page loaded with (landingUrl()), which
 * still has the #hash even if supabase-js has already cleaned up the address bar:
 * - a recovery link goes on to /update-password.html with its query and #hash (a full load, so
 *   that page's own loader and client see the tokens);
 * - anything else is read once here and handed to the page.
 */
export function clientLoader() {
  const url = landingUrl();
  const forward = recoveryForward(url);
  if (forward) {
    window.location.replace(forward);
    // Never resolves: the page is being replaced.
    return new Promise<never>(() => {});
  }
  return { link: readCallbackUrl(url) };
}

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: authSeo.callback.title,
    description: authSeo.callback.description,
    path: '/auth-callback.html',
    robots: 'noindex, nofollow',
  });

export default function AuthCallbackRoute({ loaderData }: Route.ComponentProps) {
  return <AuthCallbackPage link={loaderData.link} />;
}
