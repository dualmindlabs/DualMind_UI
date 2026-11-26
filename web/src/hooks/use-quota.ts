import { useQuery } from '@tanstack/react-query';

import { type QuotaPart, quotaQuery } from '@/lib/api';

import { useApiClient } from './use-api-client';

export interface QuotaCounters {
  /** Free battles without an account, or null when the backend does not report them. */
  guest: QuotaPart | null;
  /** Private arena battles for a signed-in caller, or null. */
  privateArena: QuotaPart | null;
  /** Asks again (after a battle used one). */
  refresh: () => void;
}

/** A counter that is off, empty or has no limit is not shown. */
function usable(part: QuotaPart | undefined): QuotaPart | null {
  return part && part.enabled && part.limit > 0 ? part : null;
}

/**
 * "Battles left today" from `GET /api/arena/quota`. The route sits behind a backend flag, so on a
 * backend without it (404) or on any failure both counters are null and the page shows nothing:
 * the counter is a display aid and never blocks anything.
 */
export function useQuota(enabled: boolean): QuotaCounters {
  const api = useApiClient();
  const { data, refetch } = useQuery({ ...quotaQuery(api), enabled });
  return {
    guest: usable(data?.guest),
    privateArena: usable(data?.privateArena),
    refresh: () => void refetch(),
  };
}
