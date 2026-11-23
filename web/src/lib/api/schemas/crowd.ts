import { z } from 'zod';

import { optionalNumber, optionalString, withAliases } from './common';
import { type LeaderboardData, modelStatSchema } from './leaderboard';

/**
 * The crowd board: `GET /api/leaderboard` (backend leaderboard v2, behind its feature flag) and
 * `GET /api/leaderboard/categories/{category}`. Every row still carries the legacy model-stats
 * fields (`modelStatSchema` reads them), plus the fitted rating, its 95% bootstrap interval, the
 * rank range, the countable vote count and the provisional flag.
 */

/** What the crowd board adds to a model-stats row. Null interval and rank: nothing to claim. */
export interface CrowdStat {
  /** Fitted rating, null for a provisional model (its `eloScore` is the seeded, other scale). */
  rating: number | null;
  /** 95% bootstrap interval, null for a seeded row. */
  ciLow: number | null;
  ciHigh: number | null;
  /** Rank among rated models, null when the votes cannot support a rank claim yet. */
  rank: number | null;
  /** Best and worst rank the intervals still allow. */
  rankLow: number | null;
  rankHigh: number | null;
  /** Countable votes (both-bad votes are not counted); null when the API did not say. */
  votes: number | null;
  provisional: boolean;
  /** `votes` for a fitted rating, `seeded` for the starting value. */
  ratingSource: string;
}

const crowdFieldsSchema = withAliases(
  z.object({
    rating: optionalNumber,
    ciLow: optionalNumber,
    ciHigh: optionalNumber,
    rank: optionalNumber,
    rankLow: optionalNumber,
    rankHigh: optionalNumber,
    votes: optionalNumber,
    provisional: z.boolean(),
    ratingSource: optionalString,
  }),
  // `rank` also names the legacy field on the same row: only the crowd value counts here.
  {},
).transform((fields): CrowdStat => ({
  ...fields,
  ratingSource: fields.ratingSource ?? (fields.rating === null ? 'seeded' : 'votes'),
}));

/** One row: the legacy stat, with the crowd fields on `crowd`. A row that fails either fails all. */
const crowdRowSchema = z.unknown().transform((raw, ctx) => {
  const stat = modelStatSchema.safeParse(raw);
  const crowd = crowdFieldsSchema.safeParse(raw);
  if (!stat.success || !crowd.success) {
    ctx.addIssue({ code: 'custom', message: 'A crowd board row does not match its schema' });
    return z.NEVER;
  }
  // A provisional model keeps the seeded Elo in `eloScore`; a rated one carries the fitted rating.
  return {
    ...stat.data,
    provisional: crowd.data.provisional,
    crowd: crowd.data,
  };
});

const crowdBoardEnvelope = z.object({
  items: z.array(crowdRowSchema),
  methodology: optionalString.optional(),
  generatedAt: optionalString.optional(),
  voteCount: optionalNumber,
  degraded: z.boolean().optional(),
  warnings: z.array(z.string()).optional(),
});

/** The crowd board in the app's `LeaderboardData` shape (`source: 'crowd'`). */
export const crowdBoardSchema = crowdBoardEnvelope.transform((body): LeaderboardData => ({
  items: body.items,
  // The API decides who is provisional; this only feeds the legacy "fewer than N" copy.
  provisionalBelow: 5,
  generatedAt: body.generatedAt ?? null,
  source: 'crowd',
  crowd: {
    methodology: body.methodology ?? null,
    voteCount: body.voteCount,
    degraded: body.degraded ?? false,
    warnings: body.warnings ?? [],
  },
}));

/** `GET /api/leaderboard/categories`: the categories a per-category board exists for. */
export interface CrowdCategory {
  id: string;
  label: string;
  description: string;
}

export const crowdCategoriesSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        description: optionalString,
      }),
    ),
  })
  .transform((body): CrowdCategory[] =>
    body.items.map(item => ({ ...item, description: item.description ?? '' })),
  );
