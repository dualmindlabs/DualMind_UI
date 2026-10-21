import { type ReactNode, useEffect, useState } from 'react';

import { supabaseConfig } from '@/config/supabase';
import { useApiClient } from '@/hooks/use-api-client';
import { AuthStoreContext } from '@/hooks/use-auth';
import {
  type AuthStore,
  createAuthStore,
  loadSupabaseClient,
  toUserSyncInput,
} from '@/lib/supabase';

export interface AuthProviderProps {
  children: ReactNode;
  /** The auth store; defaults to one on the build's Supabase settings (tests pass their own). */
  store?: AuthStore;
}

/**
 * The page's auth state for every component (read with useAuth()), mounted once in the root
 * inside <ApiProvider>, whose client syncs the profile (POST /api/users/sync). After hydration it
 * reads the session; supabase-js loads only when there is a session or auth data in the URL.
 */
export function AuthProvider({ children, store }: AuthProviderProps) {
  const api = useApiClient();
  const [auth] = useState(
    () =>
      store ??
      createAuthStore({
        config: supabaseConfig,
        loadClient: () => loadSupabaseClient(supabaseConfig),
        syncProfile: session => api.syncUser(toUserSyncInput(session.user)),
      }),
  );

  useEffect(() => {
    auth.start();
  }, [auth]);

  return <AuthStoreContext.Provider value={auth}>{children}</AuthStoreContext.Provider>;
}
