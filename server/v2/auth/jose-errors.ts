import { errors } from 'jose';
import { AuthError } from './verifier.ts';

/** Maps a jose failure to an AuthError. An outage of the JWKS endpoint must not look like a bad token. */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (error instanceof errors.JWTExpired) return new AuthError('expired');
  if (error instanceof errors.JWSSignatureVerificationFailed) return new AuthError('bad_signature');
  if (error instanceof errors.JWKSTimeout) return new AuthError('jwks_unavailable');
  if (error instanceof errors.JWKSNoMatchingKey) return new AuthError('invalid_token');
  if (error instanceof errors.JWSInvalid || error instanceof errors.JWTInvalid) return new AuthError('malformed');
  // Network failures surface as TypeError or a generic JOSEError ("Expected 200 OK from the JSON Web Key Set").
  if (error instanceof TypeError) return new AuthError('jwks_unavailable');
  if (error instanceof errors.JOSEError && error.code === 'ERR_JOSE_GENERIC') return new AuthError('jwks_unavailable');
  return new AuthError('invalid_token');
}
