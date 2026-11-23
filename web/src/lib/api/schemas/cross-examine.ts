import { z } from 'zod';

import { VOTE_CHOICES } from './arena';
import { camelizeKeys, flag, numeric, optionalNumber, optionalString } from './common';

/**
 * Cross-examine (backend PR 71, flag `cross_examine`): after the first vote each model rebuts the
 * other's answer in at most 80 words, and the voter may vote a second time. The second vote is
 * stored apart and never touches the board.
 */

const rebuttalSchema = z.object({
  /** The critic's slot: 1 is the model behind answer A, 2 the model behind answer B. */
  slot: numeric,
  modelName: optionalString,
  displayName: optionalString,
  rebuttal: z.string(),
  words: numeric.nullish().transform(value => value ?? null),
});
export type Rebuttal = z.output<typeof rebuttalSchema>;

/** `POST /api/arena/comparisons/{id}/critique`. */
export const critiqueResultSchema = z.preprocess(
  camelizeKeys,
  z.object({
    created: flag(false),
    critiques: z.array(rebuttalSchema).default([]),
  }),
);
export type CritiqueResult = z.output<typeof critiqueResultSchema>;

/** `POST /api/arena/model-vote/round2`. */
export const round2ResultSchema = z.preprocess(
  camelizeKeys,
  z.object({
    round1Choice: z.enum(VOTE_CHOICES).nullish().catch(null),
    round2Choice: z.enum(VOTE_CHOICES).nullish().catch(null),
    flipped: flag(false),
  }),
);
export type Round2Result = z.output<typeof round2ResultSchema>;

/** `GET /api/arena/cross-examine/stats`: only the overall flip numbers are read here. */
export const crossExamineStatsSchema = z.preprocess(
  camelizeKeys,
  z.object({
    enabled: flag(false),
    overall: z
      .object({
        rounds: numeric.nullish().transform(value => value ?? 0),
        flips: numeric.nullish().transform(value => value ?? 0),
        flipRate: optionalNumber,
      })
      .nullish()
      .transform(value => value ?? { rounds: 0, flips: 0, flipRate: null }),
  }),
);
export type CrossExamineStats = z.output<typeof crossExamineStatsSchema>;
