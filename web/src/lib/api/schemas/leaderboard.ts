import { z } from 'zod';

import { count, listOf, numeric, optionalString, withAliases } from './common';
import { displayNameFromModelName } from './models';

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
  },
).transform(({ winRate, ...stat }) => ({
  ...stat,
  displayName: stat.displayName ?? displayNameFromModelName(stat.modelName),
  // Same formula as the API (ties count as non-wins), rounded to two decimals like it.
  winRate:
    winRate ??
    (stat.totalResponses > 0
      ? Math.round((stat.totalWins / stat.totalResponses) * 10_000) / 100
      : 0),
}));

/** `{ success, items }` today; ranked by the API (ties share a rank). */
export const leaderboardSchema = listOf(modelStatSchema);

export type ModelStat = z.output<typeof modelStatSchema>;
