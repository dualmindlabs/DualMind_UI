// One JSON log line per event (Workers Logs picks console.log up once enabled). Never log
// bodies, tokens, raw ids or IPs (BE-0 design, sections 9 and 11).

import type { Env } from './env.ts';

export function log(event: Record<string, unknown>): void {
  console.log(JSON.stringify(event));
}

/**
 * First 16 hex characters of HMAC-SHA-256(PRIVACY_SALT, `${kind}:${id}`), or null when the salt
 * secret is not configured (the id is then simply not logged).
 */
export async function hashId(env: Env, kind: 'user' | 'ip', id: string): Promise<string | null> {
  const salt = env?.PRIVACY_SALT;
  if (!salt) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${kind}:${id}`));
  return Array.from(new Uint8Array(mac).slice(0, 8), byte => byte.toString(16).padStart(2, '0')).join('');
}
