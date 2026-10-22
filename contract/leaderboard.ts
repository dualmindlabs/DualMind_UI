// The public leaderboard (BE-4): schemas shared by the v2 Worker and the web app. Pure zod.

import { z } from 'zod';

/**
 * Models with fewer battles than this are `provisional`. Published in `meta.provisionalBelow`;
 * the web app imports this constant so the rule lives in one place.
 */
export const PROVISIONAL_BELOW = 5;

export const LEADERBOARD_SOURCE = 'dualmind-api:model-stats';

export const leaderboardItemSchema = z
  .object({
    modelId: z.string().describe('Stable model id'),
    modelName: z.string().describe('Full model name, may carry a provider prefix such as @cf/meta/'),
    displayName: z.string().describe('Name to show'),
    providerName: z.string(),
    eloScore: z.number().describe('Elo rating, one decimal'),
    eloRank: z.number().int().min(1).describe('Rank by Elo; ties share a rank (1, 1, 3)'),
    totalWins: z.number().int().min(0),
    totalLosses: z.number().int().min(0),
    totalTies: z.number().int().min(0),
    totalResponses: z.number().int().min(0).describe('Battles the model took part in'),
    winRate: z.number().min(0).max(100).describe('Percent from 0 to 100 with two decimals; ties count as non-wins'),
    provisional: z.boolean().describe('True while totalResponses is below meta.provisionalBelow'),
  })
  .meta({ id: 'LeaderboardItem' });
export type LeaderboardItem = z.infer<typeof leaderboardItemSchema>;

export const leaderboardMetaSchema = z
  .object({
    generatedAt: z.iso.datetime().describe('When the data last changed, not when it was served'),
    count: z.number().int().min(0),
    provisionalBelow: z.number().int().min(0),
    source: z.string(),
  })
  .meta({ id: 'LeaderboardMeta' });

export const leaderboardResponseSchema = z
  .object({
    items: z.array(leaderboardItemSchema).describe('Every ranked model, best first. The list is small and returned whole, so there is no nextCursor.'),
    meta: leaderboardMetaSchema,
  })
  .meta({ id: 'LeaderboardResponse' });
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
