import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { leaderboardSchema, type ModelStat } from '../schemas/leaderboard';

export interface LeaderboardEndpoints {
  /**
   * `GET /api/arena/model-stats`: every model with Elo, rank and win/loss/tie counts, in rank
   * order (ties share a rank). Public: sent without a token, so it is cacheable and works
   * signed out.
   */
  getLeaderboard: (options?: CallOptions) => Promise<ModelStat[]>;
}

export function createLeaderboardEndpoints(transport: Transport): LeaderboardEndpoints {
  return {
    getLeaderboard: options =>
      transport.json(
        { method: 'GET', path: '/api/arena/model-stats', auth: 'none', schema: leaderboardSchema },
        options,
      ),
  };
}
