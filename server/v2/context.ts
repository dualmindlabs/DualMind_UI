// Request context: the request id, the timer, the verified user, and the one log line per request.

import { createMiddleware } from 'hono/factory';
import { resolveRequestId } from '../request-id.js';
import type { Env } from './env.ts';
import { hashId, log } from './log.ts';
import type { VerifiedUser } from './auth/verifier.ts';

export type AppEnv = {
  Bindings: Env;
  Variables: { requestId: string; user: VerifiedUser | null; startedAt: number; route: string };
};

export const requestContext = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = resolveRequestId(c.req.header('x-request-id'));
  c.set('requestId', requestId);
  c.set('user', null);
  c.set('startedAt', Date.now());
  c.set('route', 'unmatched');
  try {
    await next();
  } finally {
    // After onError/notFound have produced a response, so every path carries the id.
    c.res.headers.set('X-Request-Id', requestId);
    const matched = c.req.matchedRoutes.filter(route => route.method !== 'ALL').at(-1);
    c.set('route', matched?.path ?? 'unmatched');
    const user = c.get('user');
    log({
      event: 'api_request',
      requestId,
      method: c.req.method,
      route: c.get('route'),
      status: c.res.status,
      durationMs: Date.now() - c.get('startedAt'),
      user: user ? await hashId(c.env, 'user', user.id) : null,
    });
  }
});
