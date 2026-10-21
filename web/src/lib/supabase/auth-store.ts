/**
 * The auth state of the page, as a small external store (read in React with
 * useSyncExternalStore through `useAuth()`, components/layout/auth-provider.tsx).
 *
 * States: `loading` (prerendered HTML and the first moments after hydration), `signed-in`,
 * `signed-out`, and `unavailable` (this build has no Supabase settings). `authReducer` is the
 * whole state machine, pure and unit-tested; the store around it talks to supabase-js.
 *
 * supabase-js is only loaded when there is something to read: a stored session (supabase-js's
 * key or the legacy copy) or auth parameters in the URL. Everyone else is `signed-out` at once,
 * so public pages never download the auth library. A page that needs the client (to sign in)
 * calls `client()`, which loads it then.
 */
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import type { SupabaseConfig } from '@/config/supabase';
import type { UserProfile } from '@/lib/api';
import { isOnline } from '@/lib/network/online-status';
import { hasAuthParams, hasStoredSession } from '@/lib/session/handoff';

import { type AuthClient, SupabaseUnavailableError } from './client';
import { landingUrl } from './landing-url';
import { migrateLegacySession } from './migration';
import { readCachedProfile, writeCachedProfile } from './profile';
import {
  browserLocalStorage,
  browserSessionStorage,
  clearSignedOutData,
  type KeyValueStorage,
  type ScannableStorage,
  writeLegacySession,
} from './storage';

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unavailable';

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /** From POST /api/users/sync; null until it answers (or when it fails). */
  profile: UserProfile | null;
  /** The last Supabase auth event, e.g. `PASSWORD_RECOVERY` after a reset link. */
  lastEvent: AuthChangeEvent | null;
}

export type AuthAction =
  | { type: 'unavailable' }
  | { type: 'session'; session: Session | null; event?: AuthChangeEvent | null }
  | { type: 'profile'; userId: string; profile: UserProfile | null };

export const INITIAL_AUTH_STATE: AuthState = Object.freeze({
  status: 'loading',
  session: null,
  user: null,
  profile: null,
  lastEvent: null,
});

export const UNAVAILABLE_AUTH_STATE: AuthState = Object.freeze({
  ...INITIAL_AUTH_STATE,
  status: 'unavailable',
});

/** The state machine. `unavailable` is final: without settings there is nothing to change. */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  if (state.status === 'unavailable') return state;
  switch (action.type) {
    case 'unavailable':
      return UNAVAILABLE_AUTH_STATE;
    case 'session': {
      const lastEvent = action.event ?? state.lastEvent;
      const { session } = action;
      if (!session) {
        if (state.status === 'signed-out' && state.lastEvent === lastEvent) return state;
        return { status: 'signed-out', session: null, user: null, profile: null, lastEvent };
      }
      const sameUser = state.user?.id === session.user.id;
      return {
        status: 'signed-in',
        session,
        user: session.user,
        profile: sameUser ? state.profile : null,
        lastEvent,
      };
    }
    case 'profile':
      return state.status === 'signed-in' && state.user?.id === action.userId
        ? { ...state, profile: action.profile }
        : state;
  }
}

export interface AuthStoreOptions {
  config: SupabaseConfig | null;
  /** Loads supabase-js and returns the app's client (lib/supabase/client.ts). */
  loadClient: () => Promise<AuthClient>;
  /** POST /api/users/sync for the signed-in user. Optional: no profile without it. */
  syncProfile?: ((session: Session) => Promise<UserProfile | null>) | undefined;
  /** Default: window.localStorage (null when blocked). */
  localStorage?: ScannableStorage | null | undefined;
  /** Default: window.sessionStorage (null when blocked). */
  sessionStorage?: KeyValueStorage | null | undefined;
  /** Default: the URL the page loaded with (landing-url.ts). */
  getLocation?: (() => Pick<Location, 'search' | 'hash'>) | undefined;
  /**
   * Removes tokens or link errors from the address bar once they are read, so they do not stay
   * in the history or get copied with the URL. Default: history.replaceState without the hash.
   */
  clearUrlTokens?: (() => void) | undefined;
  /**
   * Runs work outside Supabase's auth callback: calling Supabase (or the API client, which asks
   * Supabase for the token) inside it would wait on its own lock. Default: setTimeout(task, 0).
   */
  defer?: ((task: () => void) => void) | undefined;
  /** Default: `!navigator.onLine`. */
  isOffline?: (() => boolean) | undefined;
  /** Calls `callback` at the next `online` event; returns a cancel. Default: window's event. */
  onceOnline?: ((callback: () => void) => () => void) | undefined;
}

