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
    modelId: z.string().meta({ description: 'Stable model id', example: 'fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5' }),
    modelName: z.string().meta({ description: 'Full model name, may carry a provider prefix such as @cf/meta/', example: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' }),
    displayName: z.string().meta({ description: 'Name to show', example: 'llama-3.3-70b-instruct-fp8-fast' }),
    providerName: z.string().meta({ example: 'cloudflare' }),
    eloScore: z.number().meta({ description: 'Elo rating, one decimal', example: 1150 }),
    eloRank: z.number().int().min(1).meta({ description: 'Rank by Elo; ties share a rank (1, 1, 3)', example: 1 }),
    totalWins: z.number().int().min(0).meta({ example: 62 }),
    totalLosses: z.number().int().min(0).meta({ example: 27 }),
    totalTies: z.number().int().min(0).meta({ example: 9 }),
    totalResponses: z.number().int().min(0).meta({ description: 'Battles the model took part in', example: 96 }),
    winRate: z.number().min(0).max(100).meta({ description: 'Percent from 0 to 100 with two decimals; ties count as non-wins', example: 64.58 }),
    provisional: z.boolean().meta({ description: 'True while totalResponses is below meta.provisionalBelow', example: false }),
    active: z.boolean().optional().meta({ description: 'False for a model the Arena no longer serves. Present once the DualMind API sends it.', example: true }),
    blindEligible: z.boolean().optional().meta({ description: 'False for a model that is never drawn for a blind battle (it can only be picked in Side by side). Present once the DualMind API sends it.', example: true }),
  })
  .meta({ id: 'LeaderboardItem' });
export type LeaderboardItem = z.infer<typeof leaderboardItemSchema>;

export const leaderboardMetaSchema = z
  .object({
    generatedAt: z.iso.datetime().meta({ description: 'When the data last changed, not when it was served', example: '2026-10-21T08:30:00.000Z' }),
    count: z.number().int().min(0).meta({ example: 53 }),
    provisionalBelow: z.number().int().min(0).meta({ example: PROVISIONAL_BELOW }),
    source: z.string().meta({ example: LEADERBOARD_SOURCE }),
    stale: z.boolean().optional().meta({ description: 'True only while a saved copy is served because the DualMind API cannot be reached.', example: true }),
    checkedAt: z.iso.datetime().optional().meta({ description: 'Only with `stale`: the last time the Worker confirmed this data with the DualMind API.', example: '2026-10-21T08:35:00.000Z' }),
  })
  .meta({ id: 'LeaderboardMeta' });

export const leaderboardResponseSchema = z
  .object({
    items: z.array(leaderboardItemSchema).describe('Every ranked model, best first. The list is small and returned whole, so there is no nextCursor.'),
    meta: leaderboardMetaSchema,
  })
  .meta({ id: 'LeaderboardResponse' });
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
