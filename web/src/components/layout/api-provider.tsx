import {
  MutationCache,
  type QueryClient,
  QueryCache,
  QueryClientProvider,
} from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { apiConfig } from '@/config/api';
import { ApiClientContext } from '@/hooks/use-api-client';
import {
  type ApiClient,
  createApiClientFromEnv,
  createQueryClient,
  getUserMessage,
  isRateLimitError,
} from '@/lib/api';
import { getAccessToken } from '@/lib/supabase';

/**
 * A request the server refused with 429 (BE-3) is the one failure every screen would explain the
 * same way, so it is toasted here: "Too many requests. Try again in N seconds." One toast at a
 * time (a fixed id), only after the transport and query retries have given up. The toast code is
 * loaded on demand, so pages do not pay for it up front.
 */
export function notifyRateLimited(error: unknown): void {
  if (!isRateLimitError(error)) return;
  void import('@/components/ui/sonner').then(({ toast }) =>
    toast.error(getUserMessage(error), { id: 'api-rate-limited' }),
  );
}

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
  const [cache] = useState(
    () =>
      queryClient ??
      createQueryClient({
        queryCache: new QueryCache({ onError: notifyRateLimited }),
        mutationCache: new MutationCache({ onError: notifyRateLimited }),
      }),
  );

  return (
    <ApiClientContext.Provider value={api}>
      <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    </ApiClientContext.Provider>
  );
}
