import { z } from 'zod';

import { camelizeKeys, flag, numeric, optionalString } from './common';

/**
 * Compare mode (`POST /api/compare`, `GET /api/compare/{shareId}`, backend PR 64, behind the
 * `be9_compare_mode` flag): two models the caller names, both answers with their names, stored
 * for 30 days, private unless the owner shares it.
 */

const sideSchema = z.object({
  modelName: z.string().default(''),
  displayName: optionalString,
  provider: optionalString,
  answer: z.string().default(''),
  timeMs: numeric.nullish().transform(value => value ?? null),
});
export type CompareSide = z.output<typeof sideSchema>;

export const compareResultSchema = z.preprocess(
  camelizeKeys,
  z.object({
    shareId: optionalString,
    prompt: z.string().default(''),
    a: sideSchema,
    b: sideSchema,
    createdAt: optionalString,
    shared: flag(false),
    expiresAt: optionalString,
    replayed: flag(false),
    warnings: z
      .array(z.string())
      .nullish()
      .transform(value => value ?? []),
  }),
);
export type CompareResult = z.output<typeof compareResultSchema>;

/** `PUT /api/compare/{shareId}/share` answers `{ shared }`. */
export const compareShareStateSchema = z.preprocess(
  camelizeKeys,
  z.object({ shared: flag(false) }),
);
export type CompareShareState = z.output<typeof compareShareStateSchema>;
