// RFC 9457 problem details for every error the v2 router sends (BE-0 design, section 6.3).

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { PROBLEM_TYPES, problemTypeUrl } from '../problem-types.js';
import type { Problem } from '../../contract/common.ts';
import { PROBLEM_CONTENT_TYPE } from '../../contract/common.ts';
import { log } from './log.ts';

export type ProblemSlug = keyof typeof PROBLEM_TYPES & string;

export type ProblemOptions = {
  /** User-safe text. Never an exception message or a stack. */
  detail?: string;
  errors?: { path: string; message: string }[];
  retryAfter?: number;
  feature?: string;
  headers?: Record<string, string>;
};

/** Thrown from handlers and middleware; app.onError turns it into a response. */
export class ProblemError extends Error {
  slug: ProblemSlug;
  options: ProblemOptions;
  constructor(slug: ProblemSlug, options: ProblemOptions = {}) {
    super(slug);
    this.name = 'ProblemError';
    this.slug = slug;
    this.options = options;
  }
}

export function isProblemSlug(slug: string): slug is ProblemSlug {
  return Object.hasOwn(PROBLEM_TYPES, slug);
}

/** The problem+json body for a type, without sending it. */
export function problemBody(slug: ProblemSlug, options: ProblemOptions, requestId: string, instance: string): Problem {
  const entry = PROBLEM_TYPES[slug]!;
  const body: Problem = {
    type: problemTypeUrl(slug),
    title: entry.title,
    status: entry.status,
    instance,
    requestId,
  };
  if (options.detail !== undefined) body.detail = options.detail;
  if (options.errors !== undefined) body.errors = options.errors;
  if (options.retryAfter !== undefined) body.retryAfter = options.retryAfter;
  if (options.feature !== undefined) body.feature = options.feature;
  return body;
}

/** A problem+json Response. `requestId` and `instance` come from the request. */
export function problem(slug: ProblemSlug, options: ProblemOptions, requestId: string, instance: string): Response {
  const entry = PROBLEM_TYPES[slug]!;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', `${PROBLEM_CONTENT_TYPE}; charset=utf-8`);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Request-Id', requestId);
  if (options.retryAfter !== undefined) headers.set('Retry-After', String(options.retryAfter));
  return new Response(JSON.stringify(problemBody(slug, options, requestId, instance)), { status: entry.status, headers });
}

/** Problem response for a Hono context (reads the request id the context middleware set). */
export function problemFor(c: Context, slug: ProblemSlug, options: ProblemOptions = {}): Response {
  return problem(slug, options, (c.get('requestId') as string | undefined) ?? 'unknown', new URL(c.req.url).pathname);
}

export function onError(error: unknown, c: Context): Response {
  if (error instanceof ProblemError) {
    return problemFor(c, error.slug, error.options);
  }
  // Errors Hono and zod-openapi raise themselves (an unsupported media type, malformed JSON, a body
  // over the limit) keep their status, in problem+json.
  if (error instanceof HTTPException && error.status < 500) {
    const slug = Object.keys(PROBLEM_TYPES).find(key => PROBLEM_TYPES[key]!.status === error.status);
    if (slug) {
      return problemFor(c, slug, { detail: error.status === 400 ? 'The request could not be read.' : undefined });
    }
  }
  // Anything else is a bug: stack in the logs only, a generic body for the caller.
  log({
    event: 'api_error',
    requestId: c.get('requestId') ?? null,
    type: 'internal_error',
    status: 500,
    error: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error),
  });
  return problemFor(c, 'internal_error', { detail: 'Something went wrong on our side.' });
}
