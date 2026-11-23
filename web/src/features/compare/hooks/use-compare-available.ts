import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';

/**
 * Whether the backend has compare mode on (see `isCompareAvailable`). `undefined` while the
 * probe runs. One probe per visit session: the answer is cached for five minutes, and a rate
 * limit or an unreachable API counts as "available" so the real call can report what happened.
 */
export function useCompareAvailable(enabled = true): boolean | undefined {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ['dualmind-api', 'compare', 'available'],
    queryFn: ({ signal }) => api.isCompareAvailable({ signal, retry: false }),
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  });
  return query.data;
}
