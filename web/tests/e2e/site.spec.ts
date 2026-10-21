import { expect, test } from '@playwright/test';

import { PREVIEW_COOKIE } from './helpers';

// HTTP-level checks of the composed dist/ served by the real worker.js in workerd.
const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };
const LEGACY_NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';
const IMMUTABLE = 'public, max-age=31536000, immutable';

test('/design/ is prerendered HTML: title, noindex and content without JavaScript', async ({
  request,
}) => {
  const response = await request.get('/design/', withCookie);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');

  const html = await response.text();
  expect(html).toContain('<title>Design system · DualMind Arena</title>');
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"\/?>/);
  expect(html).toContain('Two minds, <span');
  expect(html).toContain('one verdict.</span>');
  expect(html).toContain('id="colour"');
  // The theme script is inline in <head>, so it runs before anything is painted.
  const scriptAt = html.indexOf('dm.theme');
  expect(scriptAt).toBeGreaterThan(-1);
  expect(scriptAt).toBeLessThan(html.indexOf('<body'));
});

test('/design redirects to /design/ (or serves it)', async ({ request }) => {
  const response = await request.get('/design', withCookie);
  expect([200, 301, 307, 308]).toContain(response.status());
  if (response.status() !== 200) {
    expect(new URL(response.headers()['location'] ?? '', 'http://x').pathname).toBe('/design/');
  }
});

test('hashed build files are immutable; legacy files keep their headers', async ({ request }) => {
  const html = await (await request.get('/design/', withCookie)).text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css|woff2))"/g)].map(
    match => match[1] ?? '',
  );
  expect(assets.some(file => file.endsWith('.js'))).toBe(true);
  expect(assets.some(file => file.endsWith('.css'))).toBe(true);
  for (const file of assets) {
    const response = await request.get(file, withCookie);
    expect(response.status(), file).toBe(200);
    expect(response.headers()['cache-control'], file).toBe(IMMUTABLE);
  }

  expect((await request.get('/assets/logo.png', withCookie)).headers()['cache-control']).toBe(
    IMMUTABLE,
  );
  expect((await request.get('/theme.js', withCookie)).headers()['cache-control']).toBe(
    LEGACY_NO_STORE,
  );
});

test('legacy pages are still served', async ({ request }) => {
  for (const page of ['/', '/about/', '/how-it-works/', '/login/']) {
    const response = await request.get(page, withCookie);
    expect(response.status(), page).toBe(200);
    expect(response.headers()['content-type'], page).toContain('text/html');
    expect(response.headers()['cache-control'], page).toBe(LEGACY_NO_STORE);
  }
  // The legacy home page is still the legacy one, not the web app's SPA fallback.
  expect(await (await request.get('/', withCookie)).text()).not.toContain('data-spa-fallback');
});

test('the SPA fallback is in dist under its own name', async ({ request }) => {
  const response = await request.get('/__spa-fallback', withCookie);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('data-spa-fallback');
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
});

test('the waitlist gate still applies without the preview cookie', async ({ request }) => {
  const gated = await request.get('/design/', { maxRedirects: 0 });
  expect(gated.status()).toBe(302);
  expect(gated.headers()['location']).toMatch(/^https:\/\/early\.dualmindlab\.tech\/\?ref=arena$/);

  const opened = await request.get('/design/?preview=dualmind-preview', { maxRedirects: 0 });
  expect(opened.status()).toBe(200);
  expect(opened.headers()['set-cookie']).toContain('dm_preview=1');
});

test('unknown paths answer 404', async ({ request }) => {
  expect((await request.get('/does-not-exist', withCookie)).status()).toBe(404);
});

test('/design/: security headers, enforced CSP with script hashes, ETag revalidation', async ({
  request,
}) => {
  const response = await request.get('/design/', withCookie);
  const headers = response.headers();
  const csp = headers['content-security-policy'] ?? '';
  const scriptSrc = csp.split(';').find(part => part.trim().startsWith('script-src')) ?? '';
  expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/]{43}='/);
  expect(scriptSrc).not.toContain('unsafe-inline');
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(headers['content-security-policy-report-only']).toBeUndefined();
  expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBe(
    'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)',
  );
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-xss-protection']).toBeUndefined();
  expect(headers['cache-control']).toBe('no-cache');

  const etag = headers['etag'];
  expect(etag).toBeTruthy();
  const again = await request.get('/design/', {
    ...withCookie,
    headers: { ...withCookie.headers, 'If-None-Match': etag ?? '' },
  });
  expect(again.status()).toBe(304);
});

test('legacy pages: report-only CSP, no-store, no X-XSS-Protection', async ({ request }) => {
  for (const page of ['/', '/about/', '/login/']) {
    const headers = (await request.get(page, withCookie)).headers();
    expect(headers['content-security-policy'], page).toBeUndefined();
    expect(headers['content-security-policy-report-only'], page).toContain(
      'https://cdn.jsdelivr.net',
    );
    expect(headers['cache-control'], page).toBe(LEGACY_NO_STORE);
    expect(headers['strict-transport-security'], page).toBeTruthy();
    expect(headers['x-xss-protection'], page).toBeUndefined();
  }
});

test('hashed files: immutable, base security headers, no CSP', async ({ request }) => {
  const html = await (await request.get('/design/', withCookie)).text();
  const file = html.match(/\/assets\/[^"]+\.js/)?.[0] ?? '';
  const headers = (await request.get(file, withCookie)).headers();
  expect(headers['cache-control']).toBe(IMMUTABLE);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toBeUndefined();
});

const redirects: Array<[from: string, to: string]> = [
  ['/index.html', '/'],
  ['/about/about/', '/about/'],
  ['/about/about/index.html', '/about/'],
  ['/how-it-works/how-it-works/', '/how-it-works/'],
  ['/careers', '/about/'],
  ['/careers/', '/about/'],
  ['/auth-verify.html', '/'],
  ['/verify.html', '/'],
];

for (const [from, to] of redirects) {
  test(`redirect ${from} -> ${to} (301, query kept)`, async ({ request, baseURL }) => {
    const response = await request.get(`${from}?ref=test`, withCookie);
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toBe(`${baseURL}${to}?ref=test`);
  });
}

test('/api/health goes through the hardened proxy', async ({ request }) => {
  const response = await request.get('/api/health?deep=1', {
    headers: {
      Cookie: `${PREVIEW_COOKIE}; sb-access-token=secret`,
      'X-Request-Id': 'e2e-request-0001',
      Authorization: 'Bearer test',
      'X-Forwarded-Host': 'evil.test',
      'X-User-ID': 'spoofed',
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(200);
  const echo = (await response.json()) as { path: string; headers: Record<string, string> };
  expect(echo.path).toBe('/health?deep=1');
  expect(echo.headers['x-request-id']).toBe('e2e-request-0001');
  expect(echo.headers['authorization']).toBe('Bearer test');
  expect(echo.headers['cookie']).toBeUndefined();
  expect(echo.headers['x-user-id']).toBeUndefined();
  const headers = response.headers();
  expect(headers['x-request-id']).toBe('e2e-request-0001');
  expect(headers['access-control-allow-origin']).toBeUndefined();
  expect(headers['x-dualmind-proxy-backend']).toBeUndefined();
  expect(headers['strict-transport-security']).toBeTruthy();
});
