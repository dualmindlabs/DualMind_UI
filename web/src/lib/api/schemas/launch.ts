import { z } from 'zod';

import { answerSchema, voteModelsSchema } from './arena';
import { count, flag, listOf, optionalString, withAliases } from './common';

/**
 * `GET /api/config/public`: which launch features the backend has on, and the public Turnstile
 * site key for the guest battle. Every field defaults to off, so an older backend (404) and a
 * broken body both mean "nothing extra is available".
 */
export const publicConfigSchema = withAliases(
  z.object({
    guestBattle: flag(false),
    privateArena: flag(false),
    turnstileSiteKey: optionalString,
  }),
);
export type PublicConfig = z.output<typeof publicConfigSchema>;

/** What the UI assumes when the backend has no public config. */
export const NO_PUBLIC_CONFIG: PublicConfig = {
  guestBattle: false,
  privateArena: false,
  turnstileSiteKey: null,
};

/** A private arena: your own prompt set, run as blind battles that only you vote on. */
export const privateArenaSchema = withAliases(
  z.object({
    id: z.string().min(1),
    name: z.string().catch(''),
    promptCount: count,
    battlesDone: count,
  }),
);
export type PrivateArena = z.output<typeof privateArenaSchema>;

export const privateArenaListSchema = listOf(privateArenaSchema);

export const privateArenaCreatedSchema = z.object({ id: z.string().min(1) });

/**
 * One blind battle in a private arena: the two answers (model names hidden by the backend until
 * the vote, like the public battle with the mask on) and the id the vote refers to.
 */
export const privateBattleSchema = withAliases(
  z.object({
    battleId: z.string().min(1),
    agent1: answerSchema,
    agent2: answerSchema,
  }),
);
export type PrivateBattle = z.output<typeof privateBattleSchema>;

/** The vote response: the models, revealed. */
export const privateVoteSchema = z.object({ models: voteModelsSchema });

/** One row of your own board, built from your own votes only. */
export const privateBoardRowSchema = withAliases(
  z.object({
    model: z.string().min(1),
    wins: count,
    losses: count,
    ties: count,
    battles: count,
  }),
);
export type PrivateBoardRow = z.output<typeof privateBoardRowSchema>;
export const privateBoardSchema = listOf(privateBoardRowSchema);

/** The private vote choices; the backend spells the last one with an underscore. */
export const PRIVATE_VOTE_CHOICES = ['left', 'right', 'tie', 'both_bad'] as const;
export type PrivateVoteChoice = (typeof PRIVATE_VOTE_CHOICES)[number];
