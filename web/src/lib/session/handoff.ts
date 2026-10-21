/**
 * The landing page's signed-in switch (docs/redesign/migration-plan.md section 3.3).
 *
 * `/` is the prerendered landing page. The working arena is still the legacy app, served from the
 * same dist/ as /legacy-app.html (build.js), while the new arena (slice S8, in
 * src/features/arena/) renders at `/` itself for visitors who opted in:
 *
 * - `?arena=new` on `/` (or `localStorage['dm.arena'] = 'new'`) opts in; `?arena=legacy` opts
 *   out again. The query parameter stores the choice, so it sticks for later visits.
 * - A signed-in visitor who opted in stays on `/`: the script marks <html data-arena> before the
 *   first paint, CSS hides the landing page and shows the arena's loading frame, and the app
 *   renders the arena once the session is confirmed (src/app/routes/home.tsx).
 * - Every other signed-in visitor, and every visit with Supabase auth parameters in the URL (an
 *   OAuth or magic-link return, a recovery link), is sent to the legacy arena before the first
 *   paint, with the query string and the hash kept, so the legacy Supabase client can finish the
 *   sign-in it started.
 *
 * SESSION_HANDOFF_SCRIPT runs inline in the landing page's <head> (the Content-Security-Policy
 * allows it by its sha256, computed by build.js). It is built from the same regular expressions
 * and constants as the functions below, and the unit tests run it against the same cases, so the
 * two cannot drift apart.
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

/** Where the visitor's arena choice is stored: `new` or `legacy`. */
export const ARENA_CHOICE_KEY = 'dm.arena';

export type ArenaChoice = 'new' | 'legacy';

/** `?arena=new` or `?arena=legacy` on `/`: stores the choice. */
export const ARENA_PARAM_RE = /[?&]arena=(new|legacy)(?:&|$)/;

/**
 * Set on <html> by the inline script when the signed-in arena renders at `/`: CSS then hides the
 * landing page and shows the arena's loading frame until the app takes over.
 */
export const ARENA_ATTRIBUTE = 'data-arena';

/**
 * Whether signed-in visitors get the new arena without opting in. Off while the battle flow is
 * being built (slice S8): `?arena=new` opts in. Slice S9 turns it on and keeps `?arena=legacy`
 * as the way back for one release.
 */
export const NEW_ARENA_BY_DEFAULT = false;

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
 * The hand-off only ever runs on the landing page itself. React Router's SPA fallback page is
 * rendered from the `/` route too, so the script also ends up in the HTML of client-only routes
 * such as /auth-callback.html, where Supabase tokens in the URL must stay with the web app.
 */
export const HANDOFF_PATH = '/';

/** The choice in the URL (`?arena=`), or null. */
export function arenaChoiceFromSearch(search: string): ArenaChoice | null {
  const match = ARENA_PARAM_RE.exec(search);
  return match ? (match[1] as ArenaChoice) : null;
}

/** The visitor's choice: the URL first, then storage. Unreadable storage counts as no choice. */
export function readArenaChoice(
  search: string,
  storage: Pick<Storage, 'getItem'> | null,
): ArenaChoice | null {
  const fromUrl = arenaChoiceFromSearch(search);
  if (fromUrl) return fromUrl;
  try {
    const stored = storage?.getItem(ARENA_CHOICE_KEY) ?? null;
    return stored === 'new' || stored === 'legacy' ? stored : null;
  } catch {
    return null;
  }
}

/** True when this choice gets the new arena (see NEW_ARENA_BY_DEFAULT). */
export function usesNewArena(choice: ArenaChoice | null): boolean {
  return NEW_ARENA_BY_DEFAULT ? choice !== 'legacy' : choice === 'new';
}

/** What `/` shows: the landing page, the new arena, or a hand-off to the legacy arena. */
export type LandingView = { kind: 'landing' } | { kind: 'arena' } | { kind: 'legacy'; target: string };

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
  const target = handoffTarget(location.search, location.hash);
  if (hasAuthParams(location.search, location.hash)) return { kind: 'legacy', target };
  if (!signedIn) return { kind: 'landing' };
  return usesNewArena(readArenaChoice(location.search, storage))
    ? { kind: 'arena' }
    : { kind: 'legacy', target };
}

/**
 * Where to send the visitor, or null to stay on `/` (the landing page or the new arena).
 */
export function handoffDestination(
  location: Pick<Location, 'search' | 'hash'> & { pathname?: string },
  storage: SessionStorage | null,
): string | null {
  const view = landingView(location, storage);
  return view.kind === 'legacy' ? view.target : null;
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
 * (storage access can), it does nothing outside `/` (see HANDOFF_PATH), it stores an `?arena=`
 * choice, and it replaces the history entry so Back does not bounce the visitor.
 */
export const SESSION_HANDOFF_SCRIPT = [
  '(function(){try{',
  'var w=window,l=w.location,q=l.search,h=l.hash;',
  `if(l.pathname!==${JSON.stringify(HANDOFF_PATH)})return;`,
  'var ',
  `a=${AUTH_HASH_RE.toString()}.test(h)||${AUTH_QUERY_RE.toString()}.test(q)||${AUTH_TYPE_RE.toString()}.test(h+q),`,
  `m=${ARENA_PARAM_RE.toString()}.exec(q),c=m?m[1]:null,s=false;`,
  'try{var t=w.localStorage,v=function(x){return x!==null&&x!==""&&x!=="null"};',
  `if(c){t.setItem(${JSON.stringify(ARENA_CHOICE_KEY)},c)}else{c=t.getItem(${JSON.stringify(ARENA_CHOICE_KEY)})}`,
  `s=v(t.getItem(${JSON.stringify(LEGACY_SESSION_KEY)}));`,
  `for(var i=0;!s&&i<t.length;i++){var k=t.key(i);s=k!==null&&${SUPABASE_SESSION_KEY_RE.toString()}.test(k)&&v(t.getItem(k))}`,
  '}catch(e){s=false}',
  `var n=${NEW_ARENA_BY_DEFAULT ? 'c!=="legacy"' : 'c==="new"'};`,
  `if(a||(s&&!n)){l.replace(${JSON.stringify(LEGACY_APP_PATH)}+q+h);return}`,
  `if(s){w.document.documentElement.setAttribute(${JSON.stringify(ARENA_ATTRIBUTE)},"")}`,
  '}catch(e){}})();',
].join('');
