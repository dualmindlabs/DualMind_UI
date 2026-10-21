// Schemas shared by the v2 Worker and the web app. Pure zod: no Worker code, no other imports.

import { z } from 'zod';

/** `info.version` of the OpenAPI document and `apiVersion` of /api/v2/health (semver; minor bump per additive release). */
export const API_VERSION = '2.0.0';

export const problemSchema = z
  .object({
    type: z.string().describe('Identifier URL of the problem type'),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string().describe('The request path'),
    requestId: z.string(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    retryAfter: z.number().int().optional(),
    feature: z.string().optional(),
  })
  .meta({ id: 'Problem' });
export type Problem = z.infer<typeof problemSchema>;

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** A response entry for createRoute(): the Problem schema under application/problem+json. */
export function problemResponse(description: string) {
  return {
    description,
    content: { [PROBLEM_CONTENT_TYPE]: { schema: problemSchema } },
  };
}

export const healthSchema = z
  .object({
    status: z.literal('ok'),
    apiVersion: z.string(),
    time: z.iso.datetime(),
    environment: z.enum(['production', 'preview']).describe('Which binding set this host uses'),
    bindings: z
      .object({ DB: z.boolean(), CACHE: z.boolean(), EVENTS: z.boolean(), PUBLIC_BUCKET: z.boolean() })
      .describe('Which backend bindings are present for this host (names only)'),
  })
  .meta({ id: 'Health' });
export type Health = z.infer<typeof healthSchema>;

export const meSchema = z
  .object({
    userId: z.uuid(),
    role: z.string(),
    expiresAt: z.iso.datetime(),
  })
  .meta({ id: 'Me' });
export type Me = z.infer<typeof meSchema>;
