/**
 * The browser storage the auth layer reads and writes, and the keys it owns.
 *
 * - The session itself is supabase-js's (`sb-<project ref>-auth-token`, default key).
 * - `dualmind.auth.supabase` is the legacy app's copy (`{ user, session }`, written by
 *   js/auth/supabase-auth.js and the old /login/ page). Until the arena slice (S8) the new pages
 *   keep it in step (the legacy arena reads it), migrate a session that only exists there, and
 *   remove it with the other legacy keys on sign-out.
 * - Signing out also empties the offline vote queue (`dm.voteQueue.v1`: votes belong to the user
 *   who cast them) and the cached profile.
 */
import type { Session } from '@supabase/supabase-js';

import { VOTE_QUEUE_STORAGE_KEY } from '@/lib/api';
import { LEGACY_SESSION_KEY } from '@/lib/session/handoff';

/** Every key the legacy app used for a session (screen-inventory.md section 5, row 6). */
export const LEGACY_AUTH_KEYS = Object.freeze([
  LEGACY_SESSION_KEY,
  'dualmind.auth.token',
  'dualmind.auth',
  'supabase.auth.token',
] as const);

/** sessionStorage: the profile from POST /api/users/sync, for the signed-in user. */
export const PROFILE_CACHE_KEY = 'dm.profile.v1';

/** sessionStorage: the legacy sign-in loop guard (js/ui/app.js, screen-inventory.md row 5). */
export const AUTH_REDIRECT_GUARD_KEY = 'auth_redirect_attempted';

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type ScannableStorage = KeyValueStorage & Pick<Storage, 'length' | 'key'>;

/** window.localStorage, or null when it is blocked (access itself can throw). */
export function browserLocalStorage(): ScannableStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** window.sessionStorage, or null when it is blocked. */
export function browserSessionStorage(): ScannableStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function attempt(action: () => void): void {
  try {
    action();
  } catch {
    // Full or blocked storage: the auth flow continues without the copy.
  }
}

/** Keeps the legacy app's copy of the session in step with supabase-js's own. */
export function writeLegacySession(storage: KeyValueStorage | null, session: Session): void {
  if (!storage) return;
  attempt(() =>
    storage.setItem(LEGACY_SESSION_KEY, JSON.stringify({ user: session.user, session })),
  );
}

/** Removes every legacy session key. */
export function clearLegacyKeys(storage: KeyValueStorage | null): void {
  if (!storage) return;
  for (const key of LEGACY_AUTH_KEYS) attempt(() => storage.removeItem(key));
}

/** What sign-out leaves behind: nothing of the user's (legacy keys, vote queue, profile cache). */
export function clearSignedOutData(
  local: KeyValueStorage | null,
  session: KeyValueStorage | null,
): void {
  clearLegacyKeys(local);
  if (local) attempt(() => local.removeItem(VOTE_QUEUE_STORAGE_KEY));
  if (session) attempt(() => session.removeItem(PROFILE_CACHE_KEY));
}
