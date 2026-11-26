import { ApiError } from '../errors';
import { TIMEOUTS } from '../http/timeouts';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { pathSegment } from '../http/url';
import { type Battle, battleSchema, type VoteModels } from '../schemas/arena';
import { mutationResultSchema } from '../schemas/common';
import {
  PRIVATE_VOTE_CHOICES,
  type PrivateArena,
  privateArenaCreatedSchema,
  privateArenaListSchema,
  privateArenaSchema,
  type PrivateBattle,
  privateBattleSchema,
  type PrivateBoardRow,
  privateBoardSchema,
  type PrivateVoteChoice,
  privateVoteSchema,
  type PublicConfig,
  publicConfigSchema,
  type Quota,
  quotaSchema,
} from '../schemas/launch';
import { compact, oneOf, requireText } from './input';

function invalid(message: string): ApiError {
  return new ApiError({ kind: 'validation', code: 'INVALID_ARGUMENT', message });
}

/** The guest battle's prompt limit (backend contract); a longer prompt fails locally. */
export const GUEST_PROMPT_MAX_CHARS = 500;
/** The limits of a private arena (backend contract): 3 arenas per user, 50 prompts each. */
export const PRIVATE_ARENA_MAX_PROMPTS = 50;
export const PRIVATE_ARENA_MAX_ARENAS = 3;
export const PRIVATE_ARENA_NAME_MAX_CHARS = 80;
export const PRIVATE_PROMPT_MAX_CHARS = 2_000;

export interface GuestBattleInput {
  prompt: string;
  /** The Cloudflare Turnstile token from the widget. */
  turnstileToken: string;
}

export interface PrivateArenaInput {
  name: string;
  prompts: readonly string[];
}

export interface LaunchEndpoints {
  /** `GET /api/config/public`. Public. 404 on a backend without it (the caller treats it as off). */
  getPublicConfig: (options?: CallOptions) => Promise<PublicConfig>;
  /** `GET /api/arena/quota`: battles left today. 404 while the backend flag is off. */
  getQuota: (options?: CallOptions) => Promise<Quota>;
  /**
   * `POST /api/arena/guest-battle`: one battle without an account (backend flag; 404 while off).
   * Never sends a token. 403 `TURNSTILE_FAILED` when the check fails, 429 after the daily limit.
   * Voting is not possible for a guest: the page asks the visitor to sign up for the reveal.
   */
  startGuestBattle: (input: GuestBattleInput, options?: CallOptions) => Promise<Battle>;
  /** `POST /api/private-arenas`. */
  createPrivateArena: (input: PrivateArenaInput, options?: CallOptions) => Promise<{ id: string }>;
  /** `GET /api/private-arenas`: your arenas. */
  listPrivateArenas: (options?: CallOptions) => Promise<PrivateArena[]>;
  /** `GET /api/private-arenas/{id}`. */
  getPrivateArena: (id: string, options?: CallOptions) => Promise<PrivateArena>;
  /** `POST /api/private-arenas/{id}/battle`: a blind battle of the prompt at `promptIndex`. */
  startPrivateBattle: (
    id: string,
    promptIndex: number,
    options?: CallOptions,
  ) => Promise<PrivateBattle>;
  /** `POST /api/private-arenas/{id}/vote`: reveals the two models. */
  votePrivateBattle: (
    id: string,
    input: { battleId: string; choice: PrivateVoteChoice },
    options?: CallOptions,
  ) => Promise<VoteModels | null>;
  /** `GET /api/private-arenas/{id}/board`: your own results per model. */
  getPrivateBoard: (id: string, options?: CallOptions) => Promise<PrivateBoardRow[]>;
  /** `DELETE /api/private-arenas/{id}`. */
  deletePrivateArena: (id: string, options?: CallOptions) => Promise<void>;
}

export function createLaunchEndpoints(transport: Transport): LaunchEndpoints {
  const base = (id: string) => `/api/private-arenas/${pathSegment(id, 'id')}`;
  return {
    getPublicConfig: async options =>
      await transport.json(
        { method: 'GET', path: '/api/config/public', auth: 'none', schema: publicConfigSchema },
        options,
      ),

    getQuota: async options =>
      await transport.json(
        { method: 'GET', path: '/api/arena/quota', auth: 'optional', schema: quotaSchema },
        options,
      ),

    startGuestBattle: async (input, options) => {
      const prompt = requireText(input.prompt, 'prompt').trim();
      if (prompt.length > GUEST_PROMPT_MAX_CHARS) {
        throw invalid(`prompt must have at most ${GUEST_PROMPT_MAX_CHARS} characters`);
      }
      return await transport.json(
        {
          method: 'POST',
          path: '/api/arena/guest-battle',
          auth: 'none',
          timeoutMs: TIMEOUTS.battle,
          body: { prompt, turnstileToken: requireText(input.turnstileToken, 'turnstileToken') },
          schema: battleSchema,
        },
        options,
      );
    },

    createPrivateArena: async (input, options) =>
      await transport.json(
        {
          method: 'POST',
          path: '/api/private-arenas',
          auth: 'required',
          body: {
            name: requireText(input.name, 'name').trim().slice(0, PRIVATE_ARENA_NAME_MAX_CHARS),
            prompts: input.prompts
              .map(prompt => prompt.trim())
              .filter(prompt => prompt !== '')
              .slice(0, PRIVATE_ARENA_MAX_PROMPTS),
          },
          schema: privateArenaCreatedSchema,
        },
        options,
      ),

    listPrivateArenas: async options =>
      await transport.json(
        {
          method: 'GET',
          path: '/api/private-arenas',
          auth: 'required',
          schema: privateArenaListSchema,
        },
        options,
      ),

    getPrivateArena: async (id, options) =>
      await transport.json(
        { method: 'GET', path: base(id), auth: 'required', schema: privateArenaSchema },
        options,
      ),

    startPrivateBattle: async (id, promptIndex, options) => {
      if (!Number.isInteger(promptIndex) || promptIndex < 0) {
        throw invalid('promptIndex must be a whole number from 0');
      }
      return await transport.json(
        {
          method: 'POST',
          path: `${base(id)}/battle`,
          auth: 'required',
          timeoutMs: TIMEOUTS.battle,
          body: { promptIndex },
          schema: privateBattleSchema,
        },
        options,
      );
    },

    votePrivateBattle: async (id, input, options) => {
      const result = await transport.json(
        {
          method: 'POST',
          path: `${base(id)}/vote`,
          auth: 'required',
          body: compact({
            battleId: requireText(input.battleId, 'battleId'),
            choice: oneOf(input.choice, PRIVATE_VOTE_CHOICES, 'choice'),
          }),
          schema: privateVoteSchema,
        },
        options,
      );
      return result.models ?? null;
    },

    getPrivateBoard: async (id, options) =>
      await transport.json(
        { method: 'GET', path: `${base(id)}/board`, auth: 'required', schema: privateBoardSchema },
        options,
      ),

    deletePrivateArena: async (id, options) => {
      await transport.json(
        { method: 'DELETE', path: base(id), auth: 'required', schema: mutationResultSchema },
        options,
      );
    },
  };
}
