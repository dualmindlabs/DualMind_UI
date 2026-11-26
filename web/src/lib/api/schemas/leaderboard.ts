import { leaderboardResponseSchema, PROVISIONAL_BELOW } from '@contract/leaderboard';
import { z } from 'zod';

import { resolveDisplayName } from '@/lib/models/display-name';

import { count, listOf, numeric, optionalString, withAliases } from './common';
import type { CrowdStat } from './crowd';

/**
 * One row of `GET /api/arena/model-stats`. The live API sends every field twice (camelCase and
 * snake_case) plus aliases (`elo`, `elo_rating`, `matches`, `total_matches`, `wins`); only the
 * camelCase names come out. `winRate` is a percentage (64.58 = 64.58 %), not a fraction.
 */
export const modelStatSchema = withAliases(
  z.object({
    modelId: z.string().min(1),
    modelName: z.string().min(1),
    displayName: optionalString,
    providerName: z.string().min(1),
    eloScore: numeric,
    eloRank: numeric.pipe(z.number().int().positive()),
    totalWins: count,
    totalLosses: count,
    totalTies: count,
    totalResponses: count,
    winRate: numeric.pipe(z.number().min(0).max(100)).optional(),
    /** False for a model the Arena no longer serves; absent while the API does not send it. */
    active: z.boolean().optional(),
    /** False for a model that is never drawn for a blind battle (pick-only); absent until the API sends it. */
    blindEligible: z.boolean().optional(),
  }),
  {
    modelId: ['id'],
    modelName: ['name'],
    providerName: ['provider'],
    eloScore: ['elo_rating', 'elo'],
    eloRank: ['rank'],
    totalWins: ['wins'],
    totalLosses: ['losses'],
    totalTies: ['ties'],
    totalResponses: ['total_matches', 'matches'],
    active: ['isActive', 'is_active'],
    blindEligible: ['isBlindEligible', 'is_blind_eligible', 'blind_eligible'],
  },
).transform(({ winRate, ...stat }) => ({
  ...stat,
  displayName: resolveDisplayName(stat.modelName, stat.displayName),
  // The v1 route has no flag: derive it from the shared rule (contract/leaderboard.ts).
  provisional: stat.totalResponses < PROVISIONAL_BELOW,
  // Same formula as the API (ties count as non-wins), rounded to two decimals like it.
  winRate:
    winRate ??
    (stat.totalResponses > 0
      ? Math.round((stat.totalWins / stat.totalResponses) * 10_000) / 100
      : 0),
}));

/** `{ success, items }` from v1; ranked by the API (ties share a rank). */
export const leaderboardSchema = listOf(modelStatSchema);

export type ModelStat = z.output<typeof modelStatSchema> & {
  /** Only on the crowd board (`source: 'crowd'`): rating interval, rank range, vote count. */
  crowd?: CrowdStat | undefined;
};

/** What `getLeaderboard()` returns, whichever route answered. */
export interface LeaderboardData {
  items: ModelStat[];
  /** Models with fewer battles than this are `provisional` (`meta.provisionalBelow` on v2). */
  provisionalBelow: number;
  /** When the data last changed (v2 `meta.generatedAt`); null from the v1 fallback. */
  generatedAt: string | null;
  /**
   * Set only when the Worker served a saved copy because the DualMind API could not be reached:
   * the last time the Worker confirmed the data with it. Absent on a current copy.
   */
  checkedAt?: string;
  /** Which route answered. `crowd` is the backend's leaderboard v2 (feature-detected). */
  source: 'crowd' | 'v2' | 'v1';
  /**
   * The category this board is for, set only when that category's own board answered. Absent on
   * the overall board and when a category fell back to the overall one: never label a board with
   * a category it does not belong to.
   */
  category?: string;
  /**
   * Set when the crowd board was asked for and the classic board is shown instead because the
   * crowd board is temporarily down (`unavailable`: 503) or failed (`failed`: 5xx, network,
   * unknown category). Absent when the crowd board is simply off, which is not worth a notice.
   */
  fallback?: 'unavailable' | 'failed';
  /** Board-level facts, crowd board only. */
  crowd?: {
    /** Method id, for example `bt-v1`. */
    methodology: string | null;
    /** Votes the fit used; null when the API did not say (never shown as 0). */
    voteCount: number | null;
    /** A stale copy, or a seeded board built without votes. */
    degraded: boolean;
    warnings: string[];
  };
}

/** `GET /api/v2/leaderboard`: the shared contract schema, mapped to the app's shape. */
export const leaderboardV2Schema = leaderboardResponseSchema.transform((body): LeaderboardData => ({
  items: body.items.map(item => ({
    ...item,
    displayName: resolveDisplayName(item.modelName, item.displayName),
  })),
  provisionalBelow: body.meta.provisionalBelow,
  generatedAt: body.meta.generatedAt,
  ...(body.meta.stale === true && body.meta.checkedAt ? { checkedAt: body.meta.checkedAt } : {}),
  source: 'v2',
}));

/** The v1 rows in the v2 shape (the fallback; goes in the next release with the v1 route). */
export const leaderboardV1AsDataSchema = leaderboardSchema.transform((items): LeaderboardData => ({
  items,
  provisionalBelow: PROVISIONAL_BELOW,
  generatedAt: null,
  source: 'v1',
}));
