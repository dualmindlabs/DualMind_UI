import { z } from 'zod';

import { isApiError } from '../errors';
import { TIMEOUTS } from '../http/timeouts';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { pathSegment } from '../http/url';
import {
  type CompareResult,
  compareResultSchema,
  type CompareShareState,
  compareShareStateSchema,
} from '../schemas/compare';
import { compact, requireText } from './input';

/** The backend's limits (backend PR 64): the prompt length and the token ceiling. */
export const COMPARE_MAX_PROMPT_CHARS = 8_000;
export const COMPARE_DEFAULT_MAX_TOKENS = 512;

export interface CompareInput {
  prompt: string;
  /** Model names (`modelName` from `GET /api/models`), two different active models. */
  modelA: string;
  modelB: string;
  /** True lets anyone holding the share id read the result. The API default, and ours, is private. */
  share?: boolean | undefined;
  maxTokens?: number | undefined;
}

export interface CompareEndpoints {
  /**
   * `POST /api/compare`. Never retried here: it costs two provider calls. The result carries a
   * `shareId` (null when it could not be stored), whether it is shared, and when it expires.
   * A custom system prompt is not sent: the API rejects one.
   */
  runCompare: (input: CompareInput, options?: CallOptions) => Promise<CompareResult>;
  /**
   * `GET /api/compare/{shareId}`: the owner's token is sent when there is one, so a private
   * result opens for its owner; anyone else only reads a shared one. Private, unknown and expired
   * ids are the same 404.
   */
  getCompare: (shareId: string, options?: CallOptions) => Promise<CompareResult>;
  /** `PUT /api/compare/{shareId}/share`. Owner only. */
  setCompareShared: (
    shareId: string,
    shared: boolean,
    options?: CallOptions,
  ) => Promise<CompareShareState>;
  /** `DELETE /api/compare/{shareId}` (204). Owner only; this also ends the share link. */
  deleteCompare: (shareId: string, options?: CallOptions) => Promise<void>;
  /**
   * Whether compare mode is on. The backend answers 404 `FEATURE_DISABLED` for every compare route
   * while its flag is off, and 404 `COMPARE_NOT_FOUND` for an unknown id while it is on, so one
   * read of an id that cannot exist tells them apart without a token or a model call. Only a clear
   * "off" (the code, or a 404/501 without a compare code, as on an older backend) returns false;
   * a rate limit or a failure to reach the API returns true, and the real call then reports it.
   */
  isCompareAvailable: (options?: CallOptions) => Promise<boolean>;
}

/** An id that is well formed (22 URL-safe characters) and cannot exist. */
const PROBE_ID = 'probe-compare-not-real';
const ID_SHAPE = /^[A-Za-z0-9_-]{22}$/;

export function isCompareShareId(value: unknown): value is string {
  return typeof value === 'string' && ID_SHAPE.test(value);
}

export function createCompareEndpoints(transport: Transport): CompareEndpoints {
  const idPath = (shareId: string) => `/api/compare/${pathSegment(shareId, 'shareId')}`;

  return {
    runCompare: async (input, options) =>
      await transport.json(
        {
          method: 'POST',
          path: '/api/compare',
          auth: 'required',
          timeoutMs: TIMEOUTS.battle,
          body: compact({
            prompt: requireText(input.prompt, 'prompt'),
            modelA: requireText(input.modelA, 'modelA'),
            modelB: requireText(input.modelB, 'modelB'),
            share: input.share === true ? true : undefined,
            maxTokens: input.maxTokens,
          }),
          schema: compareResultSchema,
        },
        options,
      ),

    getCompare: async (shareId, options) =>
      await transport.json(
        { method: 'GET', path: idPath(shareId), auth: 'optional', schema: compareResultSchema },
        options,
      ),

    setCompareShared: async (shareId, shared, options) =>
      await transport.json(
        {
          method: 'PUT',
          path: `${idPath(shareId)}/share`,
          auth: 'required',
          body: { shared },
          schema: compareShareStateSchema,
        },
        options,
      ),

    deleteCompare: async (shareId, options) => {
      await transport.json(
        { method: 'DELETE', path: idPath(shareId), auth: 'required', schema: z.unknown() },
        options,
      );
    },

    isCompareAvailable: async options => {
      try {
        await transport.json(
          { method: 'GET', path: idPath(PROBE_ID), auth: 'none', schema: z.unknown() },
          options,
        );
        return true;
      } catch (error) {
        if (isApiError(error) && (error.status === 404 || error.status === 501)) {
          return error.code === 'COMPARE_NOT_FOUND';
        }
        return true;
      }
    },
  };
}
