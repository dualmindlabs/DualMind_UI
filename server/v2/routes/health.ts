import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { API_VERSION, healthSchema, problemResponse } from '../../../contract/common.ts';
import { enabledBindings, environmentFor } from '../bindings.ts';
import type { AppEnv } from '../context.ts';

export const healthRoute = createRoute({
  method: 'get',
  path: '/api/v2/health',
  summary: 'Health of the v2 router',
  description: 'Public and never cached. Says only that the v2 router is alive and which backend bindings this host has; it does not call the DualMind API (that is /api/health).',
  tags: ['platform'],
  responses: {
    200: { description: 'The router is alive.', content: { 'application/json': { schema: healthSchema } } },
    500: problemResponse('Unexpected error.'),
  },
});

export function registerHealth(app: OpenAPIHono<AppEnv>) {
  app.openapi(healthRoute, c => {
    const hostname = new URL(c.req.url).hostname;
    c.header('Cache-Control', 'no-store');
    return c.json(
      {
        status: 'ok' as const,
        apiVersion: API_VERSION,
        time: new Date().toISOString(),
        environment: environmentFor(hostname),
        bindings: enabledBindings(c.env, hostname),
      },
      200,
    );
  });
}
