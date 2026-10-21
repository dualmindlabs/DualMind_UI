import { createContext, useContext, useSyncExternalStore } from 'react';

import type { AuthClient, AuthState, AuthStore } from '@/lib/supabase';

/** Provided by <AuthProvider> (components/layout/auth-provider.tsx), mounted once in the root. */
export const AuthStoreContext = createContext<AuthStore | null>(null);

export function useAuthStore(): AuthStore {
  const store = useContext(AuthStoreContext);
  if (!store) {
    throw new Error('useAuth() needs <AuthProvider> (see components/layout/app-providers.tsx).');
  }
  return store;
}

export interface UseAuthResult extends AuthState {
  /** The Supabase client, loaded on demand. Rejects when sign-in is unavailable. */
  client: () => Promise<AuthClient>;
  /** Signs out and clears the user's local data (vote queue, legacy keys, cached profile). */
  signOut: () => Promise<void>;
}

/**
 * The session, the user, the API profile and the auth status (`loading`, `signed-in`,
 * `signed-out`, `unavailable`). Prerendered HTML always renders `loading` (or `unavailable` when
 * the build has no Supabase settings); the real state arrives after hydration.
 */
export function useAuth(): UseAuthResult {
  const store = useAuthStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return { ...state, client: store.client, signOut: store.signOut };
}
