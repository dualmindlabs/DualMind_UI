// GET /api/v2/openapi.json (BE-5 design, section 5): the OpenAPI 3.1 document with an ETag and
// cache headers. The document is generated from the registered routes once per app (isolate) and
// serialised exactly like docs/api/openapi.v2.json, whose freshness the OpenAPI check in api.yml
// and tests/api/openapi.test.ts verify, so the served bytes are the committed bytes.

import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../context.ts';
import { ifNoneMatchHits } from '../leaderboard/etag.ts';

export const OPENAPI_PATH = '/api/v2/openapi.json';
export const OPENAPI_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

type DocConfig = Parameters<OpenAPIHono<AppEnv>['getOpenAPI31Document']>[0];

export function registerOpenapi(app: OpenAPIHono<AppEnv>, config: DocConfig) {
  let cached: Promise<{ body: string; etag: string }> | undefined;
  const document = () => {
    cached ??= (async () => {
      const body = `${JSON.stringify(app.getOpenAPI31Document(config), null, 2)}\n`;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
      const hex = Array.from(new Uint8Array(digest).slice(0, 8), byte => byte.toString(16).padStart(2, '0')).join('');
      return { body, etag: `"oa-${hex}"` };
    })();
    return cached;
  };

  app.get(OPENAPI_PATH, async c => {
    const { body, etag } = await document();
    const headers = { 'Cache-Control': OPENAPI_CACHE_CONTROL, ETag: etag };
    if (ifNoneMatchHits(c.req.header('if-none-match'), etag)) return c.body(null, 304, headers);
    return c.body(body, 200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  });
}
