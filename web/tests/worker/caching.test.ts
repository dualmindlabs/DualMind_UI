import { describe, expect, it } from 'vitest';

import {
  CACHE_RULES,
  cacheControlFor,
  IMMUTABLE_CACHE,
  LEGACY_NO_STORE,
  REVALIDATE,
  SHARE_NO_STORE,
} from '../../../server/caching.js';

// The caching table (server/caching.js), row by row.

const cases: Array<[path: string, webPage: boolean, expected: string | null]> = [
  // Hashed build files: a year, immutable (before any extension rule).
  ['/assets/root-AbCd_123.js', false, IMMUTABLE_CACHE],
  ['/assets/root-Zz9-xY12.css', false, IMMUTABLE_CACHE],
  ['/assets/bricolage-grotesque-latin-opsz-normal-Q1w2E3r4.woff2', false, IMMUTABLE_CACHE],
  // Legacy share page: never cached.
  ['/share/', false, SHARE_NO_STORE],
  ['/share/abc123', false, SHARE_NO_STORE],
  // Web app pages: revalidate with the ETag (the landing page at / since slice S3).
  ['/', true, REVALIDATE],
  ['/design/', true, REVALIDATE],
  ['/__spa-fallback', false, REVALIDATE],
  // Legacy HTML, JS, CSS and JSON: no-store until the cutover.
  ['/', false, LEGACY_NO_STORE],
  ['/leaderboard/', false, LEGACY_NO_STORE],
  ['/login-modern.html', false, LEGACY_NO_STORE],
  ['/js/apiInstance.js', false, LEGACY_NO_STORE],
  ['/css/tokens.css', false, LEGACY_NO_STORE],
  ['/manifest.json', false, LEGACY_NO_STORE],
  // Images: a year, as before.
  ['/assets/logo.png', false, IMMUTABLE_CACHE],
  ['/favicon.svg', false, IMMUTABLE_CACHE],
  // Anything else keeps the Workers static assets default.
  ['/robots.txt', false, null],
  ['/design', false, null],
];

describe('caching table', () => {
  it.each(cases)('%s (web page: %s) -> %s', (pathname, webPage, expected) => {
    expect(cacheControlFor({ pathname, webPage })).toBe(expected);
  });

  it('every rule is documented and used by at least one case', () => {
    for (const rule of CACHE_RULES) {
      expect(rule.applies.length, rule.name).toBeGreaterThan(10);
      expect(
        cases.some(([pathname, webPage]) => rule.test({ pathname, webPage })),
        rule.name,
      ).toBe(true);
    }
  });

  it('treats legacy HTML at a clean URL as legacy code; web pages stay revalidated', () => {
    // /legacy-app.html is served at /legacy-app (html_handling), like /login-modern.
    expect(cacheControlFor({ pathname: '/legacy-app', webPage: false, html: true })).toBe(
      LEGACY_NO_STORE,
    );
    expect(cacheControlFor({ pathname: '/login-modern', webPage: false, html: true })).toBe(
      LEGACY_NO_STORE,
    );
    expect(cacheControlFor({ pathname: '/', webPage: true, html: true })).toBe(REVALIDATE);
    expect(cacheControlFor({ pathname: '/robots.txt', webPage: false, html: false })).toBeNull();
  });
});
