import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { meSchema, problemResponse } from '../../../contract/common.ts';
import { auth, type VerifierFactory } from '../auth/middleware.ts';
import type { AppEnv } from '../context.ts';

export function registerMe(app: OpenAPIHono<AppEnv>, getVerifier: VerifierFactory) {
  const meRoute = createRoute({
    method: 'get',
    path: '/api/v2/me',
    summary: 'What the verified token says',
    description: 'Needs `Authorization: Bearer <Supabase access token>`. Returns the claims of the verified token and nothing from a database. The cheapest auth probe.',
    tags: ['platform'],
    middleware: [auth('required', getVerifier)] as const,
    responses: {
      200: { description: 'The verified user.', content: { 'application/json': { schema: meSchema } } },
      401: problemResponse('Missing, malformed, expired or otherwise invalid token.'),
      500: problemResponse('Unexpected error.'),
      501: problemResponse('Sign-in verification is not enabled on this deployment (not_enabled).'),
    },
  });

  app.openapi(meRoute, c => {
    const user = c.get('user')!;
    return c.json({ userId: user.id, role: user.role, expiresAt: new Date(user.expiresAt * 1000).toISOString() }, 200);
  });
}
