import { decodeProtectedHeader } from 'jose';
import type { Env } from '../env.ts';
import { JWKS_ALGORITHMS, JwksVerifier, remoteJwks } from './jwks.ts';
import { SharedSecretVerifier } from './shared-secret.ts';
import { AuthError, type TokenVerifier, type VerifiedUser } from './verifier.ts';

/** Dispatches on the `alg` of the token header. `none` and anything unlisted is rejected. */
export class CompositeVerifier implements TokenVerifier {
  private jwks: TokenVerifier | null;
  private shared: TokenVerifier | null;
  constructor(parts: { jwks?: TokenVerifier | null; shared?: TokenVerifier | null }) {
    this.jwks = parts.jwks ?? null;
    this.shared = parts.shared ?? null;
  }
  async verify(token: string): Promise<VerifiedUser> {
    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      throw new AuthError('malformed');
    }
    if (alg === 'HS256' && this.shared) return this.shared.verify(token);
    if (alg && JWKS_ALGORITHMS.includes(alg) && this.jwks) return this.jwks.verify(token);
    throw new AuthError('unsupported');
  }
}

// One remote key set per project URL, created once per isolate so its cache is reused.
const keySets = new Map<string, ReturnType<typeof remoteJwks>>();

/**
 * The verifier this deployment can run, or null when it can run none (then authenticated routes
 * answer 501 not_enabled). The public project URL enables the JWKS path; the optional secret adds
 * the HS256 path. Without the URL there is no issuer to check, so nothing is enabled.
 */
export function buildVerifier(env: Env): TokenVerifier | null {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  if (!url) return null;
  let keys = keySets.get(url);
  if (!keys) {
    keys = remoteJwks(url);
    keySets.set(url, keys);
  }
  return new CompositeVerifier({
    jwks: new JwksVerifier(keys, url),
    shared: env.SUPABASE_JWT_SECRET ? new SharedSecretVerifier(env.SUPABASE_JWT_SECRET, url) : null,
  });
}
