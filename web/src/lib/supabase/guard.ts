/**
 * The route guard rule for pages that need a session (the arena and settings slices use it
 * through `useRequireAuth()`): a signed-out visitor goes to `/login/?redirect=<this page>`.
 *
 * Loop guard, as in the legacy app (js/ui/app.js): the first redirect sets
 * `sessionStorage['auth_redirect_attempted']`; if the visitor comes back still signed out, the
 * flag is cleared and the page stays (it shows its own signed-out state) instead of bouncing
 * between the two pages. Signing in clears the flag.
 */
import { loginUrl } from './redirect';
import { AUTH_REDIRECT_GUARD_KEY, type KeyValueStorage } from './storage';

export type GuardStatus = 'loading' | 'signed-in' | 'signed-out' | 'unavailable';

export interface GuardLocation {
  pathname: string;
  search: string;
  hash: string;
}

/** Where to send the visitor, or null to stay. Updates the loop guard flag. */
export function guardRedirect(
  status: GuardStatus,
  location: GuardLocation,
  origin: string,
  storage: KeyValueStorage | null,
): string | null {
  const read = () => {
    try {
      return storage?.getItem(AUTH_REDIRECT_GUARD_KEY) ?? null;
    } catch {
      return null;
    }
  };
  const write = (value: string | null) => {
    try {
      if (value === null) storage?.removeItem(AUTH_REDIRECT_GUARD_KEY);
      else storage?.setItem(AUTH_REDIRECT_GUARD_KEY, value);
    } catch {
      // Blocked storage: no loop guard, but no crash either.
    }
  };

  if (status === 'signed-in') {
    write(null);
    return null;
  }
  if (status !== 'signed-out') return null;
  if (read()) {
    write(null);
    return null;
  }
  write('true');
  return loginUrl(`${location.pathname}${location.search}${location.hash}`, origin);
}
