import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import {
  ARENA_ATTRIBUTE,
  ARENA_CHOICE_KEY,
  arenaChoiceFromSearch,
  handoffDestination,
  handoffTarget,
  hasAuthParams,
  hasStoredSession,
  landingView,
  LEGACY_APP_PATH,
  LEGACY_SESSION_KEY,
  NEW_ARENA_BY_DEFAULT,
  readArenaChoice,
  SESSION_HANDOFF_SCRIPT,
  usesNewArena,
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
  /** True when it marked <html> for the new arena. */
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

function runScript(
  location: { search?: string; hash?: string; pathname?: string },
  storage: ReturnType<typeof memoryStorage> | 'throws',
): string | null {
  return runScriptFull(location, storage).target;
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

describe('the new arena switch (slice S8)', () => {
  it('reads the choice from the URL first, then from storage', () => {
    expect(arenaChoiceFromSearch('?arena=new')).toBe('new');
    expect(arenaChoiceFromSearch('?x=1&arena=legacy')).toBe('legacy');
    expect(arenaChoiceFromSearch('?arena=newer')).toBeNull();
    expect(readArenaChoice('', memoryStorage({ [ARENA_CHOICE_KEY]: 'new' }))).toBe('new');
    expect(readArenaChoice('?arena=legacy', memoryStorage({ [ARENA_CHOICE_KEY]: 'new' }))).toBe(
      'legacy',
    );
    expect(readArenaChoice('', memoryStorage({ [ARENA_CHOICE_KEY]: 'maybe' }))).toBeNull();
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readArenaChoice('', throwing)).toBeNull();
    expect(readArenaChoice('', null)).toBeNull();
  });

  it('is opt-in while the battle flow is built', () => {
    expect(NEW_ARENA_BY_DEFAULT).toBe(false);
    expect(usesNewArena(null)).toBe(false);
    expect(usesNewArena('legacy')).toBe(false);
    expect(usesNewArena('new')).toBe(true);
  });

  const SIGNED_IN = { 'sb-abcdefghijkl-auth-token': SESSION };

  it('keeps a signed-in visitor who opted in on / and marks <html>', () => {
    const storage = memoryStorage({ ...SIGNED_IN, [ARENA_CHOICE_KEY]: 'new' });
    expect(landingView({ search: '', hash: '' }, storage)).toEqual({ kind: 'arena' });
    expect(runScriptFull({}, storage)).toEqual({ target: null, marked: true });
  });

  it('?arena=new opts in and stores the choice; ?arena=legacy opts out again', () => {
    const storage = memoryStorage(SIGNED_IN);
    expect(runScriptFull({ search: '?arena=new' }, storage)).toEqual({
      target: null,
      marked: true,
    });
    expect(storage.data[ARENA_CHOICE_KEY]).toBe('new');
    expect(runScriptFull({}, storage)).toEqual({ target: null, marked: true });
    expect(runScriptFull({ search: '?arena=legacy' }, storage)).toEqual({
      target: `${LEGACY_APP_PATH}?arena=legacy`,
      marked: false,
    });
    expect(storage.data[ARENA_CHOICE_KEY]).toBe('legacy');
  });

  it('a signed-out visitor who opted in sees the landing page, unmarked', () => {
    const storage = memoryStorage({});
    expect(runScriptFull({ search: '?arena=new' }, storage)).toEqual({
      target: null,
      marked: false,
    });
    expect(landingView({ search: '?arena=new', hash: '' }, storage)).toEqual({ kind: 'landing' });
  });

  it('auth parameters still go to the legacy arena, opted in or not', () => {
    const storage = memoryStorage({ ...SIGNED_IN, [ARENA_CHOICE_KEY]: 'new' });
    const hash = '#access_token=a&refresh_token=b';
    expect(runScriptFull({ hash }, storage)).toEqual({
      target: `${LEGACY_APP_PATH}${hash}`,
      marked: false,
    });
  });

  it('keeps ?thread= deep links for the new arena', () => {
    const storage = memoryStorage({ ...SIGNED_IN, [ARENA_CHOICE_KEY]: 'new' });
    expect(runScriptFull({ search: '?thread=abc' }, storage)).toEqual({
      target: null,
      marked: true,
    });
  });

  it('blocked storage counts as signed out, even with ?arena=new', () => {
    expect(runScriptFull({ search: '?arena=new' }, 'throws')).toEqual({
      target: null,
      marked: false,
    });
  });
});
