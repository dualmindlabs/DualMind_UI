/**
 * The landing page's signed-in switch (docs/redesign/migration-plan.md section 3.3).
 *
 * `/` is the prerendered landing page, and the signed-in arena (src/features/arena/) renders at
 * `/` itself. The classic arena and its `?arena=legacy` switch were removed at the cutover (S13).
 *
 * - A signed-in visitor, or a visit with Supabase auth parameters in the URL (an OAuth or
 *   magic-link return; supabase-js in the app reads them), stays on `/`: the script marks
 *   <html data-arena> before the first paint, CSS hides the landing page and shows the arena's
 *   loading frame, and the app renders the arena once the session is confirmed
 *   (src/app/routes/home.tsx). A password recovery link goes on to /update-password.html with its
 *   hash.
 * - A leftover `?arena=` parameter or `localStorage['dm.arena']` from the classic-arena era is
 *   ignored.
 *
 * SESSION_HANDOFF_SCRIPT runs inline in the landing page's <head> (the Content-Security-Policy
 * allows it by its sha256, computed by build.js). It is built from the same regular expressions
 * and constants as the functions below, and the unit tests run it against the same cases, so
 * the two cannot drift apart.
 */

/** The removed classic app's Supabase session key; still read for the one-time session migration. */
export const LEGACY_SESSION_KEY = 'dualmind.auth.supabase';

/**
 * supabase-js's default session key, `sb-<project ref>-auth-token`. The PKCE verifier
 * (`...-auth-token-code-verifier`) is not a session and does not match.
 */
export const SUPABASE_SESSION_KEY_RE = /^sb-[A-Za-z0-9-]+-auth-token$/;

/** Tokens in the hash: the implicit OAuth flow and magic links. */
export const AUTH_HASH_RE = /[#&](access_token|refresh_token)=/;

/** The PKCE code or an email OTP token hash in the query string. */
export const AUTH_QUERY_RE = /[?&](code|token_hash)=/;

/** Email links: recovery, sign-up confirmation, magic link, invite, email change. */
export const AUTH_TYPE_RE = /[#?&]type=(recovery|signup|magiclink|invite|email_change)(&|$)/;

/**
 * Set on <html> by the inline script when the signed-in arena renders at `/`: CSS then hides the
 * landing page and shows the arena's loading frame until the app takes over.
 */
export const ARENA_ATTRIBUTE = 'data-arena';

/** Where password recovery links continue in the new app (slice S6). */
export const RECOVERY_PATH = '/update-password.html';

/** A password recovery link (`type=recovery`). */
export const RECOVERY_TYPE_RE = /[#?&]type=recovery(&|$)/;

type SessionStorage = Pick<Storage, 'length' | 'key' | 'getItem'>;

function hasValue(value: string | null): boolean {
  return value !== null && value !== '' && value !== 'null';
}

/** True when the browser holds a Supabase session (the legacy key or a supabase-js default key). */
export function hasStoredSession(storage: SessionStorage): boolean {
  if (hasValue(storage.getItem(LEGACY_SESSION_KEY))) return true;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && SUPABASE_SESSION_KEY_RE.test(key) && hasValue(storage.getItem(key))) {
      return true;
    }
  }
  return false;
}

/** True when the URL carries Supabase auth parameters that the app finishes on `/`. */
export function hasAuthParams(search: string, hash: string): boolean {
  return AUTH_HASH_RE.test(hash) || AUTH_QUERY_RE.test(search) || AUTH_TYPE_RE.test(hash + search);
}

/**
 * The hand-off only ever runs on the landing page itself. React Router's SPA fallback page is
 * rendered from the `/` route too, so the script also ends up in the HTML of client-only routes
 * such as /auth-callback.html, where Supabase tokens in the URL must stay with the web app.
 */
export const HANDOFF_PATH = '/';

/** What `/` shows: the landing page, the arena, or a hand-off to the new password page. */
export type LandingView =
  { kind: 'landing' } | { kind: 'arena' } | { kind: 'recovery'; target: string };

/**
 * Decides what `/` shows. Storage that cannot be read (blocked cookies, private mode) counts as
 * signed out; any path but `/` stays as it is (the landing view).
 */
export function landingView(
  location: Pick<Location, 'search' | 'hash'> & { pathname?: string },
  storage: SessionStorage | null,
): LandingView {
  if ((location.pathname ?? HANDOFF_PATH) !== HANDOFF_PATH) return { kind: 'landing' };
  let signedIn = false;
  try {
    signedIn = storage !== null && hasStoredSession(storage);
  } catch {
    signedIn = false;
  }
  const auth = hasAuthParams(location.search, location.hash);
  // The new app finishes sign-ins itself (supabase-js reads the tokens); a recovery link goes on
  // to the new password page with its hash, like /auth-callback.html does.
  if (RECOVERY_TYPE_RE.test(location.hash + location.search)) {
    return { kind: 'recovery', target: `${RECOVERY_PATH}${location.search}${location.hash}` };
  }
  return auth || signedIn ? { kind: 'arena' } : { kind: 'landing' };
}

/**
 * Where to send the visitor, or null to stay on `/` (the landing page or the arena).
 */
export function handoffDestination(
  location: Pick<Location, 'search' | 'hash'> & { pathname?: string },
  storage: SessionStorage | null,
): string | null {
  const view = landingView(location, storage);
  return view.kind === 'recovery' ? view.target : null;
}

/** A route `handle` that asks the root layout for the hand-off script. */
export interface SessionHandoffHandle {
  sessionHandoff: true;
}

export function wantsSessionHandoff(handle: unknown): handle is SessionHandoffHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    (handle as Partial<SessionHandoffHandle>).sessionHandoff === true
  );
}

/**
 * The inline <head> script: the same rules as landingView(), in plain ES5. It never throws
 * (storage access can), it does nothing outside `/` (see HANDOFF_PATH), and it replaces the history entry so Back does not bounce the visitor.
 */
export const SESSION_HANDOFF_SCRIPT = [
  '(function(){try{',
  'var w=window,l=w.location,q=l.search,h=l.hash;',
  `if(l.pathname!==${JSON.stringify(HANDOFF_PATH)})return;`,
  'var ',
  `a=${AUTH_HASH_RE.toString()}.test(h)||${AUTH_QUERY_RE.toString()}.test(q)||${AUTH_TYPE_RE.toString()}.test(h+q),s=false;`,
  'try{var t=w.localStorage,v=function(x){return x!==null&&x!==""&&x!=="null"};',
  `s=v(t.getItem(${JSON.stringify(LEGACY_SESSION_KEY)}));`,
  `for(var i=0;!s&&i<t.length;i++){var k=t.key(i);s=k!==null&&${SUPABASE_SESSION_KEY_RE.toString()}.test(k)&&v(t.getItem(k))}`,
  '}catch(e){s=false}',
  `if(${RECOVERY_TYPE_RE.toString()}.test(h+q)){l.replace(${JSON.stringify(RECOVERY_PATH)}+q+h);return}`,
  `if(a||s){w.document.documentElement.setAttribute(${JSON.stringify(ARENA_ATTRIBUTE)},"")}`,
  '}catch(e){}})();',
].join('');
