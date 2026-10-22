import { isApiError } from '../errors';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import {
  type LeaderboardData,
  leaderboardV1AsDataSchema,
  leaderboardV2Schema,
} from '../schemas/leaderboard';

export interface LeaderboardEndpoints {
  /**
   * `GET /api/v2/leaderboard`: every model with Elo, rank, win/loss/tie counts and the
   * `provisional` flag, in rank order (ties share a rank). Public: sent without a token, so it
   * is cacheable (ETag and 304 are handled by the browser's HTTP cache) and works signed out.
   *
   * Fallback, for one release only: when v2 answers 404 or 501 (an older Worker without the
   * route), the v1 path `/api/arena/model-stats` is read and mapped to the same shape. The
   * fallback goes in the next release: delete `getLeaderboardV1` and the check below.
   */
  getLeaderboard: (options?: CallOptions) => Promise<LeaderboardData>;
}

/** Statuses that mean "this Worker has no v2 leaderboard (yet)". */
const V2_MISSING = new Set([404, 501]);

export function createLeaderboardEndpoints(transport: Transport): LeaderboardEndpoints {
  const getLeaderboardV2 = (options?: CallOptions) =>
    transport.json(
      {
        method: 'GET',
        path: '/api/v2/leaderboard',
        auth: 'none',
        schema: leaderboardV2Schema,
      },
      options,
    );
  // Goes in the next release, together with the v1 route.
  const getLeaderboardV1 = (options?: CallOptions) =>
    transport.json(
      {
        method: 'GET',
        path: '/api/arena/model-stats',
        auth: 'none',
        schema: leaderboardV1AsDataSchema,
      },
      options,
    );

  return {
    getLeaderboard: async options => {
      try {
        return await getLeaderboardV2(options);
      } catch (error) {
        if (isApiError(error) && V2_MISSING.has(error.status)) return getLeaderboardV1(options);
        throw error;
      }
    },
  };
}
