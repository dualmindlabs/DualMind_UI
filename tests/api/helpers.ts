import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet, type JWK } from 'jose';
import type { Env } from '../../server/v2/env.ts';

export const SUPABASE_URL = 'https://test-project.supabase.co';
export const ISSUER = `${SUPABASE_URL}/auth/v1`;
export const USER_ID = '3f6c7f0e-5d2b-4f0a-9f3e-0b9a6a1d2c11';

export type Signed = { token: string; jwks: ReturnType<typeof createLocalJWKSet> };

export async function makeKey(alg = 'ES256', kid = 'k1') {
  const { publicKey, privateKey } = await generateKeyPair(alg, { extractable: true });
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid, alg, use: 'sig' };
  return { privateKey, jwk, jwks: createLocalJWKSet({ keys: [jwk] }) };
}

export async function sign(
  privateKey: CryptoKey | Uint8Array,
  options: { alg?: string; kid?: string; issuer?: string; audience?: string; expiresIn?: string | number; sub?: string; role?: string } = {},
) {
  const jwt = new SignJWT({ role: options.role ?? 'authenticated' })
    .setProtectedHeader({ alg: options.alg ?? 'ES256', kid: options.kid ?? 'k1' })
    .setSubject(options.sub ?? USER_ID)
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? 'authenticated')
    .setIssuedAt();
  if (options.expiresIn === undefined) jwt.setExpirationTime('1h');
  else if (typeof options.expiresIn === 'number') jwt.setExpirationTime(options.expiresIn);
  else jwt.setExpirationTime(options.expiresIn);
  return jwt.sign(privateKey);
}

export const baseEnv: Env = { SUPABASE_URL };
