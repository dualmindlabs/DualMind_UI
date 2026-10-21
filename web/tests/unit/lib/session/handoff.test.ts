import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import {
  handoffDestination,
  handoffTarget,
  hasAuthParams,
  hasStoredSession,
  LEGACY_APP_PATH,
  LEGACY_SESSION_KEY,
  SESSION_HANDOFF_SCRIPT,
  wantsSessionHandoff,
} from '@/lib/session/handoff';

/** A Storage stand-in with the three members the hand-off reads. */
function memoryStorage(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) =>
      Object.prototype.hasOwnProperty.call(entries, key) ? (entries[key] ?? null) : null,
  };
}

/** Runs the inline <head> script with a fake location and storage; returns where it went. */
function runScript(
  { search = '', hash = '', pathname = '/' }: { search?: string; hash?: string; pathname?: string },
  storage: ReturnType<typeof memoryStorage> | 'throws',
): string | null {
  const replace = vi.fn<(url: string) => void>();
  const window = {
    location: { pathname, search, hash, replace },
    get localStorage() {
      if (storage === 'throws') throw new Error('SecurityError');
      return storage;
    },
  };
  // The script reads `window.location` and `window.localStorage` only.
  runInNewContext(SESSION_HANDOFF_SCRIPT, { window });
  return replace.mock.calls[0]?.[0] ?? null;
}

const SESSION = '{"access_token":"x","refresh_token":"y"}';

const cases: Array<{
  name: string;
  search?: string;
  hash?: string;
  storage?: Record<string, string>;
  expected: string | null;
}> = [
  { name: 'a signed-out visitor stays', expected: null },
  {
    name: 'unrelated params stay',
    search: '?ref=newsletter&utm_source=x',
    hash: '#how',
    expected: null,
  },
  {
    name: 'the legacy session key hands off',
    storage: { [LEGACY_SESSION_KEY]: SESSION },
    expected: LEGACY_APP_PATH,
  },
  {
    name: 'a supabase-js session key hands off, query and hash kept',
    search: '?preview=dualmind-preview',
    hash: '#top',
    storage: { 'dm.theme': 'dark', 'sb-abcdefghijkl-auth-token': SESSION },
    expected: `${LEGACY_APP_PATH}?preview=dualmind-preview#top`,
  },
  {
    name: 'a PKCE verifier alone is not a session',
    storage: { 'sb-abcdefghijkl-auth-token-code-verifier': 'v' },
    expected: null,
  },
  {
    name: 'empty or "null" sessions do not count',
    storage: { [LEGACY_SESSION_KEY]: 'null', 'sb-x-auth-token': '' },
    expected: null,
  },
  {
    name: 'an OAuth return in the hash hands off with its hash',
    hash: '#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer',
    expected: `${LEGACY_APP_PATH}#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer`,
  },
  {
    name: 'a recovery link hands off',
    hash: '#access_token=abc&type=recovery',
    expected: `${LEGACY_APP_PATH}#access_token=abc&type=recovery`,
  },
  {
    name: 'type=recovery alone hands off',
    search: '?type=recovery',
    expected: `${LEGACY_APP_PATH}?type=recovery`,
  },
  {
    name: 'a PKCE code hands off',
    search: '?code=123abc',
    expected: `${LEGACY_APP_PATH}?code=123abc`,
  },
  {
    name: 'an email token hash hands off',
    search: '?token_hash=t&type=signup',
    expected: `${LEGACY_APP_PATH}?token_hash=t&type=signup`,
  },
  {
    name: 'look-alike params stay',
    search: '?promo_code=1&type=recoveryx',
    hash: '#my_access_token',
    expected: null,
  },
];

describe('signed-in hand-off', () => {
  it.each(cases)(
    '$name (TypeScript rules)',
    ({ search = '', hash = '', storage = {}, expected }) => {
      expect(handoffDestination({ search, hash }, memoryStorage(storage))).toBe(expected);
    },
  );

  it.each(cases)('$name (inline script)', ({ search = '', hash = '', storage = {}, expected }) => {
    expect(runScript({ search, hash }, memoryStorage(storage))).toBe(expected);
  });

  it('treats storage that cannot be read as signed out, but still follows auth params', () => {
    expect(runScript({}, 'throws')).toBeNull();
    expect(runScript({ search: '?code=1' }, 'throws')).toBe(`${LEGACY_APP_PATH}?code=1`);
    const throwing = {
      length: 1,
      key: () => {
        throw new Error('blocked');
      },
      getItem: () => null,
    };
    expect(handoffDestination({ search: '', hash: '' }, throwing)).toBeNull();
    expect(handoffDestination({ search: '', hash: '' }, null)).toBeNull();
  });

  it('exposes the rules on their own', () => {
    expect(hasStoredSession(memoryStorage({ [LEGACY_SESSION_KEY]: SESSION }))).toBe(true);
    expect(hasAuthParams('', '#refresh_token=x')).toBe(true);
    expect(hasAuthParams('?x=1', '')).toBe(false);
    expect(handoffTarget('?a=1', '#b')).toBe('/legacy-app.html?a=1#b');
  });

  it('is a tiny, self-contained script that replaces the history entry', () => {
    expect(SESSION_HANDOFF_SCRIPT.length).toBeLessThan(700);
    expect(SESSION_HANDOFF_SCRIPT).toContain('.replace(');
    expect(SESSION_HANDOFF_SCRIPT).not.toMatch(/\bimport\b|\brequire\b|=>/);
  });

  it('recognises route handles that ask for it', () => {
    expect(wantsSessionHandoff({ sessionHandoff: true })).toBe(true);
    expect(wantsSessionHandoff({ sessionHandoff: 'yes' })).toBe(false);
    expect(wantsSessionHandoff(undefined)).toBe(false);
    expect(wantsSessionHandoff(null)).toBe(false);
  });
});

describe('the hand-off outside the landing page', () => {
  // The SPA fallback page is rendered from the / route, so the script is in its HTML too.
  it.each(['/auth-callback.html', '/update-password.html', '/login/'])(
    'does nothing on %s, even with tokens and a session',
    pathname => {
      const hash = '#access_token=a&refresh_token=b&type=recovery';
      const storage = { 'dualmind.auth.supabase': '{"access_token":"x"}' };
      expect(runScript({ pathname, hash }, memoryStorage(storage))).toBeNull();
      expect(handoffDestination({ pathname, search: '', hash }, memoryStorage(storage))).toBeNull();
    },
  );
});
