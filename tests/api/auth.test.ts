import { describe, expect, it } from 'vitest';
import { buildVerifier, CompositeVerifier } from '../../server/v2/auth/composite.ts';
import { JwksVerifier } from '../../server/v2/auth/jwks.ts';
import { SharedSecretVerifier } from '../../server/v2/auth/shared-secret.ts';
import { AuthError } from '../../server/v2/auth/verifier.ts';
import { createApp } from '../../server/v2/app.ts';
import { ISSUER, SUPABASE_URL, USER_ID, makeKey, sign } from './helpers.ts';

async function reasonOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AuthError);
    return (error as AuthError).reason;
  }
  throw new Error('expected a rejection');
}

describe('JwksVerifier', () => {
  it('accepts a valid ES256 token', async () => {
    const { privateKey, jwks } = await makeKey();
    const verifier = new JwksVerifier(jwks, SUPABASE_URL);
    const user = await verifier.verify(await sign(privateKey));
    expect(user.id).toBe(USER_ID);
    expect(user.role).toBe('authenticated');
    expect(user.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it('rejects an expired token', async () => {
    const { privateKey, jwks } = await makeKey();
    const verifier = new JwksVerifier(jwks, SUPABASE_URL);
    const expired = await sign(privateKey, { expiresIn: Math.floor(Date.now() / 1000) - 3600 });
    expect(await reasonOf(verifier.verify(expired))).toBe('expired');
  });

  it('rejects the wrong issuer and the wrong audience', async () => {
    const { privateKey, jwks } = await makeKey();
    const verifier = new JwksVerifier(jwks, SUPABASE_URL);
    expect(await reasonOf(verifier.verify(await sign(privateKey, { issuer: 'https://evil.supabase.co/auth/v1' })))).toBe('invalid_token');
    expect(await reasonOf(verifier.verify(await sign(privateKey, { audience: 'anon' })))).toBe('invalid_token');
  });

  it('rejects a token signed by another key, and one with an unknown kid', async () => {
    const { jwks } = await makeKey('ES256', 'k1');
    const other = await makeKey('ES256', 'k1');
    const verifier = new JwksVerifier(jwks, SUPABASE_URL);
    expect(await reasonOf(verifier.verify(await sign(other.privateKey)))).toBe('bad_signature');
    expect(await reasonOf(verifier.verify(await sign(other.privateKey, { kid: 'unknown' })))).toBe('invalid_token');
  });

  it('rejects a subject that is not a UUID', async () => {
    const { privateKey, jwks } = await makeKey();
    const verifier = new JwksVerifier(jwks, SUPABASE_URL);
    expect(await reasonOf(verifier.verify(await sign(privateKey, { sub: 'not-a-uuid' })))).toBe('invalid_token');
  });

  it('reports an unreachable key set as jwks_unavailable, not as a bad token', async () => {
    const { privateKey } = await makeKey();
    const down = async () => {
      throw new TypeError('fetch failed');
    };
    const verifier = new JwksVerifier(down as never, SUPABASE_URL);
    expect(await reasonOf(verifier.verify(await sign(privateKey)))).toBe('jwks_unavailable');
  });
});

describe('SharedSecretVerifier', () => {
  const secret = 'a-test-secret-that-is-long-enough-for-hs256';
  const key = new TextEncoder().encode(secret);

  it('accepts a valid HS256 token and rejects a wrong secret', async () => {
    const verifier = new SharedSecretVerifier(secret, SUPABASE_URL);
    expect((await verifier.verify(await sign(key, { alg: 'HS256' }))).id).toBe(USER_ID);
    const wrong = new TextEncoder().encode('another-test-secret-that-is-long-enough!!');
    expect(await reasonOf(verifier.verify(await sign(wrong, { alg: 'HS256' })))).toBe('bad_signature');
  });
});

describe('CompositeVerifier', () => {
  it('dispatches on alg and rejects none and unknown algorithms', async () => {
    const { privateKey, jwks } = await makeKey();
    const secret = 'a-test-secret-that-is-long-enough-for-hs256';
    const verifier = new CompositeVerifier({
      jwks: new JwksVerifier(jwks, SUPABASE_URL),
      shared: new SharedSecretVerifier(secret, SUPABASE_URL),
    });
    expect((await verifier.verify(await sign(privateKey))).id).toBe(USER_ID);
    expect((await verifier.verify(await sign(new TextEncoder().encode(secret), { alg: 'HS256' }))).id).toBe(USER_ID);

    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, '');
    const payload = btoa(JSON.stringify({ sub: USER_ID, iss: ISSUER, aud: 'authenticated', exp: 9999999999 })).replace(/=+$/, '');
    expect(await reasonOf(verifier.verify(`${header}.${payload}.`))).toBe('unsupported');
    expect(await reasonOf(verifier.verify('not-a-jwt'))).toBe('malformed');
  });

  it('blocks algorithm confusion: an HS256 token "signed" with public key material', async () => {
    const { jwks } = await makeKey();
    const publicMaterial = new TextEncoder().encode('public-key-material-used-as-an-hmac-secret');
    const forged = await sign(publicMaterial, { alg: 'HS256' });
    // Without a shared secret configured, HS256 is simply unsupported.
    const noSecret = new CompositeVerifier({ jwks: new JwksVerifier(jwks, SUPABASE_URL) });
    expect(await reasonOf(noSecret.verify(forged))).toBe('unsupported');
    // With a secret configured, HS256 is checked against that secret only.
    const withSecret = new CompositeVerifier({
      jwks: new JwksVerifier(jwks, SUPABASE_URL),
      shared: new SharedSecretVerifier('a-test-secret-that-is-long-enough-for-hs256', SUPABASE_URL),
    });
    expect(await reasonOf(withSecret.verify(forged))).toBe('bad_signature');
  });
});

describe('buildVerifier', () => {
  it('is null without a Supabase URL (authenticated routes then answer 501)', () => {
    expect(buildVerifier({})).toBeNull();
    expect(buildVerifier({ SUPABASE_JWT_SECRET: 'secret-without-url-123456789012345' })).toBeNull();
    expect(buildVerifier({ SUPABASE_URL })).not.toBeNull();
  });
});

describe('auth middleware on /api/v2/me', () => {
  async function setup() {
    const { privateKey, jwks } = await makeKey();
    const app = createApp({ verifier: () => new CompositeVerifier({ jwks: new JwksVerifier(jwks, SUPABASE_URL) }) });
    const call = (token?: string, header?: string) =>
      app.request('https://arena.dualmindlab.tech/api/v2/me', {
        headers: header ? { Authorization: header } : token ? { Authorization: `Bearer ${token}` } : {},
      }, {});
    return { privateKey, app, call };
  }

  it('answers 200 with the claims for a valid token, private and no-store', async () => {
    const { privateKey, call } = await setup();
    const response = await call(await sign(privateKey));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    const body = (await response.json()) as { userId: string; role: string; expiresAt: string };
    expect(body.userId).toBe(USER_ID);
    expect(body.role).toBe('authenticated');
    expect(new Date(body.expiresAt).toISOString()).toBe(body.expiresAt);
  });

  it('answers 401 problems with WWW-Authenticate', async () => {
    const { privateKey, call } = await setup();
    const missing = await call();
    expect(missing.status).toBe(401);
    expect(missing.headers.get('www-authenticate')).toBe('Bearer');
    expect(missing.headers.get('content-type')).toContain('application/problem+json');
    expect(await missing.json()).toMatchObject({ status: 401, type: expect.stringContaining('/problems/unauthorized') });

    const expired = await call(await sign(privateKey, { expiresIn: Math.floor(Date.now() / 1000) - 3600 }));
    expect(expired.status).toBe(401);
    expect(expired.headers.get('www-authenticate')).toBe('Bearer error="invalid_token"');

    const malformed = await call(undefined, 'Basic abc');
    expect(malformed.status).toBe(401);
    expect((await call('garbage')).status).toBe(401);
  });

  it('answers 501 not_enabled when no verifier is configured', async () => {
    const app = createApp({ verifier: () => null });
    const response = await app.request('https://arena.dualmindlab.tech/api/v2/me', {}, {});
    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({ status: 501, feature: 'auth', type: expect.stringContaining('/problems/not_enabled') });
  });
});