export interface AuthStore {
  getState: () => AuthState;
  subscribe: (listener: () => void) => () => void;
  /** Reads the session once (loading supabase-js only when needed). Safe to call again. */
  start: () => void;
  /** The client, loaded on demand and connected to this store. Rejects when unavailable. */
  client: () => Promise<AuthClient>;
  /** Signs out (all devices, as before), then clears the user's local data. Never throws. */
  signOut: () => Promise<void>;
  /** Stops listening to Supabase. */
  dispose: () => void;
}

const URL_TOKEN_RE = /[#&](access_token|refresh_token|provider_token|error_description)=/;

/** supabase-js has read the #hash by now; take the tokens out of the address bar. */
function clearTokensFromAddressBar(): void {
  try {
    const { hash, pathname, search } = window.location;
    if (!URL_TOKEN_RE.test(hash)) return;
    window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  } catch {
    // Not in a browser, or history is unavailable: nothing to clean.
  }
}

/**
 * A failed network call, as supabase-js reports it: `AuthRetryableFetchError` (a refresh that
 * could not reach Supabase, or got a 5xx) or the fetch's own TypeError. Not a session that was
 * revoked: that one is a 4xx and a real sign-out.
 */
function isNetworkAuthError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return (
    name === 'AuthRetryableFetchError' ||
    name === 'TypeError' ||
    (typeof message === 'string' && /failed to fetch|network|load failed/i.test(message))
  );
}

/**
 * The session supabase-js keeps in localStorage, read without supabase-js (it may be expired).
 * What the arena runs on while the network is down: the user stays signed in on this device,
 * and the real check happens when the network is back.
 */
function readStoredSession(storage: ScannableStorage | null, key: string): Session | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Session> | null;
    if (
      value &&
      typeof value.access_token === 'string' &&
      typeof value.refresh_token === 'string' &&
      typeof value.user?.id === 'string'
    ) {
      return value as Session;
    }
  } catch {
    // Corrupt or blocked storage: no stored session.
  }
  return null;
}

function onceOnlineInWindow(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback, { once: true });
  return () => window.removeEventListener('online', callback);
}

function safeHasStoredSession(storage: ScannableStorage | null): boolean {
  try {
    return storage !== null && hasStoredSession(storage);
  } catch {
    return false;
  }
}

