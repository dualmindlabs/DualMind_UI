import { createContext, useContext } from 'react';

import type { ApiClient } from '@/lib/api';

/** Provided by <ApiProvider> (components/layout/api-provider.tsx), mounted once in the root. */
export const ApiClientContext = createContext<ApiClient | null>(null);

/**
 * The app's API client (same-origin `/api/*` through the Worker, or the mock adapter when
 * `VITE_API_MOCK` is on). Pass it to the query builders: `useQuery(leaderboardQuery(api))`.
 */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient() needs <ApiProvider> (see components/layout/app-providers.tsx).');
  }
  return client;
}
