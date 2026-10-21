import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { SupabaseConfig } from '@/config/supabase';
import {
  authReducer,
  type AuthState,
  createAuthStore,
  INITIAL_AUTH_STATE,
  UNAVAILABLE_AUTH_STATE,
} from '@/lib/supabase';

import { fakeSession, fakeUser, memoryStorage } from './helpers';

const CONFIG: SupabaseConfig = {
  url: 'https://abcd.supabase.co',
  anonKey: 'anon',
  projectRef: 'abcd',
  storageKey: 'sb-abcd-auth-token',
};

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

/** A Supabase client stand-in: getSession answers `initial`, events are fired by hand. */
function fakeClient(initial: Session | null = null) {
  const listeners = new Set<Listener>();
  const auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: initial }, error: null })),
    setSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: { status: 400 } })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn((listener: Listener) => {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    }),
  };
  return {
    client: { auth } as never,
    auth,
    emit: (event: AuthChangeEvent, session: Session | null) =>
      listeners.forEach(listener => listener(event, session)),
  };
}

function setup({
  initial = null,
  local = memoryStorage(),
  tab = memoryStorage(),
  hash = '',
  syncProfile,
}: {
  initial?: Session | null;
  local?: ReturnType<typeof memoryStorage>;
  tab?: ReturnType<typeof memoryStorage>;
  hash?: string;
  syncProfile?: (session: Session) => Promise<{ role: string | null } | null>;
} = {}) {
  const fake = fakeClient(initial);
  const loadClient = vi.fn(() => Promise.resolve(fake.client));
  const store = createAuthStore({
    config: CONFIG,
    loadClient,
    syncProfile: syncProfile as never,
    localStorage: local,
    sessionStorage: tab,
    getLocation: () => ({ search: '', hash }),
    defer: task => task(),
  });
  return { store, loadClient, local, tab, ...fake };
}

async function settled() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('authReducer', () => {
  const session = fakeSession();

  it('moves from loading to signed in and out', () => {
    const signedIn = authReducer(INITIAL_AUTH_STATE, { type: 'session', session });
    expect(signedIn).toMatchObject({ status: 'signed-in', session, user: session.user });
    const out = authReducer(signedIn, { type: 'session', session: null, event: 'SIGNED_OUT' });
    expect(out).toEqual({
      status: 'signed-out',
      session: null,
      user: null,
      profile: null,
      lastEvent: 'SIGNED_OUT',
    });
    expect(authReducer(out, { type: 'session', session: null })).toBe(out);
  });

  it('keeps the profile for the same user and drops it for another', () => {
    const withProfile: AuthState = {
      ...authReducer(INITIAL_AUTH_STATE, { type: 'session', session }),
      profile: { role: 'tester' } as never,
    };
    const refreshed = authReducer(withProfile, {
      type: 'session',
      session: fakeSession({ access_token: 'access-2' }),
      event: 'TOKEN_REFRESHED',
    });
    expect(refreshed.profile).toEqual({ role: 'tester' });
    const other = authReducer(withProfile, {
      type: 'session',
      session: fakeSession({ user: fakeUser({ id: 'user-2' }) }),
    });
    expect(other.profile).toBeNull();
  });

  it('applies a profile only to the signed-in user it belongs to', () => {
    const signedIn = authReducer(INITIAL_AUTH_STATE, { type: 'session', session });
    const profile = { role: 'tester' } as never;
    expect(authReducer(signedIn, { type: 'profile', userId: 'user-1', profile }).profile).toBe(
      profile,
    );
    expect(authReducer(signedIn, { type: 'profile', userId: 'other', profile })).toBe(signedIn);
    expect(authReducer(INITIAL_AUTH_STATE, { type: 'profile', userId: 'user-1', profile })).toBe(
      INITIAL_AUTH_STATE,
    );
  });

  it('treats unavailable as final', () => {
    expect(authReducer(INITIAL_AUTH_STATE, { type: 'unavailable' })).toBe(UNAVAILABLE_AUTH_STATE);
    expect(authReducer(UNAVAILABLE_AUTH_STATE, { type: 'session', session })).toBe(
      UNAVAILABLE_AUTH_STATE,
    );
  });
});