export function createAuthStore(options: AuthStoreOptions): AuthStore {
  const { config } = options;
  const local = options.localStorage === undefined ? browserLocalStorage() : options.localStorage;
  const tab =
    options.sessionStorage === undefined ? browserSessionStorage() : options.sessionStorage;
  const getLocation = options.getLocation ?? landingUrl;
  const defer = options.defer ?? ((task: () => void) => void setTimeout(task, 0));
  const clearUrlTokens = options.clearUrlTokens ?? clearTokensFromAddressBar;
  const isOffline = options.isOffline ?? (() => !isOnline());
  const onceOnline = options.onceOnline ?? onceOnlineInWindow;
  let cancelRecheck: (() => void) | null = null;

  let state: AuthState = config ? INITIAL_AUTH_STATE : UNAVAILABLE_AUTH_STATE;
  const listeners = new Set<() => void>();
  let connecting: Promise<AuthClient> | null = null;
  let unsubscribe: (() => void) | null = null;
  let started = false;
  // Supabase events wait until the first read is done, so a brief "no session" before the
  // legacy migration finishes never reaches the page (a guard would redirect on it).
  let ready = false;
  let pendingEvent: AuthChangeEvent | null = null;
  let profileFor: string | null = null;

  const dispatch = (action: AuthAction) => {
    const next = authReducer(state, action);
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  };

  const syncProfile = (session: Session) => {
    const userId = session.user.id;
    if (!options.syncProfile || profileFor === userId) return;
    profileFor = userId;
    const cached = readCachedProfile(tab, userId);
    if (cached) {
      dispatch({ type: 'profile', userId, profile: cached });
      return;
    }
    const sync = options.syncProfile;
    defer(() => {
      sync(session)
        .then(profile => {
          if (profile) writeCachedProfile(tab, userId, profile);
          dispatch({ type: 'profile', userId, profile });
        })
        .catch(() => {
          // Not fatal: the profile stays null and the next session event tries again.
          if (profileFor === userId) profileFor = null;
        });
    });
  };

  const applySession = (session: Session | null, event: AuthChangeEvent | null) => {
    if (session) {
      writeLegacySession(local, session);
      dispatch({ type: 'session', session, event });
      syncProfile(session);
      return;
    }
    if (event === 'SIGNED_OUT') {
      clearSignedOutData(local, tab);
      profileFor = null;
    } else if (event !== null && state.status === 'signed-in' && isOffline()) {
      // A session that cannot be read or refreshed without a network is not a sign-out.
      return;
    }
    dispatch({ type: 'session', session: null, event });
  };

  const connect = (): Promise<AuthClient> => {
    if (!config) return Promise.reject(new SupabaseUnavailableError());
    connecting ??= options.loadClient().then(client => {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (!ready) {
          if (event !== 'INITIAL_SESSION') pendingEvent = event;
          return;
        }
        applySession(session, event);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      return client;
    });
    connecting.catch(() => {
      // A failed load (offline) may be retried by the next call.
      connecting = null;
    });
    return connecting;
  };

  const readSession = async () => {
    cancelRecheck?.();
    cancelRecheck = null;
    let session: Session | null = null;
    let offlineFailure = false;
    try {
      const client = await connect();
      // Resolves after supabase-js has read the URL (tokens or an error in the hash).
      const { data, error } = await client.auth.getSession();
      session = data.session;
      if (!session && error && (isNetworkAuthError(error) || isOffline())) offlineFailure = true;
      if (!session && !offlineFailure && config) {
        const migrated = await migrateLegacySession(client, local, config.storageKey);
        if (migrated.status === 'migrated') session = migrated.session;
      }
    } catch {
      // supabase-js could not load, or the read threw: with no network that says nothing about
      // the session itself.
      offlineFailure = true;
    }
    if (!session && offlineFailure && config) {
      // Keep the visitor in the arena on the session stored on this device, and check it for
      // real when the network is back.
      session = readStoredSession(local, config.storageKey);
      if (session) cancelRecheck = onceOnline(() => void readSession());
    }
    ready = true;
    clearUrlTokens();
    applySession(session, pendingEvent);
    pendingEvent = null;
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (started) return;
      started = true;
      if (!config) {
        dispatch({ type: 'unavailable' });
        return;
      }
      const location = getLocation();
      if (safeHasStoredSession(local) || hasAuthParams(location.search, location.hash)) {
        void readSession();
        return;
      }
      ready = true;
      dispatch({ type: 'session', session: null });
    },
    client: connect,
    async signOut() {
      if (!config) return;
      try {
        const client = await connect();
        const { error } = await client.auth.signOut();
        // Offline or a revoked session: at least forget it on this device.
        if (error) await client.auth.signOut({ scope: 'local' });
      } catch {
        // Clear locally below either way.
      }
      ready = true;
      applySession(null, 'SIGNED_OUT');
    },
    dispose() {
      cancelRecheck?.();
      cancelRecheck = null;
      unsubscribe?.();
      unsubscribe = null;
      listeners.clear();
    },
  };
}
