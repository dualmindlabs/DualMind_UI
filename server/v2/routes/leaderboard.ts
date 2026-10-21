import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { ExecutionContext } from 'hono';
import { problemResponse } from '../../../contract/common.ts';
import { leaderboardResponseSchema } from '../../../contract/leaderboard.ts';
import type { AppEnv } from '../context.ts';
import { ifNoneMatchHits } from '../leaderboard/etag.ts';
import { cacheStatus, getLeaderboard } from '../leaderboard/service.ts';
import { log } from '../log.ts';

export const CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=60, stale-if-error=86400';

export const leaderboardRoute = createRoute({
  method: 'get',
  path: '/api/v2/leaderboard',
  summary: 'The public leaderboard',
  description:
    'Every ranked model with its Elo, record and win rate, served from the edge cache (HEAD works too). No sign-in. `winRate` is a percent from 0 to 100 and counts ties as non-wins. ' +
    '`provisional` is true while `totalResponses` is below `meta.provisionalBelow`. `meta.generatedAt` is when the data last changed, not when it was served. ' +
    'The list is small and returned whole, so there is no `nextCursor`. Send `If-None-Match` with the last `ETag` to get `304`. During an outage of the DualMind API the last good copy (up to 24 hours old) is served.',
  tags: ['leaderboard'],
  responses: {
    200: {
      description: 'The leaderboard.',
      content: { 'application/json': { schema: leaderboardResponseSchema } },
      headers: {
        ETag: { description: 'Strong tag from a hash of the data, like "lb-5e0c1b7a93d24f10".', schema: { type: 'string' } },
        'Cache-Control': { description: CACHE_CONTROL, schema: { type: 'string' } },
        'Cache-Status': { description: 'RFC 9211: hit, stale or miss.', schema: { type: 'string' } },
      },
    },
    304: { description: 'The `If-None-Match` tag matches; no body.' },
    429: problemResponse('Rate limit hit (rate_limited).'),
    500: problemResponse('Unexpected error.'),
    502: problemResponse('The DualMind API is unreachable or invalid and no copy is stored (bad_gateway).'),
    504: problemResponse('The DualMind API did not answer in time and no copy is stored (gateway_timeout).'),
  },
});

export function registerLeaderboard(app: OpenAPIHono<AppEnv>) {
  app.openapi(leaderboardRoute, async c => {
    const requestId = c.get('requestId');
    let ctx: ExecutionContext | undefined;
    try {
      ctx = c.executionCtx;
    } catch {
      ctx = undefined;
    }
    let result;
    try {
      result = await getLeaderboard(c.env, ctx, requestId, c.req.url);
    } catch (error) {
      log({ event: 'leaderboard', requestId, state: 'error', ageSeconds: null, etag: null, status: error instanceof Error && 'slug' in error && error.slug === 'gateway_timeout' ? 504 : 502 });
      throw error;
    }
    const headers: Record<string, string> = {
      'Cache-Control': CACHE_CONTROL,
      ETag: result.etag,
      'Cache-Status': cacheStatus(result),
    };
    const notModified = ifNoneMatchHits(c.req.header('if-none-match'), result.etag);
    const status = notModified ? 304 : 200;
    log({ event: 'leaderboard', requestId, state: result.state, ageSeconds: result.ageSeconds, etag: result.etag, status });
    if (notModified) return c.body(null, 304, headers);
    return c.body(result.text, 200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  });
}
