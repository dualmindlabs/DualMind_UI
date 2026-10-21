import { useLeaderboard } from '@/features/leaderboard';

import { type LiveStats, toLiveStats } from '../lib/live-stats';

export type LiveStatsState =
  | { status: 'loading' }
  | { status: 'ready'; stats: LiveStats }
  | { status: 'error' };

/**
 * The live numbers on the landing page, from the leaderboard feature's board query (the public
 * leaderboard through the shared API client and TanStack Query; one request, shared with the
 * leaderboard page's cache, feeds the live strip, the model strip and the top five). The
 * prerendered HTML shows the loading state: the request starts after hydration. While a refresh
 * fails, the last good board stays on screen.
 */
export function useLiveStats(): LiveStatsState {
  const query = useLeaderboard();
  if (query.data && query.data.entries.length > 0) {
    return { status: 'ready', stats: toLiveStats(query.data) };
  }
  if (query.isError || query.isSuccess) return { status: 'error' };
  return { status: 'loading' };
}
