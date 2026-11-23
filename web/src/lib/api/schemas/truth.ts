import { z } from 'zod';

import { camelizeKeys, flag, numeric, optionalString } from './common';

/**
 * The answer key of a Truth vs Taste battle (backend PR 70, flag `truth_vs_taste`). It comes back
 * in the vote response, after the vote is stored and never before, for the one battle in about
 * eight that ran a question with a known answer. Anything malformed is dropped: a key problem must
 * never fail a vote.
 */
const keySideSchema = z.object({
  slot: numeric,
  correct: flag(false),
  extracted: optionalString,
});

export const answerKeySchema = z.preprocess(
  camelizeKeys,
  z.object({
    question: z.string().default(''),
    answer: z.string(),
    grader: optionalString,
    sample: flag(false),
    sides: z
      .array(keySideSchema)
      .nullish()
      .transform(value => value ?? []),
  }),
);
export type AnswerKey = z.output<typeof answerKeySchema>;
export type AnswerKeySide = AnswerKey['sides'][number];
