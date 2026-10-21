import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../context.ts';
import type { Env } from '../env.ts';
import { log } from '../log.ts';
import { ProblemError } from '../problems.ts';
import { AuthError, type TokenVerifier } from './verifier.ts';

export type VerifierFactory = (env: Env) => TokenVerifier | null;

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1]! : null;
}

/**
 * auth('required'): 401 without a good token, 501 not_enabled when no verifier is configured.
 * auth('optional'): anonymous when there is no verifier or no token; a token that is present but
 * bad is still a 401, so a client never silently loses its identity.
 */
export function auth(mode: 'required' | 'optional', getVerifier: VerifierFactory) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const verifier = getVerifier(c.env);
    if (!verifier) {
      if (mode === 'required') throw new ProblemError('not_enabled', { feature: 'auth', detail: 'Sign-in verification is not enabled on this deployment.' });
      await next();
      return;
    }
    const header = c.req.header('authorization');
    const token = bearerToken(header);
    if (!token) {
      if (header) {
        log({ event: 'auth_failed', requestId: c.get('requestId'), reason: 'malformed' });
        throw new ProblemError('unauthorized', { detail: 'The Authorization header must be "Bearer <token>".', headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } });
      }
      if (mode === 'required') {
        log({ event: 'auth_failed', requestId: c.get('requestId'), reason: 'missing' });
        throw new ProblemError('unauthorized', { detail: 'Send a Supabase access token as "Authorization: Bearer <token>".', headers: { 'WWW-Authenticate': 'Bearer' } });
      }
      await next();
      return;
    }
    try {
      c.set('user', await verifier.verify(token));
    } catch (error) {
      const reason = error instanceof AuthError ? error.reason : 'invalid_token';
      log({ event: 'auth_failed', requestId: c.get('requestId'), reason });
      throw new ProblemError('unauthorized', {
        detail: reason === 'jwks_unavailable' ? 'The token could not be verified.' : 'The token is not valid.',
        headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' },
      });
    }
    await next();
    c.header('Cache-Control', 'private, no-store');
  });
}
