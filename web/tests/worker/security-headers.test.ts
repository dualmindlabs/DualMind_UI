import { beforeEach, describe, expect, it } from 'vitest';

import {
  API_SECURITY_HEADERS,
  applySecurityHeaders,
  BASE_SECURITY_HEADERS,
  LEGACY_CONTENT_SECURITY_POLICY,
  webContentSecurityPolicy,
} from '../../../server/security-headers.js';
import { resetWebManifestCache } from '../../../server/web-manifest.js';
import worker from '../../../worker.js';
import { DIST, fakeAssets } from './fake-assets';

const ORIGIN = 'https://arena.dualmindlab.tech';
const HASH = 'CihokcEcBW4atb/CW/XWsvWwbTjqwQlE9nj9ii5ww5M=';

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(';').map(part => {
      const [name = '', ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );
}

function get(path: string, files: Record<string, string> = DIST) {
  return worker.fetch(new Request(`${ORIGIN}${path}`, { headers: { Cookie: 'dm_preview=1' } }), {
    ASSETS: fakeAssets(files),
  });
}

beforeEach(() => {
  resetWebManifestCache();
});

describe('the web page CSP', () => {
  const policy = directives(
    webContentSecurityPolicy({
      scriptHashes: [HASH],
      connectSrc: ['https://abc.supabase.co', 'wss://abc.supabase.co'],
    }),
  );

  it('allows scripts only from the origin and by hash', () => {
    expect(policy.get('script-src')).toEqual(["'self'", `'sha256-${HASH}'`]);
    expect(policy.get('default-src')).toEqual(["'self'"]);
  });

  it('locks down everything else', () => {
    expect(policy.get('object-src')).toEqual(["'none'"]);
    expect(policy.get('frame-ancestors')).toEqual(["'none'"]);
    expect(policy.get('base-uri')).toEqual(["'self'"]);
    expect(policy.get('form-action')).toEqual(["'self'"]);
    expect(policy.get('font-src')).toEqual(["'self'"]);
    expect(policy.get('img-src')).toEqual(["'self'", 'data:', 'blob:']);
    expect(policy.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
    expect(policy.get('connect-src')).toEqual([
      "'self'",
      'https://abc.supabase.co',
      'wss://abc.supabase.co',
    ]);
  });

  it('without a manifest, scripts fall back to the origin only', () => {
    expect(directives(webContentSecurityPolicy()).get('script-src')).toEqual(["'self'"]);
  });
});

describe('the legacy report-only CSP', () => {
  const policy = directives(LEGACY_CONTENT_SECURITY_POLICY);

  it('matches what the legacy pages load today', () => {
    expect(policy.get('script-src')).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com']),
    );
    expect(policy.get('style-src')).toContain('https://fonts.googleapis.com');
    expect(policy.get('font-src')).toContain('https://fonts.gstatic.com');
    expect(policy.get('connect-src')).toEqual(
      expect.arrayContaining(['https://api.dualmindlab.tech', 'https://*.supabase.co', 'wss://*.supabase.co']),
    );
    expect(policy.get('frame-ancestors')).toEqual(["'none'"]);
  });
});

describe('applySecurityHeaders', () => {
  it('sets the base headers and drops X-XSS-Protection', () => {
    const headers = new Headers({ 'X-XSS-Protection': '1; mode=block' });
    applySecurityHeaders(headers, { kind: 'other' });
    for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
      expect(headers.get(name), name).toBe(value);
    }
    expect(headers.get('x-xss-protection')).toBeNull();
    expect(headers.get('content-security-policy')).toBeNull();
  });

  it('keeps API responses to transport headers', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { kind: 'api' });
    expect([...headers.keys()].sort()).toEqual(
      Object.keys(API_SECURITY_HEADERS)
        .map(name => name.toLowerCase())
        .sort(),
    );
  });

  it('sends a page policy as enforced or report-only, never both', () => {
    const enforced = new Headers({ 'Content-Security-Policy-Report-Only': 'old' });
    applySecurityHeaders(enforced, { kind: 'web-page', csp: "default-src 'self'" });
    expect(enforced.get('content-security-policy')).toBe("default-src 'self'");
    expect(enforced.get('content-security-policy-report-only')).toBeNull();

    const reportOnly = new Headers({ 'Content-Security-Policy': 'old' });
    applySecurityHeaders(reportOnly, { kind: 'legacy-page', csp: 'x', cspReportOnly: true });
    expect(reportOnly.get('content-security-policy')).toBeNull();
    expect(reportOnly.get('content-security-policy-report-only')).toBe('x');
  });
});

describe('headers on real responses', () => {
  it('web page: enforced CSP with the build hashes', async () => {
    const response = await get('/design/');
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain(`'sha256-${HASH}'`);
    expect(directives(csp).get('script-src')).not.toContain("'unsafe-inline'");
    expect(response.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains',
    );
    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(response.headers.get('permissions-policy')).toContain('microphone=(self)');
  });

  it('web page without a manifest: the same policy, report-only, so scripts still run', async () => {
    const files = { ...DIST };
    delete files['/__web-manifest.json'];
    const response = await get('/design/', files);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toBeNull();
    expect(response.headers.get('content-security-policy-report-only')).toContain("script-src 'self'");
  });

  it('legacy page: report-only legacy policy', async () => {
    const response = await get('/leaderboard/');
    expect(response.headers.get('content-security-policy-report-only')).toBe(
      LEGACY_CONTENT_SECURITY_POLICY,
    );
    expect(response.headers.get('content-security-policy')).toBeNull();
  });

  it('files, redirects and 404s get the base headers but no CSP', async () => {
    for (const path of ['/assets/root-AbCd_123.js', '/assets/logo.png', '/design', '/careers', '/nope']) {
      const response = await get(path);
      expect(response.headers.get('x-content-type-options'), path).toBe('nosniff');
      expect(response.headers.get('x-frame-options'), path).toBe('DENY');
      expect(response.headers.get('content-security-policy'), path).toBeNull();
      expect(response.headers.get('content-security-policy-report-only'), path).toBeNull();
    }
  });

  it('the waitlist redirect gets them too', async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/`), { ASSETS: fakeAssets(DIST) });
    expect(response.status).toBe(302);
    expect(response.headers.get('strict-transport-security')).toContain('max-age=63072000');
  });
});
