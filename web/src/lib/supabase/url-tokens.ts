/**
 * Where the app reads sign-in tokens from the address, and when it asks before replacing the
 * account that is already signed in (login CSRF, cycle 5 P2-2).
 *
 * An attacker can send `https://arena.../#access_token=<theirs>&refresh_token=...`. If every page
 * read the hash, the victim would land in the arena as the attacker and every prompt they type
 * would be saved to the attacker's history. So supabase-js reads the URL only on the two auth
 * pages, and the callback page asks first when a different session is already stored.
 */
import { hasAuthParams, hasStoredSession } from '@/lib/session/handoff';

import { AUTH_CALLBACK_PATH, UPDATE_PASSWORD_PATH } from './redirect';
import { browserLocalStorage, browserSessionStorage, type KeyValueStorage } from './storage';

/** sessionStorage, this tab: the visitor said "switch" for the tokens in this page's URL. */
export const SWITCH_CONFIRM_KEY = 'dm.switch.v1';

/** The tokens in the URL are only ever read on these pages (the email and OAuth targets). */
export function readsUrlTokens(pathname: string): boolean {
  return pathname === AUTH_CALLBACK_PATH || pathname === UPDATE_PASSWORD_PATH;
}

type ReadableStorage = Pick<Storage, 'length' | 'key' | 'getItem'>;

export function readSwitchConfirmed(tab: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return tab?.getItem(SWITCH_CONFIRM_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSwitchConfirmed(
  tab: Pick<Storage, 'setItem' | 'removeItem'> | null,
  on: boolean,
): void {
  try {
    if (on) tab?.setItem(SWITCH_CONFIRM_KEY, '1');
    else tab?.removeItem(SWITCH_CONFIRM_KEY);
  } catch {
    // Blocked storage: the visitor is asked again after the reload.
  }
}

function safeHasSession(local: ReadableStorage | null): boolean {
  try {
    return local !== null && hasStoredSession(local);
  } catch {
    return false;
  }
}

/**
 * True when the callback page was opened with tokens while a session is already stored and the
 * visitor has not said "switch" yet. The reset page is exempt: opening a reset link is how a
 * visitor proves they own that account, and it replaces nothing silently (the form names it).
 */
export function accountSwitchPending(
  location: { pathname: string; search: string; hash: string },
  local: ReadableStorage | null,
  tab: Pick<Storage, 'getItem'> | null,
): boolean {
  return (
    location.pathname === AUTH_CALLBACK_PATH &&
    /[#&](access_token|refresh_token)=/.test(location.hash) &&
    hasAuthParams(location.search, location.hash) &&
    safeHasSession(local) &&
    !readSwitchConfirmed(tab)
  );
}

/**
 * supabase-js's `detectSessionInUrl`, as a function: true only on the auth pages, and on the
 * callback page only when no other account is waiting for a yes.
 */
export function shouldDetectSessionInUrl(
  url: Pick<URL, 'pathname' | 'search' | 'hash'>,
  local: ReadableStorage | null = browserLocalStorage(),
  tab: KeyValueStorage | null = browserSessionStorage(),
): boolean {
  if (!readsUrlTokens(url.pathname)) return false;
  return !accountSwitchPending(url, local, tab);
}
