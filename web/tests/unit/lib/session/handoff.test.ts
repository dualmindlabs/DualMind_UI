import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import {
  ARENA_ATTRIBUTE,
  handoffDestination,
  hasAuthParams,
  hasStoredSession,
  landingView,
  LEGACY_SESSION_KEY,
  SESSION_HANDOFF_SCRIPT,
  wantsSessionHandoff,
} from '@/lib/session/handoff';

/** A Storage stand-in with the members the hand-off reads and writes. */
function memoryStorage(entries: Record<string, string>) {
  const data = { ...entries };
  return {
    get length() {
      return Object.keys(data).length;
    },
    key: (index: number) => Object.keys(data)[index] ?? null,
    getItem: (key: string) =>
      Object.prototype.hasOwnProperty.call(data, key) ? (data[key] ?? null) : null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    data,
  };
}

interface ScriptRun {
  /** Where the script sent the visitor, or null. */
  target: string | null;
  /** True when it marked <html> for the arena. */
  marked: boolean;
}

/** Runs the inline <head> script with a fake location, storage and document. */
function runScriptFull(
  { search = '', hash = '', pathname = '/' }: { search?: string; hash?: string; pathname?: string },
  storage: ReturnType<typeof memoryStorage> | 'throws',
): ScriptRun {
  const replace = vi.fn<(url: string) => void>();
  const setAttribute = vi.fn<(name: string, value: string) => void>();
  const window = {
    location: { pathname, search, hash, replace },
    get localStorage() {
      if (storage === 'throws') throw new Error('SecurityError');
      return storage;
    },
    document: { documentElement: { setAttribute } },
  };
  // The script reads `window.location`, `window.localStorage` and `window.document` only.
  runInNewContext(SESSION_HANDOFF_SCRIPT, { window });
  return {
    target: replace.mock.calls[0]?.[0] ?? null,
    marked: setAttribute.mock.calls.some(([name]) => name === ARENA_ATTRIBUTE),
  };
}

const SESSION = '{"access_token":"x","refresh_token":"y"}';

const SIGNED_IN = { 'sb-abcdefghijkl-auth-token': SESSION };
const OAUTH_HASH = '#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer';

const cases: Array<{
  name: string;
  search?: string;
  hash?: string;
  storage?: Record<string, string>;
  /** Where the visitor is sent, or null to stay on / */
  target: string | null;
  /** Whether <html> is marked for the arena. */
  marked: boolean;
}> = [
  { name: 'a signed-out visitor sees the landing page', target: null, marked: false },
  {
    name: 'unrelated params stay on the landing page',
    search: '?ref=newsletter&utm_source=x',
    hash: '#how',
    target: null,
    marked: false,
  },
  {
    name: 'the old session key gets the arena',
    storage: { [LEGACY_SESSION_KEY]: SESSION },
    target: null,
    marked: true,
  },
  {
    name: 'a supabase-js session key gets the arena, query and hash untouched',
    search: '?preview=dualmind-preview',
    hash: '#top',
    storage: { 'dm.theme': 'dark', ...SIGNED_IN },
    target: null,
    marked: true,
  },
  {
    name: 'a PKCE verifier alone is not a session',
    storage: { 'sb-abcdefghijkl-auth-token-code-verifier': 'v' },
    target: null,
    marked: false,
  },
  {
    name: 'empty or "null" sessions do not count',
    storage: { [LEGACY_SESSION_KEY]: 'null', 'sb-x-auth-token': '' },
    target: null,
    marked: false,
  },
  { name: 'an OAuth return in the hash stays for the app', hash: OAUTH_HASH, target: null, marked: true },
  { name: 'a PKCE code stays for the app', search: '?code=123abc', target: null, marked: true },
  {
    name: 'an email token hash stays for the app',
    search: '?token_hash=t&type=signup',
    target: null,
    marked: true,
  },
  { name: 'a magic link stays for the app', hash: '#type=magiclink', target: null, marked: true },
  {
    name: 'a recovery link goes on to the new password page, hash kept',
    hash: '#access_token=abc&type=recovery',
    target: '/update-password.html#access_token=abc&type=recovery',
    marked: false,
  },
  {
    name: 'type=recovery alone goes on to the new password page',
    search: '?type=recovery',
    target: '/update-password.html?type=recovery',
    marked: false,
  },
  {
    name: 'look-alike params stay',
    search: '?promo_code=1&type=recoveryx',
    hash: '#my_access_token',
    target: null,
    marked: false,
  },
  {
    name: 'a leftover ?arena=legacy changes nothing',
    search: '?arena=legacy',
    storage: SIGNED_IN,
    target: null,
    marked: true,
  },
  {
    name: 'a leftover dm.arena=legacy changes nothing',
    storage: { ...SIGNED_IN, 'dm.arena': 'legacy' },
    target: null,
    marked: true,
  },
  {
    name: 'a signed-out visitor with a leftover choice sees the landing page',
    search: '?arena=new',
    storage: { 'dm.arena': 'legacy' },
    target: null,
    marked: false,
  },
  {
    name: '?thread= deep links stay for the arena',
    search: '?thread=abc',
    storage: SIGNED_IN,
    target: null,
    marked: true,
  },
];

