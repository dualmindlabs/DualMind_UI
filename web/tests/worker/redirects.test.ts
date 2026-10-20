import { beforeEach, describe, expect, it } from 'vitest';

import { findRedirect, LEGACY_REDIRECTS, redirectResponse } from '../../../server/redirects.js';
import { resetWebManifestCache } from '../../../server/web-manifest.js';
import worker from '../../../worker.js';
import { DIST, fakeAssets } from './fake-assets';

// Every row of the redirect table (server/redirects.js), through the whole Worker.

const ORIGIN = 'https://arena.dualmindlab.tech';

/** The paths a row must catch. */
function examples(rule: (typeof LEGACY_REDIRECTS)[number]): string[] {
  return rule.match === 'exact'
    ? [rule.from]
    : [rule.from, `${rule.from}/`, `${rule.from}/index.html`];
}

beforeEach(() => {
  resetWebManifestCache();
});

describe('legacy redirects', () => {
  const cases = LEGACY_REDIRECTS.flatMap(rule => examples(rule).map(path => [path, rule] as const));

  it.each(cases)('%s -> 301, query kept', async (path, rule) => {
    const request = new Request(`${ORIGIN}${path}?utm_source=mail&x=1`, {
      headers: { Cookie: 'dm_preview=1' },
    });
    const response = await worker.fetch(request, { ASSETS: fakeAssets(DIST) });
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`${ORIGIN}${rule.to}?utm_source=mail&x=1`);
    expect(response.headers.get('strict-transport-security')).toContain('max-age=63072000');
  });

  it('covers the rows the plan asks for', () => {
    expect(LEGACY_REDIRECTS.map(rule => [rule.from, rule.to])).toEqual([
      ['/index.html', '/'],
      ['/about/about', '/about/'],
      ['/how-it-works/how-it-works', '/how-it-works/'],
      ['/careers', '/about/'],
      ['/auth-verify.html', '/'],
      ['/verify.html', '/'],
    ]);
  });

  it('leaves similar paths alone', () => {
    for (const path of [
      '/',
      '/about/',
      '/about/aboutus',
      '/how-it-works/',
      '/careersx',
      '/careers.html.bak',
      '/index.htm',
      '/verify',
      '/login/verify.html',
    ]) {
      expect(findRedirect(path), path).toBeUndefined();
      expect(redirectResponse(new URL(`${ORIGIN}${path}`)), path).toBeNull();
    }
  });

  it('a redirect without a query has none', () => {
    const response = redirectResponse(new URL(`${ORIGIN}/careers`));
    expect(response?.headers.get('location')).toBe(`${ORIGIN}/about/`);
  });

  it('redirects are still behind the waitlist gate', async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/index.html`), {
      ASSETS: fakeAssets(DIST),
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toMatch(/^https:\/\/early\.dualmindlab\.tech\//);
  });
});
