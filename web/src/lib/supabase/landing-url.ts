/**
 * The URL the page was loaded with, recorded when the app's code first runs (this module is in
 * the root bundle, through the auth store), before supabase-js reads and clears the tokens in the
 * #hash and before the router settles. Email links and OAuth returns always arrive with a full
 * page load, so the routes that read them (/auth-callback.html, /update-password.html) use this
 * snapshot rather than the live address, which may already be cleaned up by then.
 */

export interface UrlSnapshot {
  pathname: string;
  search: string;
  hash: string;
}

const snapshot: UrlSnapshot | null =
  typeof window === 'undefined'
    ? null
    : {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      };

/** The load-time URL, or the live one after a client-side move to another path. */
export function landingUrl(): UrlSnapshot {
  const current = window.location;
  return snapshot && snapshot.pathname === current.pathname ? snapshot : current;
}
