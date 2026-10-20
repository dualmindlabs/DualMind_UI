import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import {
  HASHED_ASSET_RE,
  IMMUTABLE_CACHE,
  isHashedAsset,
  isNoindexPath,
  isSpaFallbackRoute,
  serveSpaFallback,
  SPA_FALLBACK_ROUTES,
} from '../../../server/routing.js';
import worker from '../../../worker.js';
import { DIST, fakeAssets, type FakeAssets } from './fake-assets';

// The Arena Worker (../../../worker.js) in Node, with a fake static-assets binding and a fake
// backend: no network, no wrangler. tests/e2e covers the same Worker running in workerd.

const ORIGIN = 'https://arena.dualmindlab.tech';
const LEGACY_NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

let assets: FakeAssets;
let backend: Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

beforeEach(() => {
  assets = fakeAssets(DIST);
  backend = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(
      new Response('{"status":"ok"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', backend);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function call(
  pathAndQuery: string,
  { cookie, method = 'GET', env = {} }: { cookie?: string; method?: string; env?: object } = {},
) {
  const headers = new Headers();
  if (cookie) headers.set('Cookie', cookie);
  const request = new Request(`${ORIGIN}${pathAndQuery}`, { method, headers });
  return worker.fetch(request, { ASSETS: assets, ...env });
}

const preview = (pathAndQuery: string, options: { method?: string; env?: object } = {}) =>
  call(pathAndQuery, { cookie: 'dm_preview=1', ...options });

describe('waitlist gate (FORCE_WAITLIST)', () => {
  it('sends visitors without the preview cookie to the waitlist, keeping the query', async () => {
    const response = await call('/leaderboard/?utm_source=x');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://early.dualmindlab.tech/?utm_source=x&ref=arena',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(assets.requested).toEqual([]);
  });

  it('keeps an existing ref and gates every method, the API included', async () => {
    const response = await call('/design/?ref=newsletter');
    expect(response.headers.get('location')).toBe('https://early.dualmindlab.tech/?ref=newsletter');
    expect((await call('/api/arena/battle', { method: 'POST' })).status).toBe(302);
    expect(backend).not.toHaveBeenCalled();
  });

  it('?preview=dualmind-preview serves the Arena and sets the 30-day cookie', async () => {
    const response = await call('/?preview=dualmind-preview');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Legacy arena');
    expect(response.headers.get('set-cookie')).toBe(
      'dm_preview=1; Max-Age=2592000; Path=/; Secure; HttpOnly; SameSite=Lax',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('?preview=off clears the cookie and redirects', async () => {
    const response = await call('/?preview=off', { cookie: 'dm_preview=1' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://early.dualmindlab.tech/?ref=arena');
    expect(response.headers.get('set-cookie')).toBe(
      'dm_preview=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax',
    );
  });

  it('the cookie bypasses the gate; other values do not', async () => {
    expect((await call('/', { cookie: 'theme=dark; dm_preview=1' })).status).toBe(200);
    expect((await call('/', { cookie: 'dm_preview=0' })).status).toBe(302);
    expect((await call('/', { cookie: 'xdm_preview=1' })).status).toBe(302);
  });
});

describe('web app pages', () => {
  it('serves the prerendered /design/ page, kept out of search results', async () => {
    const response = await preview('/design/');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Design system · DualMind Arena');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('redirects /design to /design/', async () => {
    const response = await preview('/design');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/design/');
  });

  it('caches hashed build files for a year', async () => {
    for (const file of [
      '/assets/root-AbCd_123.js',
      '/assets/root-Zz9-xY12.css',
      '/assets/bricolage-grotesque-latin-opsz-normal-Q1w2E3r4.woff2',
    ]) {
      const response = await preview(file);
      expect(response.status, file).toBe(200);
      expect(response.headers.get('cache-control'), file).toBe(IMMUTABLE_CACHE);
    }
  });
});

describe('legacy behaviour is unchanged', () => {
  it('legacy pages: 200, no-store, security headers', async () => {
    for (const page of ['/', '/leaderboard/', '/about/']) {
      const response = await preview(page);
      expect(response.status, page).toBe(200);
      expect(response.headers.get('cache-control'), page).toBe(LEGACY_NO_STORE);
      expect(response.headers.get('x-frame-options'), page).toBe('DENY');
      expect(response.headers.get('x-xss-protection'), page).toBe('1; mode=block');
      expect(response.headers.get('x-robots-tag'), page).toBeNull();
    }
  });

  it('legacy assets keep their headers', async () => {
    expect((await preview('/assets/logo.png')).headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect((await preview('/js/apiInstance.js')).headers.get('cache-control')).toBe(
      LEGACY_NO_STORE,
    );
    expect((await preview('/css/tokens.css')).headers.get('cache-control')).toBe(LEGACY_NO_STORE);
  });

  it('proxies /api/health to the backend /health', async () => {
    const response = await preview('/api/health');
    expect(response.status).toBe(200);
    expect(backend).toHaveBeenCalledTimes(1);
    expect(String(backend.mock.calls[0]?.[0])).toBe('https://api.dualmindlab.tech/health');
    expect(response.headers.get('x-dualmind-proxy-path')).toBe('/health');
  });

  it('proxies other /api/* paths with their query, to BACKEND_URL when set', async () => {
    await preview('/api/arena/models?limit=5', { env: { BACKEND_URL: 'https://backend.test' } });
    expect(String(backend.mock.calls[0]?.[0])).toBe('https://backend.test/api/arena/models?limit=5');
  });

  it('redirects the removed careers page to /about/', async () => {
    const response = await preview('/careers/?from=x');
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`${ORIGIN}/about/?from=x`);
  });

  it('answers unknown paths with 404', async () => {
    expect((await preview('/does-not-exist')).status).toBe(404);
  });
});

describe('routing helpers (server/routing.js)', () => {
  it('recognises Vite hashed files only', () => {
    for (const hashed of [
      '/assets/root-AbCd_123.js',
      '/assets/entry.client-B9x-Qa7Z.js',
      '/assets/app-Zz9-xY12.css',
      '/assets/dm-mono-latin-500-normal-Q1w2E3r4.woff2',
    ]) {
      expect(isHashedAsset(hashed), hashed).toBe(true);
    }
    for (const plain of [
      '/assets/logo.png',
      '/assets/background.png',
      '/assets/battleimage%201.png',
      '/assets/sub/root-AbCd_123.js',
      '/js/root-AbCd_123.js',
      '/assets/root-AbCd_12.js',
    ]) {
      expect(isHashedAsset(plain), plain).toBe(false);
    }
  });

  it('build.js checks the same hash pattern', () => {
    const buildScript = readFileSync(path.join(repoRoot, 'build.js'), 'utf8');
    expect(buildScript).toContain(`/${HASHED_ASSET_RE.source}/`);
  });

  it('has no SPA fallback routes yet, and matches exact paths and prefixes', () => {
    expect(SPA_FALLBACK_ROUTES).toEqual([]);
    const routes = ['/settings/', '/share/*'];
    expect(isSpaFallbackRoute('/settings/', routes)).toBe(true);
    expect(isSpaFallbackRoute('/settings', routes)).toBe(false);
    expect(isSpaFallbackRoute('/share/abc123', routes)).toBe(true);
    expect(isSpaFallbackRoute('/shared', routes)).toBe(false);
    expect(isSpaFallbackRoute('/settings/')).toBe(false);
  });

  it('serves the SPA fallback page with status 200 and no-cache', async () => {
    const response = await serveSpaFallback(new Request(`${ORIGIN}/share/abc?x=1`), {
      ASSETS: assets,
    });
    expect(response?.status).toBe(200);
    expect(response?.headers.get('cache-control')).toBe('no-cache');
    expect(response?.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await response?.text()).toContain('Loading');
    expect(assets.requested).toContain('/__spa-fallback');
  });

  it('returns null when the fallback page is missing', async () => {
    const empty = fakeAssets({});
    expect(await serveSpaFallback(new Request(`${ORIGIN}/x`), { ASSETS: empty })).toBeNull();
    expect(await serveSpaFallback(new Request(`${ORIGIN}/x`), {})).toBeNull();
  });

  it('marks the style guide and the fallback page noindex', () => {
    expect(isNoindexPath('/design/')).toBe(true);
    expect(isNoindexPath('/design')).toBe(true);
    expect(isNoindexPath('/__spa-fallback')).toBe(true);
    expect(isNoindexPath('/designer/')).toBe(false);
    expect(isNoindexPath('/')).toBe(false);
  });
});