describe('signed-in switch at /', () => {
  it.each(cases)('$name (TypeScript rules)', ({ search = '', hash = '', storage = {}, target }) => {
    expect(handoffDestination({ search, hash }, memoryStorage(storage))).toBe(target);
  });

  it.each(cases)(
    '$name (inline script)',
    ({ search = '', hash = '', storage = {}, target, marked }) => {
      expect(runScriptFull({ search, hash }, memoryStorage(storage))).toEqual({ target, marked });
    },
  );

  it('the script never changes the stored data', () => {
    const storage = memoryStorage({ ...SIGNED_IN, 'dm.arena': 'legacy' });
    runScriptFull({ search: '?arena=legacy' }, storage);
    expect(storage.data).toEqual({ ...SIGNED_IN, 'dm.arena': 'legacy' });
  });

  it('there is no classic arena to send anyone to', () => {
    expect(SESSION_HANDOFF_SCRIPT).not.toContain('legacy-app');
    expect(SESSION_HANDOFF_SCRIPT).not.toContain('dm.arena');
  });

  it('treats storage that cannot be read as signed out, but still follows auth params', () => {
    expect(runScriptFull({}, 'throws')).toEqual({ target: null, marked: false });
    expect(runScriptFull({ search: '?code=1' }, 'throws')).toEqual({ target: null, marked: true });
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

  it('decides the view', () => {
    expect(landingView({ search: '', hash: '' }, memoryStorage(SIGNED_IN))).toEqual({
      kind: 'arena',
    });
    expect(landingView({ search: '', hash: '' }, memoryStorage({}))).toEqual({ kind: 'landing' });
    expect(landingView({ search: '?code=1', hash: '' }, memoryStorage({}))).toEqual({
      kind: 'arena',
    });
  });

  it('exposes the rules on their own', () => {
    expect(hasStoredSession(memoryStorage({ [LEGACY_SESSION_KEY]: SESSION }))).toBe(true);
    expect(hasAuthParams('', '#refresh_token=x')).toBe(true);
    expect(hasAuthParams('?x=1', '')).toBe(false);
  });

  it('is a tiny, self-contained script that replaces the history entry', () => {
    expect(SESSION_HANDOFF_SCRIPT.length).toBeLessThan(1000);
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

describe('the script outside the landing page', () => {
  // The SPA fallback page is rendered from the / route, so the script is in its HTML too.
  it.each(['/auth-callback.html', '/update-password.html', '/login/'])(
    'does nothing on %s, even with tokens and a session',
    pathname => {
      const hash = '#access_token=a&refresh_token=b&type=recovery';
      const storage = { 'dualmind.auth.supabase': '{"access_token":"x"}' };
      expect(runScriptFull({ pathname, hash }, memoryStorage(storage))).toEqual({
        target: null,
        marked: false,
      });
      expect(handoffDestination({ pathname, search: '', hash }, memoryStorage(storage))).toBeNull();
    },
  );
});