describe('createAuthStore', () => {
  it('is unavailable without settings, and never loads supabase-js', async () => {
    const loadClient = vi.fn(() => Promise.reject(new Error('not used')));
    const store = createAuthStore({ config: null, loadClient, localStorage: null });
    expect(store.getState().status).toBe('unavailable');
    store.start();
    await expect(store.client()).rejects.toThrow(/not configured/);
    await store.signOut();
    expect(loadClient).not.toHaveBeenCalled();
  });

  it('is signed out at once without a stored session or URL tokens (no download)', () => {
    const { store, loadClient } = setup();
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getState().status));
    expect(store.getState().status).toBe('loading');
    store.start();
    store.start();
    expect(store.getState().status).toBe('signed-out');
    expect(seen).toEqual(['signed-out']);
    expect(loadClient).not.toHaveBeenCalled();
  });

  it('reads a stored session, mirrors it for the legacy arena and syncs the profile once', async () => {
    const session = fakeSession();
    const local = memoryStorage({ [CONFIG.storageKey]: JSON.stringify(session) });
    const tab = memoryStorage();
    const syncProfile = vi.fn(() => Promise.resolve({ role: 'tester' }));
    const { store, emit } = setup({ initial: session, local, tab, syncProfile });
    store.start();
    await settled();
    expect(store.getState()).toMatchObject({ status: 'signed-in', user: { id: 'user-1' } });
    expect(store.getState().profile).toEqual({ role: 'tester' });
    expect(JSON.parse(local.getItem('dualmind.auth.supabase') ?? '{}')).toMatchObject({
      session: { access_token: 'access-1' },
      user: { id: 'user-1' },
    });
    expect(JSON.parse(tab.getItem('dm.profile.v1') ?? '{}')).toEqual({
      userId: 'user-1',
      profile: { role: 'tester' },
    });
    emit('TOKEN_REFRESHED', fakeSession({ access_token: 'access-2' }));
    await settled();
    expect(store.getState().session?.access_token).toBe('access-2');
    expect(syncProfile).toHaveBeenCalledTimes(1);
  });

  it('uses the cached profile instead of calling the API again in the same tab', async () => {
    const session = fakeSession();
    const tab = memoryStorage({
      'dm.profile.v1': JSON.stringify({ userId: 'user-1', profile: { role: 'cached' } }),
    });
    const syncProfile = vi.fn(() => Promise.resolve({ role: 'fresh' }));
    const { store } = setup({
      initial: session,
      local: memoryStorage({ [CONFIG.storageKey]: '{}' }),
      tab,
      syncProfile,
    });
    store.start();
    await settled();
    expect(store.getState().profile).toEqual({ role: 'cached' });
    expect(syncProfile).not.toHaveBeenCalled();
  });

  it('loads the client for tokens in the URL and remembers the recovery event', async () => {
    const session = fakeSession();
    const { store, emit, loadClient } = setup({
      initial: session,
      hash: '#access_token=a&refresh_token=b&type=recovery',
    });
    store.start();
    await Promise.resolve();
    expect(loadClient).toHaveBeenCalledTimes(1);
    emit('PASSWORD_RECOVERY', session);
    await settled();
    expect(store.getState()).toMatchObject({
      status: 'signed-in',
      lastEvent: 'PASSWORD_RECOVERY',
    });
  });

  it('migrates a session that only the legacy key holds, without a signed-out flash', async () => {
    const migrated = fakeSession({ access_token: 'migrated' });
    const local = memoryStorage({
      'dualmind.auth.supabase': JSON.stringify({
        session: { access_token: 'a', refresh_token: 'r' },
      }),
    });
    const { store, auth, emit } = setup({ local });
    auth.setSession.mockResolvedValueOnce({ data: { session: migrated }, error: null } as never);
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getState().status));
    store.start();
    // supabase-js reports "no session" before the migration finishes: the store waits.
    emit('INITIAL_SESSION', null);
    await settled();
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
    expect(store.getState().session?.access_token).toBe('migrated');
    expect(seen).toEqual(['signed-in']);
  });

  it('signs out: Supabase first, then the vote queue, legacy keys and cached profile', async () => {
    const session = fakeSession();
    const local = memoryStorage({
      [CONFIG.storageKey]: '{}',
      'dm.voteQueue.v1': '{"version":1,"votes":[]}',
      'dualmind.auth.token': 'x',
      'supabase.auth.token': 'y',
      'dm.theme': 'dark',
    });
    const tab = memoryStorage({ 'dm.profile.v1': '{}' });
    const { store, auth } = setup({ initial: session, local, tab });
    store.start();
    await settled();
    expect(store.getState().status).toBe('signed-in');
    await store.signOut();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({ status: 'signed-out', lastEvent: 'SIGNED_OUT' });
    expect([...local.map.keys()].sort()).toEqual(['dm.theme', CONFIG.storageKey]);
    expect(tab.getItem('dm.profile.v1')).toBeNull();
  });

  it('forgets the session locally when the server sign-out fails', async () => {
    const { store, auth } = setup({
      initial: fakeSession(),
      local: memoryStorage({ [CONFIG.storageKey]: '{}' }),
    });
    auth.signOut.mockResolvedValueOnce({ error: { status: 500 } } as never);
    store.start();
    await settled();
    await store.signOut();
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
    expect(store.getState().status).toBe('signed-out');
  });

  it('is signed out when supabase-js cannot load, and retries the load later', async () => {
    const loadClient = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce(fakeClient().client);
    const store = createAuthStore({
      config: CONFIG,
      loadClient,
      localStorage: memoryStorage({ [CONFIG.storageKey]: '{}' }),
      sessionStorage: null,
      getLocation: () => ({ search: '', hash: '' }),
    });
    store.start();
    await settled();
    expect(store.getState().status).toBe('signed-out');
    await expect(store.client()).resolves.toBeDefined();
    expect(loadClient).toHaveBeenCalledTimes(2);
  });
});
