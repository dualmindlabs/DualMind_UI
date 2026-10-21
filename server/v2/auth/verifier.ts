// Token verification behind one small interface (BE-0 design, section 6.4).

export type VerifiedUser = { id: string; role: string; /** seconds since the epoch */ expiresAt: number };

export type AuthFailureReason =
  | 'missing'
  | 'malformed'
  | 'expired'
  | 'bad_signature'
  | 'invalid_token'
  | 'unsupported'
  | 'jwks_unavailable';

export class AuthError extends Error {
  reason: AuthFailureReason;
  constructor(reason: AuthFailureReason) {
    super(reason);
    this.name = 'AuthError';
    this.reason = reason;
  }
}

export interface TokenVerifier {
  /** Throws AuthError; never returns an unverified user. */
  verify(token: string): Promise<VerifiedUser>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turns verified claims into a user: `sub` must be a UUID, `exp` a number. */
export function userFromClaims(payload: { sub?: unknown; role?: unknown; exp?: unknown }): VerifiedUser {
  if (typeof payload.sub !== 'string' || !UUID_RE.test(payload.sub) || typeof payload.exp !== 'number') {
    throw new AuthError('invalid_token');
  }
  return { id: payload.sub, role: typeof payload.role === 'string' ? payload.role : 'authenticated', expiresAt: payload.exp };
}
