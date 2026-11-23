import { isApiError } from '../errors';
import { TIMEOUTS } from '../http/timeouts';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { pathSegment } from '../http/url';
import { VOTE_CHOICES, type VoteChoice } from '../schemas/arena';
import {
  type CritiqueResult,
  critiqueResultSchema,
  type CrossExamineStats,
  crossExamineStatsSchema,
  type Round2Result,
  round2ResultSchema,
} from '../schemas/cross-examine';
import { compact, oneOf, requireText } from './input';

export interface Round2Input {
  comparisonId: string;
  voteChoice: VoteChoice;
  voteDurationMs?: number | undefined;
}

export interface CrossExamineEndpoints {
  /**
   * `POST /api/arena/comparisons/{id}/critique`: each model rebuts the other's answer (80 words at
   * most). Needs the first vote (409 `VOTE_FIRST`). Asking again returns the stored rebuttals and
   * calls no model, so it is safe to repeat. Never retried here: the first call runs two models.
   */
  requestCritique: (comparisonId: string, options?: CallOptions) => Promise<CritiqueResult>;
  /** `POST /api/arena/model-vote/round2`: the optional second vote, stored apart from the first. */
  submitRound2Vote: (input: Round2Input, options?: CallOptions) => Promise<Round2Result>;
  /**
   * `GET /api/arena/cross-examine/stats`; null while cross-examine is off (404, 501 or 503). Also
   * the cheapest way to ask whether it is on, so the screen shows nothing for it until it is.
   */
  getCrossExamineStats: (options?: CallOptions) => Promise<CrossExamineStats | null>;
}

const OFF = new Set([404, 501, 503]);

export function createCrossExamineEndpoints(transport: Transport): CrossExamineEndpoints {
  return {
    requestCritique: async (comparisonId, options) =>
      await transport.json(
        {
          method: 'POST',
          path: `/api/arena/comparisons/${pathSegment(requireText(comparisonId, 'comparisonId'), 'comparisonId')}/critique`,
          auth: 'required',
          timeoutMs: TIMEOUTS.battle,
          schema: critiqueResultSchema,
        },
        options,
      ),

    submitRound2Vote: async (input, options) =>
      await transport.json(
        {
          method: 'POST',
          path: '/api/arena/model-vote/round2',
          auth: 'required',
          body: compact({
            comparisonId: requireText(input.comparisonId, 'comparisonId'),
            voteChoice: oneOf(input.voteChoice, VOTE_CHOICES, 'voteChoice'),
            voteDurationMs:
              input.voteDurationMs === undefined
                ? undefined
                : Math.max(0, Math.round(input.voteDurationMs)),
          }),
          schema: round2ResultSchema,
        },
        options,
      ),

    getCrossExamineStats: async options => {
      try {
        const stats = await transport.json(
          {
            method: 'GET',
            path: '/api/arena/cross-examine/stats',
            auth: 'required',
            schema: crossExamineStatsSchema,
          },
          options,
        );
        return stats.enabled ? stats : null;
      } catch (error) {
        if (isApiError(error) && (OFF.has(error.status) || error.kind === 'bad_response')) {
          return null;
        }
        throw error;
      }
    },
  };
}
