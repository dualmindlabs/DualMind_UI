import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { toAuthError } from './jose-errors.ts';
import { userFromClaims, type TokenVerifier, type VerifiedUser } from './verifier.ts';

export const JWKS_ALGORITHMS = ['ES256', 'RS256', 'EdDSA'];

/** Supabase caches its JWKS for 10 minutes, so the Worker must not cache longer. */
export function remoteJwks(supabaseUrl: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`), {
    cacheMaxAge: 600_000,
    cooldownDuration: 30_000,
    timeoutDuration: 3_000,
  });
}

/** Asymmetric Supabase signing keys (ES256, RS256, EdDSA) verified against a key set. */
export class JwksVerifier implements TokenVerifier {
  private getKey: JWTVerifyGetKey;
  private issuer: string;
  constructor(getKey: JWTVerifyGetKey, supabaseUrl: string) {
    this.getKey = getKey;
    this.issuer = `${supabaseUrl}/auth/v1`;
  }
  async verify(token: string): Promise<VerifiedUser> {
    try {
      const { payload } = await jwtVerify(token, this.getKey, {
        issuer: this.issuer,
        audience: 'authenticated',
        algorithms: JWKS_ALGORITHMS,
        clockTolerance: 5,
      });
      return userFromClaims(payload);
    } catch (error) {
      throw toAuthError(error);
    }
  }
}
