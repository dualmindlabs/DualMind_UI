/**
 * The signed-in hand-off, while the arena is still the legacy app (docs/redesign/migration-plan.md
 * section 3.3; removed by the arena slice S8, which renders the signed-in arena at `/` itself).
 *
 * `/` is the prerendered landing page. The working arena is the legacy app, served from the same
 * dist/ as /legacy-app.html (build.js). A visitor who is signed in, or who arrives with Supabase
 * auth parameters in the URL (an OAuth or magic-link return, a recovery link), is sent there before
 * the first paint, with the query string and the hash kept, so the legacy Supabase client can
 * finish the sign-in it started.
 *
 * SESSION_HANDOFF_SCRIPT runs inline in the landing page's <head> (the Content-Security-Policy
 * allows it by its sha256, computed by build.js). It is built from the same regular expressions
 * as the functions below, and the unit tests run it against the same cases, so the two cannot
 * drift apart.
 */

/** Where the legacy arena lives during the migration (a copy of the legacy index.html). */
export const LEGACY_APP_PATH = '/legacy-app.html';

/** The legacy app's Supabase session (js/auth/supabase-auth.js, `storageKey`). */
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

/** True when the URL carries Supabase auth parameters that the legacy app must handle. */
export function hasAuthParams(search: string, hash: string): boolean {
  return AUTH_HASH_RE.test(hash) || AUTH_QUERY_RE.test(search) || AUTH_TYPE_RE.test(hash + search);
}

/** The legacy app's URL with the visitor's query string and hash. */
export function handoffTarget(search: string, hash: string): string {
  return `${LEGACY_APP_PATH}${search}${hash}`;
}

/**
 * Where to send the visitor, or null to stay on the landing page. Storage that cannot be read
 * (blocked cookies, private mode) counts as signed out.
 */
export function handoffDestination(
  location: Pick<Location, 'search' | 'hash'>,
  storage: SessionStorage | null,
): string | null {
  let signedIn = false;
  try {
    signedIn = storage !== null && hasStoredSession(storage);
  } catch {
    signedIn = false;
  }
  return signedIn || hasAuthParams(location.search, location.hash)
    ? handoffTarget(location.search, location.hash)
    : null;
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
 * The inline <head> script: the same rules as handoffDestination(), in plain ES5. It never throws
 * (storage access can), and it replaces the history entry so Back does not bounce the visitor.
 */
export const SESSION_HANDOFF_SCRIPT = [
  '(function(){try{',
  'var l=window.location,q=l.search,h=l.hash,',
  `a=${AUTH_HASH_RE.toString()}.test(h)||${AUTH_QUERY_RE.toString()}.test(q)||${AUTH_TYPE_RE.toString()}.test(h+q),`,
  's=false;',
  'try{var t=window.localStorage,v=function(x){return x!==null&&x!==""&&x!=="null"};',
  `s=v(t.getItem(${JSON.stringify(LEGACY_SESSION_KEY)}));`,
  `for(var i=0;!s&&i<t.length;i++){var k=t.key(i);s=k!==null&&${SUPABASE_SESSION_KEY_RE.toString()}.test(k)&&v(t.getItem(k))}`,
  '}catch(e){s=false}',
  `if(a||s){l.replace(${JSON.stringify(LEGACY_APP_PATH)}+q+h)}`,
  '}catch(e){}})();',
].join('');
