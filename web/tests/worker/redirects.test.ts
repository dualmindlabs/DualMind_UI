import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  findRedirect,
  LEGACY_REDIRECTS,
  redirectResponse,
  TRAILING_SLASH_PAGES,
  trailingSlashRedirect,
} from '../../../server/redirects.js';
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
      ['/auth-verify', '/'],
      ['/verify.html', '/'],
      ['/login-modern.html', '/login/'],
      ['/login-modern', '/login/'],
      ['/login/index.html', '/login/'],
      ['/login/login', '/login/'],
      ['/signup-modern.html', '/signup/'],
      ['/signup-modern', '/signup/'],
      ['/forgot-password.html', '/forgot-password/'],
      ['/auth-callback', '/auth-callback.html'],
      ['/update-password', '/update-password.html'],
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
      // The new sign-in pages and the Supabase email targets are never redirected.
      '/login/',
      '/signup/',
      '/forgot-password/',
      '/auth-callback.html',
      '/update-password.html',
      '/login/loginx',
      '/login-modern.htm',
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

describe('trailing-slash redirects', () => {
  it.each([...TRAILING_SLASH_PAGES])('%s -> 301 to the slash form, query kept', async page => {
    const request = new Request(`${ORIGIN}${page}?ref=ph`, { headers: { Cookie: 'dm_preview=1' } });
    const response = await worker.fetch(request, { ASSETS: fakeAssets(DIST) });
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`${ORIGIN}${page}/?ref=ph`);
  });

  it('only redirects GET and HEAD, and never the slash form or client-only routes', () => {
    const url = (path: string) => new URL(`${ORIGIN}${path}`);
    expect(trailingSlashRedirect(url('/leaderboard'), 'POST')).toBeNull();
    expect(trailingSlashRedirect(url('/leaderboard'), 'HEAD')?.status).toBe(301);
    for (const path of ['/', '/leaderboard/', '/share', '/settings', '/compare', '/api/health']) {
      expect(trailingSlashRedirect(url(path)), path).toBeNull();
    }
  });

  it('lists every prerendered page of the web app', () => {
    const config = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../react-router.config.ts'),
      'utf8',
    );
    const prerendered = [...config.matchAll(/^\s+'(\/[a-z-]+)',/gm)].map(match => match[1]);
    expect(prerendered.length).toBeGreaterThan(10);
    for (const page of prerendered) {
      if (page === '/404') continue;
      expect(TRAILING_SLASH_PAGES.has(page as string), page).toBe(true);
    }
  });
});
