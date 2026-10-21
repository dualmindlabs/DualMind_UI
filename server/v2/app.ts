// The /api/v2 router (BE-0 design). worker.js mounts it before the v1 proxy:
//   /api/v2 and /api/v2/*  ->  handle(request, env, ctx)
// Middleware order: requestContext, onError/notFound (problem+json), body limit, then per route
// auth(), guard() and the handler. Every response carries X-Request-Id.

import { OpenAPIHono } from '@hono/zod-openapi';
import type { ExecutionContext } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { API_VERSION } from '../../contract/common.ts';
import { buildVerifier } from './auth/composite.ts';
import type { VerifierFactory } from './auth/middleware.ts';
import { requestContext, type AppEnv } from './context.ts';
import { onError, problemFor, ProblemError } from './problems.ts';
import { registerHealth } from './routes/health.ts';
import { registerMe } from './routes/me.ts';

export const MAX_JSON_BODY_BYTES = 1024 * 1024;

export const OPENAPI_PATH = '/api/v2/openapi.json';

export const openapiConfig = {
  openapi: '3.1.0' as const,
  info: {
    title: 'DualMind Arena API v2',
    version: API_VERSION,
    description: 'The Arena Worker API. JSON in and out, errors as RFC 9457 problem+json, every response carries X-Request-Id. /api/v2 changes only additively.',
  },
  servers: [{ url: 'https://arena.dualmindlab.tech' }],
};

export type AppOptions = {
  /** Replaces the Supabase verifier (tests). */
  verifier?: VerifierFactory;
  /** Registers extra routes (tests). */
  extend?: (app: OpenAPIHono<AppEnv>) => void;
};

/** Paths of registered (non-middleware) routes, as a matcher per method. */
function allowedMethods(app: OpenAPIHono<AppEnv>, pathname: string): string[] {
  const methods = new Set<string>();
  for (const route of app.routes) {
    if (route.method === 'ALL') continue;
    const pattern = new RegExp(`^${route.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z0-9_]+/g, '[^/]+')}$`);
    if (pattern.test(pathname)) {
      methods.add(route.method);
      if (route.method === 'GET') methods.add('HEAD');
    }
  }
  return [...methods].sort();
}

export function createApp(options: AppOptions = {}): OpenAPIHono<AppEnv> {
  const getVerifier = options.verifier ?? buildVerifier;
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        throw new ProblemError('validation_error', {
          detail: 'The request did not match the schema.',
          errors: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
        });
      }
    },
  });

  app.use('*', requestContext);
  // (reserved) idempotency middleware slot: BE-6.
  app.use(
    '*',
    bodyLimit({
      maxSize: MAX_JSON_BODY_BYTES,
      onError: c => problemFor(c, 'payload_too_large', { detail: 'JSON bodies are limited to 1 MiB.' }),
    }),
  );
  app.use('*', async (c, next) => {
    const method = c.req.method;
    const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
    if (hasBody && c.req.header('content-length') !== '0' && (c.req.header('content-length') || c.req.header('transfer-encoding'))) {
      const type = (c.req.header('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
      if (type !== 'application/json') {
        throw new ProblemError('unsupported_media_type', { detail: 'Send the body as application/json.' });
      }
    }
    await next();
  });

  app.onError(onError);
  app.notFound(c => {
    const allow = allowedMethods(app, new URL(c.req.url).pathname);
    if (allow.length > 0) {
      return problemFor(c, 'method_not_allowed', { detail: `Use ${allow.join(', ')} on this path.`, headers: { Allow: allow.join(', ') } });
    }
    return problemFor(c, 'not_found', { detail: 'No such path under /api/v2.' });
  });

  registerHealth(app);
  registerMe(app, getVerifier);
  options.extend?.(app);

  app.doc31(OPENAPI_PATH, openapiConfig);
  return app;
}

export const app = createApp();

/** What worker.js calls. `ctx` is optional: handlers use waitUntil only when present. */
export function handle(request: Request, env: AppEnv['Bindings'], ctx?: ExecutionContext): Promise<Response> | Response {
  return app.fetch(request, env, ctx);
}
