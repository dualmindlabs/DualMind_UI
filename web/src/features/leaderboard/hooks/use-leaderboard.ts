import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';
import { type LeaderboardData, leaderboardQuery } from '@/lib/api';

import { REFRESH_INTERVAL_MS } from '../lib/constants';
import { toLeaderboard } from '../lib/entries';

const selectLeaderboard = (data: LeaderboardData) => toLeaderboard(data.items);

/**
 * The live board from the public `GET /api/v2/leaderboard` (no sign-in; lib/api falls back to the
 * v1 route for one release). Fresh for 60 s
 * (STALE_TIMES.leaderboard), refreshed in the background every minute while the tab is visible
 * and when the window regains focus; transient failures retry with the client's policy. While a
 * refresh fails, the last good board stays on screen and `isRefetchError` is true.
 *
 * `select` is a module-level function, so the board is only rebuilt when the data changes.
 */
export function useLeaderboard() {
  const api = useApiClient();
  return useQuery({
    ...leaderboardQuery(api),
    select: selectLeaderboard,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export type LeaderboardQueryResult = ReturnType<typeof useLeaderboard>;
