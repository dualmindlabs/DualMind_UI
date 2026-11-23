import { isApiError } from '../errors';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import {
  type CrowdCategory,
  crowdBoardSchema,
  crowdCategoriesSchema,
  methodologyTextSchema,
} from '../schemas/crowd';
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
  /**
   * The best board available: the crowd board when the backend has it on, else the classic board
   * above. This is what the leaderboard page reads; every other caller keeps `getLeaderboard`.
   */
  getBoard: (options?: CallOptions) => Promise<LeaderboardData>;
  /**
   * `GET /api/leaderboard` (or `/api/leaderboard/categories/{category}`): the crowd board with
   * fitted ratings, 95% intervals, rank ranges and vote counts. Feature-detected: the backend
   * answers 404 while its flag is off (501, or 503 while it cannot build the board, also count as
   * "not available"), and this returns null so callers fall back to the classic board. A 404 is
   * remembered for a few minutes so a board that is off costs one failed call, not one per visit.
   */
  getCrowdBoard: (category?: string, options?: CallOptions) => Promise<LeaderboardData | null>;
  /** `GET /api/leaderboard/categories`; null while categories are off. */
  getCrowdCategories: (options?: CallOptions) => Promise<CrowdCategory[] | null>;
  /** `GET /api/leaderboard/methodology`: the method as plain text; null while it is off. */
  getLeaderboardMethodology: (options?: CallOptions) => Promise<string | null>;
}

/** How long "this route is off" is remembered. */
const OFF_MEMORY_MS = 5 * 60_000;
/** Statuses that mean "the crowd board is not available (yet)", not "something broke". */
const CROWD_OFF = new Set([404, 501, 503]);
/** The backend's categories; anything else would be a 400 there. */
const CATEGORY_ID = /^[a-z][a-z-]{0,31}$/;

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

  /** The classic board: v2, or v1 when this Worker has no v2 route. */
  const getClassic = async (options?: CallOptions): Promise<LeaderboardData> => {
    try {
      return await getLeaderboardV2(options);
    } catch (error) {
      if (isApiError(error) && V2_MISSING.has(error.status)) return getLeaderboardV1(options);
      throw error;
    }
  };

  const offUntil = new Map<string, number>();
  /** Runs `call`; null when the route is off (and remembers that), rethrows real failures. */
  async function detect<T>(key: string, call: () => Promise<T>): Promise<T | null> {
    if ((offUntil.get(key) ?? 0) > Date.now()) return null;
    try {
      return await call();
    } catch (error) {
      if (isApiError(error) && (CROWD_OFF.has(error.status) || error.kind === 'bad_response')) {
        // 503 is the backend failing to build the board right now: fall back, but ask again soon.
        if (error.status !== 503) offUntil.set(key, Date.now() + OFF_MEMORY_MS);
        return null;
      }
      throw error;
    }
  }

  const getCrowdBoard = (category?: string, options?: CallOptions) => {
    if (category !== undefined && !CATEGORY_ID.test(category)) return Promise.resolve(null);
    const path =
      category === undefined ? '/api/leaderboard' : `/api/leaderboard/categories/${category}`;
    return detect(path, () =>
      transport.json({ method: 'GET', path, auth: 'none', schema: crowdBoardSchema }, options),
    );
  };

  return {
    getCrowdBoard,
    getCrowdCategories: options =>
      detect('/api/leaderboard/categories', () =>
        transport.json(
          {
            method: 'GET',
            path: '/api/leaderboard/categories',
            auth: 'none',
            schema: crowdCategoriesSchema,
          },
          options,
        ),
      ),
    getLeaderboardMethodology: options =>
      detect('/api/leaderboard/methodology', () =>
        transport.json(
          {
            method: 'GET',
            path: '/api/leaderboard/methodology',
            auth: 'none',
            schema: methodologyTextSchema,
          },
          options,
        ),
      ),
    getBoard: async options => {
      const crowd = await getCrowdBoard(undefined, options);
      return crowd ?? getClassic(options);
    },
    getLeaderboard: options => getClassic(options),
  };
}
