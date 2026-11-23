import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';
import {
  boardQuery,
  categoryBoardQuery,
  crowdCategoriesQuery,
  type LeaderboardData,
} from '@/lib/api';

import { REFRESH_INTERVAL_MS } from '../lib/constants';
import { toLeaderboard } from '../lib/entries';

const selectLeaderboard = (data: LeaderboardData) => toLeaderboard(data.items, data);

/**
 * The live board. `GET /api/leaderboard` (the crowd board: fitted ratings, intervals, rank ranges)
 * when the backend has it on, else the classic `GET /api/v2/leaderboard`, which itself falls back to
 * the v1 route (lib/api/endpoints/leaderboard.ts). With a `category`, that category's crowd board.
 * Fresh for 60 s (STALE_TIMES.leaderboard), refreshed in the background every minute while the tab
 * is visible and when the window regains focus; transient failures retry with the client's policy.
 * While a refresh fails, the last good board stays on screen and `isRefetchError` is true.
 *
 * `select` is a module-level function, so the board is only rebuilt when the data changes.
 */
export function useLeaderboard(category?: string) {
  const api = useApiClient();
  return useQuery({
    ...(category === undefined ? boardQuery(api) : categoryBoardQuery(api, category)),
    select: selectLeaderboard,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

/** The prompt categories a crowd board exists for. `data` is null while categories are off. */
export function useCrowdCategories() {
  const api = useApiClient();
  return useQuery(crowdCategoriesQuery(api));
}

export type LeaderboardQueryResult = ReturnType<typeof useLeaderboard>;
