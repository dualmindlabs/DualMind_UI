import { isApiError } from '../errors';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { crowdBoardSchema, crowdCategoriesSchema, type CrowdCategory } from '../schemas/crowd';
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
   * With a `category`, that category's crowd board (its `category` field is set), else the overall
   * board (no `category` field). When the crowd board fails (5xx, network, timeout, unknown
   * category) or is down (503) the classic board is returned with `fallback` set, and the failure
   * is not remembered; only a classic failure rejects.
   */
  getBoard: (options?: CallOptions, category?: string) => Promise<LeaderboardData>;
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
/** A body that does not match its schema may be a deploy in flight: ask again soon. */
const BAD_RESPONSE_MEMORY_MS = 30_000;
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
  const warned = new Set<string>();
  type Probe<T> =
    | { kind: 'ok'; value: T }
    | { kind: 'off' }
    | { kind: 'unavailable' }
    | { kind: 'failed'; error: unknown };

  /**
   * Runs `call` and says what happened. `off` (404, 501, or a bad body) is remembered for a while;
   * `unavailable` (503) is not; anything else is `failed`, never remembered. An abort is rethrown.
   */
  async function probe<T>(key: string, call: () => Promise<T>): Promise<Probe<T>> {
    if ((offUntil.get(key) ?? 0) > Date.now()) return { kind: 'off' };
    try {
      return { kind: 'ok', value: await call() };
    } catch (error) {
      if (isApiError(error)) {
        if (error.kind === 'aborted') throw error;
        if (error.kind === 'bad_response') {
          // Not "off": the route answered with something we cannot read. Say so once, retry soon.
          if (!warned.has(key)) {
            warned.add(key);
            console.warn(
              `[leaderboard] ${key} answered with an unreadable body; using the classic board`,
            );
          }
          offUntil.set(key, Date.now() + BAD_RESPONSE_MEMORY_MS);
          return { kind: 'off' };
        }
        if (error.status === 503) return { kind: 'unavailable' };
        if (CROWD_OFF.has(error.status)) {
          offUntil.set(key, Date.now() + OFF_MEMORY_MS);
          return { kind: 'off' };
        }
      }
      return { kind: 'failed', error };
    }
  }
  /** Runs `call`; null when the route is off or down, rethrows real failures. */
  async function detect<T>(key: string, call: () => Promise<T>): Promise<T | null> {
    const result = await probe(key, call);
    if (result.kind === 'ok') return result.value;
    if (result.kind === 'failed') throw result.error;
    return null;
  }

  const crowdPath = (category?: string) =>
    category === undefined ? '/api/leaderboard' : `/api/leaderboard/categories/${category}`;
  const callCrowd = (path: string, options?: CallOptions) =>
    transport.json({ method: 'GET', path, auth: 'none', schema: crowdBoardSchema }, options);

  /** The best board for `category` (overall when undefined); see `getBoard` on the interface. */
  async function readBoard(options?: CallOptions, category?: string): Promise<LeaderboardData> {
    if (category !== undefined) {
      if (CATEGORY_ID.test(category)) {
        const own = await probe(crowdPath(category), () => callCrowd(crowdPath(category), options));
        if (own.kind === 'ok') return { ...own.value, category };
      }
      // Off, down, failed or an unknown category: the overall board, without the category label.
      return readBoard(options);
    }
    const overall = await probe(crowdPath(), () => callCrowd(crowdPath(), options));
    if (overall.kind === 'ok') return overall.value;
    const classic = await getClassic(options);
    if (overall.kind === 'off') return classic;
    return { ...classic, fallback: overall.kind };
  }

  const getCrowdBoard = (category?: string, options?: CallOptions) => {
    if (category !== undefined && !CATEGORY_ID.test(category)) return Promise.resolve(null);
    const path = crowdPath(category);
    return detect(path, () => callCrowd(path, options));
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
      detect('/api/leaderboard/methodology', async () => {
        // Plain text, not JSON: read as a blob and decode.
        const blob = await transport.blob(
          {
            method: 'GET',
            path: '/api/leaderboard/methodology',
            auth: 'none',
            accept: 'text/plain',
          },
          options,
        );
        const text = await blob.text();
        return text.trim() === '' ? null : text;
      }),
    getBoard: readBoard,
    getLeaderboard: options => getClassic(options),
  };
}
