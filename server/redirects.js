// Permanent redirects for legacy URLs, as data (docs/architecture.md, "Redirects").
// Each row is tested in web/tests/worker/redirects.test.ts and checked end to end.
//
//   from   the path to match
//   match  'exact'   only that path
//          'folder'  the path itself, with a trailing slash, and anything below it
//                    (/careers, /careers/, /careers/team)
//   to     where it goes; the query string is kept (the browser keeps the #hash)
//
// Supabase email targets (/auth-callback.html, /update-password.html) are never redirected: they
// render in place (SPA_FALLBACK_ROUTES in server/routing.js). Only their clean forms move there.

/** @typedef {{ from: string, match: 'exact' | 'folder', to: string, reason: string }} RedirectRule */

/** @type {readonly RedirectRule[]} */
export const LEGACY_REDIRECTS = [
  { from: '/index.html', match: 'exact', to: '/', reason: 'One URL for the home page' },
  {
    from: '/about/about',
    match: 'folder',
    to: '/about/',
    reason: 'Duplicate copy of the about page',
  },
  {
    from: '/how-it-works/how-it-works',
    match: 'folder',
    to: '/how-it-works/',
    reason: 'Duplicate copy of the how-it-works page',
  },
  {
    from: '/careers',
    match: 'folder',
    to: '/about/',
    reason: 'The copied careers page was removed (PR #20)',
  },
  {
    from: '/auth-verify.html',
    match: 'exact',
    to: '/',
    reason: 'Developer diagnostics page, not for visitors',
  },
  { from: '/verify.html', match: 'exact', to: '/', reason: 'Developer diagnostics page' },
  // Slice S6: sign-in pages on clean canonical paths. The query is kept, so ?redirect= survives.
  { from: '/login-modern.html', match: 'exact', to: '/login/', reason: 'Old sign-in page' },
  { from: '/login-modern', match: 'exact', to: '/login/', reason: 'Old sign-in page, clean URL' },
  { from: '/login/index.html', match: 'exact', to: '/login/', reason: 'One URL for sign-in' },
  {
    from: '/login/login',
    match: 'folder',
    to: '/login/',
    reason: 'Third copy of the sign-in page (and its redirect.html)',
  },
  { from: '/signup-modern.html', match: 'exact', to: '/signup/', reason: 'Old sign-up page' },
  { from: '/signup-modern', match: 'exact', to: '/signup/', reason: 'Old sign-up page, clean URL' },
  {
    from: '/forgot-password.html',
    match: 'exact',
    to: '/forgot-password/',
    reason: 'Old password reset request page',
  },
  {
    from: '/auth-callback',
    match: 'exact',
    to: '/auth-callback.html',
    reason: 'Clean URL of the email callback; the page itself stays at .html',
  },
  {
    from: '/update-password',
    match: 'exact',
    to: '/update-password.html',
    reason: 'Clean URL of the reset page; the page itself stays at .html',
  },
];

/**
 * @param {string} pathname
 * @param {readonly RedirectRule[]} [rules]
 * @returns {RedirectRule | undefined}
 */
export function findRedirect(pathname, rules = LEGACY_REDIRECTS) {
  return rules.find(rule =>
    rule.match === 'exact'
      ? pathname === rule.from
      : pathname === rule.from || pathname.startsWith(`${rule.from}/`),
  );
}

/**
 * A 301 to the rule's target on the same origin, keeping the query string, or null.
 * @param {URL} url
 * @param {readonly RedirectRule[]} [rules]
 * @returns {Response | null}
 */
export function redirectResponse(url, rules = LEGACY_REDIRECTS) {
  const rule = findRedirect(url.pathname, rules);
  if (!rule) {
    return null;
  }
  const target = new URL(rule.to, url);
  target.search = url.search;
  return new Response(null, { status: 301, headers: { Location: target.toString() } });
}
