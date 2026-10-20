// Permanent redirects for legacy URLs, as data (docs/architecture.md, "Redirects").
// Each row is tested in web/tests/worker/redirects.test.ts and checked end to end.
//
//   from   the path to match
//   match  'exact'   only that path
//          'folder'  the path itself, with a trailing slash, and anything below it
//                    (/careers, /careers/, /careers/team)
//   to     where it goes; the query string is kept (the browser keeps the #hash)
//
// The auth .html rows (/login-modern.html -> /login/ ...) are added with the auth slice (S6).

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
