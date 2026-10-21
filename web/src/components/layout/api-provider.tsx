import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { apiConfig } from '@/config/api';
import { ApiClientContext } from '@/hooks/use-api-client';
import { type ApiClient, createApiClientFromEnv, createQueryClient } from '@/lib/api';
import { getAccessToken } from '@/lib/supabase';

export interface ApiProviderProps {
  children: ReactNode;
  /**
   * The API client; defaults to the one configured by the environment, with the signed-in
   * user's Supabase token (mock mode keeps its demo token). Tests pass a mock.
   */
  client?: ApiClient;
  /** The query cache; defaults to a new one with the app's retry and stale-time policy. */
  queryClient?: QueryClient;
}

/**
 * Server state for every page: one API client (read with useApiClient()) and one TanStack Query
 * cache, created once per app. Prerendering creates them too, but queries only run in the
 * browser, so prerendered pages show their loading state and fetch after hydration.
 */
export function ApiProvider({ children, client, queryClient }: ApiProviderProps) {
  const [api] = useState(
    () => client ?? createApiClientFromEnv(apiConfig.mock ? {} : { getAccessToken }),
  );
  const [cache] = useState(() => queryClient ?? createQueryClient());

  return (
    <ApiClientContext.Provider value={api}>
      <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    </ApiClientContext.Provider>
  );
}
