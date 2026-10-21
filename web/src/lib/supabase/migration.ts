/**
 * One-time session migration (docs/redesign/migration-plan.md, section 4).
 *
 * The old /login/ page wrote its session only to `dualmind.auth.supabase`. When supabase-js's
 * default key holds no session but that legacy copy has tokens, the new client adopts them with
 * `setSession()`, so nobody is signed out by the redesign. A copy the auth server rejects (an
 * expired or revoked refresh token) is removed, so the attempt is not repeated on every page; a
 * network failure keeps it for the next visit.
 */
import type { Session } from '@supabase/supabase-js';

import { LEGACY_SESSION_KEY } from '@/lib/session/handoff';

import type { AuthClient } from './client';
import type { KeyValueStorage } from './storage';

export interface LegacyTokens {
  access_token: string;
  refresh_token: string;
}

export type MigrationResult =
  | { status: 'migrated'; session: Session }
  | { status: 'none' }
  | { status: 'rejected' }
  | { status: 'error' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function tokensFrom(value: unknown): LegacyTokens | null {
  if (!isRecord(value)) return null;
  const { access_token: access, refresh_token: refresh } = value;
  if (typeof access !== 'string' || typeof refresh !== 'string') return null;
  if (access.trim() === '' || refresh.trim() === '') return null;
  return { access_token: access, refresh_token: refresh };
}

/**
 * The tokens in the legacy copy, or null. Reads `{ user, session }` (supabase-auth.js and the old
 * /login/ page) and a bare session object; anything else, including broken JSON, is ignored.
 */
export function readLegacyTokens(storage: KeyValueStorage | null): LegacyTokens | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(LEGACY_SESSION_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  return tokensFrom(parsed.session) ?? tokensFrom(parsed);
}

/** True when supabase-js's own key for this project holds a session. */
export function hasDefaultSession(storage: KeyValueStorage | null, storageKey: string): boolean {
  try {
    const value = storage?.getItem(storageKey) ?? null;
    return value !== null && value !== '' && value !== 'null';
  } catch {
    return false;
  }
}

/** HTTP statuses that mean "these tokens are no good", as opposed to "try again later". */
function isRejection(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const status = typeof error.status === 'number' ? error.status : 0;
  return status >= 400 && status < 500;
}

/**
 * Adopts the legacy session when the default key is empty. Never throws.
 * @param storageKey supabase-js's key for this project (`sb-<ref>-auth-token`)
 */
export async function migrateLegacySession(
  client: Pick<AuthClient, 'auth'>,
  storage: KeyValueStorage | null,
  storageKey: string,
): Promise<MigrationResult> {
  if (hasDefaultSession(storage, storageKey)) return { status: 'none' };
  const tokens = readLegacyTokens(storage);
  if (!tokens) return { status: 'none' };
  try {
    const { data, error } = await client.auth.setSession(tokens);
    if (error || !data.session) {
      if (!error || isRejection(error)) {
        try {
          storage?.removeItem(LEGACY_SESSION_KEY);
        } catch {
          // Blocked storage: nothing to clean.
        }
        return { status: 'rejected' };
      }
      return { status: 'error' };
    }
    return { status: 'migrated', session: data.session };
  } catch {
    return { status: 'error' };
  }
}
