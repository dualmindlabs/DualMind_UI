import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';
import type { CrossExamineStats } from '@/lib/api';

/**
 * Whether the backend has cross-examine on, and its overall flip numbers (backend PR 71). The
 * stats route answers 404 while the flag is off, which the API layer turns into null, so this is
 * `null` when off and `undefined` while the one request runs. Cached for five minutes; nothing
 * about cross-examine is on screen until this has data.
 */
export function useCrossExamineStats(enabled: boolean): CrossExamineStats | null | undefined {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ['dualmind-api', 'cross-examine', 'stats'],
    queryFn: ({ signal }) => api.getCrossExamineStats({ signal, retry: false }),
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  });
  // A failed probe (offline, 500) shows nothing rather than an error for a feature nobody asked for.
  return query.isError ? null : query.data;
}
