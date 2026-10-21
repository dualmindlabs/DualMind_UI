import { beforeEach, describe, expect, it } from 'vitest';

import { resetWebManifestCache } from '../../../server/web-manifest.js';
import worker from '../../../worker.js';
import { DIST, fakeAssets } from './fake-assets';

// Slice S6 through the whole Worker: the legacy sign-in URLs answer 301 with ?redirect= kept,
// and the two Supabase email targets render the SPA fallback in place (status 200), with the
// enforced CSP that lets the page reach the Supabase project from the build manifest.

const ORIGIN = 'https://arena.dualmindlab.tech';
const SUPABASE = 'https://e2eproject.supabase.co';
const PREVIEW = { Cookie: 'dm_preview=1' };

const AUTH_DIST: Record<string, string> = {
  ...DIST,
  '/login/index.html': '<!doctype html><title>Sign in · DualMind Arena</title>',
  '/signup/index.html': '<!doctype html><title>Create your account · DualMind Arena</title>',
  '/forgot-password/index.html': '<!doctype html><title>Reset your password</title>',
  '/__web-manifest.json': JSON.stringify({
    version: 1,
    pages: ['/', '/__spa-fallback', '/design/', '/forgot-password/', '/login/', '/signup/'],
    scriptHashes: ['CihokcEcBW4atb/CW/XWsvWwbTjqwQlE9nj9ii5ww5M='],
    connectSrc: [SUPABASE, 'wss://e2eproject.supabase.co', 'https://api.pwnedpasswords.com'],
  }),
};

function get(pathAndQuery: string) {
  return worker.fetch(new Request(`${ORIGIN}${pathAndQuery}`, { headers: PREVIEW }), {
    ASSETS: fakeAssets(AUTH_DIST),
  });
}

beforeEach(() => {
  resetWebManifestCache();
});

describe('legacy sign-in URLs', () => {
  it.each([
    ['/login-modern.html?redirect=%2Fleaderboard%2F', '/login/?redirect=%2Fleaderboard%2F'],
    ['/login-modern?redirect=%2F', '/login/?redirect=%2F'],
    ['/signup-modern.html?redirect=%2Fmodels%2F', '/signup/?redirect=%2Fmodels%2F'],
    ['/forgot-password.html', '/forgot-password/'],
    ['/login/index.html?redirect=%2F', '/login/?redirect=%2F'],
    ['/login/login/', '/login/'],
    ['/login/login/index.html', '/login/'],
    ['/login/login/redirect.html', '/login/'],
    ['/auth-callback?type=signup', '/auth-callback.html?type=signup'],
    ['/update-password', '/update-password.html'],
  ])('%s -> 301 %s', async (from, to) => {
    const response = await get(from);
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`${ORIGIN}${to}`);
  });
});

describe('the Supabase email targets render in place', () => {
  it.each(['/auth-callback.html', '/update-password.html'])(
    '%s answers the SPA fallback with status 200 and the enforced CSP',
    async path => {
      const response = await get(`${path}?type=recovery`);
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(await response.text()).toContain('<title>Loading</title>');
      const csp = response.headers.get('content-security-policy') ?? '';
      expect(csp).toContain(`connect-src 'self' ${SUPABASE} wss://e2eproject.supabase.co`);
      expect(csp).toContain('https://api.pwnedpasswords.com');
      const scriptSrc = csp.split(';').find(part => part.trim().startsWith('script-src')) ?? '';
      expect(scriptSrc).not.toContain('unsafe-inline');
      expect(response.headers.get('content-security-policy-report-only')).toBeNull();
    },
  );

  it('HEAD works too', async () => {
    const response = await worker.fetch(
      new Request(`${ORIGIN}/auth-callback.html`, { method: 'HEAD', headers: PREVIEW }),
      { ASSETS: fakeAssets(AUTH_DIST) },
    );
    expect(response.status).toBe(200);
  });
});

describe('the new sign-in pages', () => {
  it.each(['/login/', '/signup/', '/forgot-password/'])(
    '%s is a web page: enforced CSP with the Supabase origin, revalidated',
    async path => {
      const response = await get(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('content-security-policy')).toContain(SUPABASE);
    },
  );
});
