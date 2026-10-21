import { describe, expect, it } from 'vitest';

import { isSecretKey, parseSupabaseConfig, supabaseConfig } from '@/config/supabase';

/** A JWT-shaped key with this payload (the signature is not checked). */
function jwt(payload: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('parseSupabaseConfig', () => {
  it('reads the project URL and anon key and derives the default storage key', () => {
    const result = parseSupabaseConfig({
      VITE_SUPABASE_URL: ' https://abcd1234.supabase.co/ ',
      VITE_SUPABASE_ANON_KEY: jwt({ role: 'anon' }),
    });
    expect(result).toEqual({
      status: 'ok',
      config: {
        url: 'https://abcd1234.supabase.co',
        anonKey: jwt({ role: 'anon' }),
        projectRef: 'abcd1234',
        storageKey: 'sb-abcd1234-auth-token',
      },
    });
  });

  it('accepts publishable keys and a local Supabase on http', () => {
    const result = parseSupabaseConfig({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc',
    });
    expect(result.status).toBe('ok');
  });

  it('is "missing" without both values, so the pages show sign-in unavailable', () => {
    expect(parseSupabaseConfig({}).status).toBe('missing');
    expect(parseSupabaseConfig({ VITE_SUPABASE_URL: 'https://a.supabase.co' }).status).toBe(
      'missing',
    );
    expect(
      parseSupabaseConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_ANON_KEY: 'key' }).status,
    ).toBe('missing');
  });

  it('rejects unusable URLs and secret keys without throwing', () => {
    expect(
      parseSupabaseConfig({ VITE_SUPABASE_URL: 'abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }),
    ).toMatchObject({ status: 'invalid' });
    expect(
      parseSupabaseConfig({
        VITE_SUPABASE_URL: 'http://abc.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'k',
      }),
    ).toMatchObject({ status: 'invalid', reason: expect.stringMatching(/https/) as string });
    expect(
      parseSupabaseConfig({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_ANON_KEY: jwt({ role: 'service_role' }),
      }),
    ).toMatchObject({ status: 'invalid', reason: expect.stringMatching(/anon key/) as string });
  });

  it('spots secret keys', () => {
    expect(isSecretKey('sb_secret_123')).toBe(true);
    expect(isSecretKey(jwt({ role: 'service_role' }))).toBe(true);
    expect(isSecretKey(jwt({ role: 'anon' }))).toBe(false);
    expect(isSecretKey('sb_publishable_123')).toBe(false);
    expect(isSecretKey('not.a.jwt!')).toBe(false);
  });

  it('is null in the unit tests, which build without Supabase settings', () => {
    expect(supabaseConfig).toBeNull();
  });
});
