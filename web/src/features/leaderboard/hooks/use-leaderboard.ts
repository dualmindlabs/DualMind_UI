import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';
import {
  boardQuery,
  crowdCategoriesQuery,
  type LeaderboardData,
  leaderboardQuery,
} from '@/lib/api';

import { REFRESH_INTERVAL_MS } from '../lib/constants';
import { toLeaderboard } from '../lib/entries';

const selectLeaderboard = (data: LeaderboardData) => toLeaderboard(data.items, data);

/**
 * The classic live board from the public `GET /api/v2/leaderboard` (no sign-in; lib/api falls back
 * to the v1 route). Used by the landing page, the models directory, the model pickers and the share
 * page. Fresh for 60 s (STALE_TIMES.leaderboard), refreshed in the background every minute while
 * the tab is visible and when the window regains focus; transient failures retry with the client's
 * policy. While a refresh fails, the last good board stays on screen and `isRefetchError` is true.
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

/**
 * The leaderboard page's board: the crowd board (`GET /api/leaderboard`: fitted ratings, intervals,
 * rank ranges) when the backend has it on, else the classic board exactly as `useLeaderboard` reads
 * it. With a `category`, that category's crowd board. Same refresh rules as `useLeaderboard`.
 */
export function useBoard(category?: string) {
  const api = useApiClient();
  return useQuery({
    ...boardQuery(api, category),
    select: selectLeaderboard,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

/** The prompt categories a crowd board exists for. `data` is null while categories are off. */
export function useCrowdCategories() {
  const api = useApiClient();
  return useQuery(crowdCategoriesQuery(api));
}

export type LeaderboardQueryResult = ReturnType<typeof useBoard>;
