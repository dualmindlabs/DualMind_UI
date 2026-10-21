/**
 * Where to send someone after they sign in (`?redirect=`), and the sign-in URL for a page that
 * needs a session. The same rule as the legacy js/auth-modern.js: only a path on this origin,
 * default `/`. Absolute URLs to other sites, protocol-relative `//host`, backslash tricks,
 * `javascript:` and the sign-in pages themselves (a loop) all fall back to `/`.
 */

export const DEFAULT_REDIRECT = '/';

export const LOGIN_PATH = '/login/';
export const SIGNUP_PATH = '/signup/';
export const FORGOT_PASSWORD_PATH = '/forgot-password/';
export const UPDATE_PASSWORD_PATH = '/update-password.html';
export const AUTH_CALLBACK_PATH = '/auth-callback.html';

/** Pages a redirect must never point back to: they would loop or replay an email link. */
const AUTH_PAGES = [
  '/login',
  '/login-modern.html',
  '/signup',
  '/signup-modern.html',
  '/forgot-password',
  '/forgot-password.html',
  UPDATE_PASSWORD_PATH,
  AUTH_CALLBACK_PATH,
];

function isAuthPage(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return AUTH_PAGES.some(page => path === page || path.startsWith(`${page}/`));
}

/**
 * The redirect target as a same-origin path (`/path?query#hash`), or `/`.
 * @param raw the `redirect` query value (already URL-decoded by URLSearchParams)
 * @param origin this site's origin, e.g. `window.location.origin`
 */
export function safeRedirect(raw: string | null | undefined, origin: string): string {
  if (typeof raw !== 'string') return DEFAULT_REDIRECT;
  const value = raw.trim();
  // Only site-relative paths. Rejects absolute URLs, `//host` and `/\host` (browsers treat a
  // backslash like a slash), and control characters that some parsers strip.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_REDIRECT;
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return DEFAULT_REDIRECT;
  let target: URL;
  try {
    target = new URL(value, origin);
  } catch {
    return DEFAULT_REDIRECT;
  }
  if (target.origin !== new URL(origin).origin) return DEFAULT_REDIRECT;
  if (isAuthPage(target.pathname)) return DEFAULT_REDIRECT;
  return `${target.pathname}${target.search}${target.hash}`;
}

/** The redirect target from a query string (`?redirect=`), validated. */
export function redirectFromSearch(search: string, origin: string): string {
  return safeRedirect(new URLSearchParams(search).get('redirect'), origin);
}

/** `/login/` with `?redirect=<path>` (omitted for `/`), for pages that need a session. */
export function loginUrl(redirectTo: string, origin: string, base: string = LOGIN_PATH): string {
  const target = safeRedirect(redirectTo, origin);
  return target === DEFAULT_REDIRECT ? base : `${base}?redirect=${encodeURIComponent(target)}`;
}

/** Carries a validated `?redirect=` over to another auth page (login <-> sign-up). */
export function withRedirect(path: string, search: string, origin: string): string {
  const target = redirectFromSearch(search, origin);
  return target === DEFAULT_REDIRECT ? path : `${path}?redirect=${encodeURIComponent(target)}`;
}
