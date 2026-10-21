import { useLocation } from 'react-router';

import { config } from '@/config/env';
import { redirectFromSearch } from '@/lib/supabase';

/**
 * Where to go after signing in: the page's validated `?redirect=` (same origin, path only) or
 * `/`, which hands signed-in visitors to the arena. Works while prerendering too.
 */
export function useRedirectTarget(): string {
  const { search } = useLocation();
  return redirectFromSearch(search, config.siteUrl);
}

/** Leaves the web app's router: `/` must load as a document so its hand-off script runs. */
export function goTo(target: string): void {
  window.location.assign(target);
}
