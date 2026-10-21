import { jwtVerify } from 'jose';
import { toAuthError } from './jose-errors.ts';
import { userFromClaims, type TokenVerifier, type VerifiedUser } from './verifier.ts';

/** The legacy Supabase signing secret: HS256 only, never any other algorithm. */
export class SharedSecretVerifier implements TokenVerifier {
  private secret: Uint8Array;
  private issuer: string;
  constructor(secret: string, supabaseUrl: string) {
    this.secret = new TextEncoder().encode(secret);
    this.issuer = `${supabaseUrl}/auth/v1`;
  }
  async verify(token: string): Promise<VerifiedUser> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: 'authenticated',
        algorithms: ['HS256'],
        clockTolerance: 5,
      });
      return userFromClaims(payload);
    } catch (error) {
      throw toAuthError(error);
    }
  }
}
