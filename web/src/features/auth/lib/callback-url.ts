/**
 * What an email link or OAuth return carries, read once from the URL before supabase-js
 * removes the tokens from the address bar (the route's clientLoader takes the snapshot).
 *
 * Supabase puts the result in the #hash with the implicit flow: tokens and `type` on success,
 * `error`, `error_code` and `error_description` on failure (older links put errors in the query).
 */
import { AUTH_CALLBACK_PATH, RECOVERY_MARK_KEY, UPDATE_PASSWORD_PATH } from '@/lib/supabase';

export type CallbackType =
  'signup' | 'email_confirmation' | 'recovery' | 'magiclink' | 'invite' | 'email_change' | 'other';

export interface CallbackUrl {
  type: CallbackType | null;
  hasTokens: boolean;
  /** A PKCE `?code=`: this app uses the implicit flow, so it cannot be exchanged here. */
  hasCode: boolean;
  error: { code: string; description: string } | null;
  /** `?welcome=1` asks for the welcome email (legacy contract). */
  welcome: boolean;
  /** The validated-later `?redirect=` value, raw. */
  redirect: string | null;
}

const KNOWN_TYPES = new Set<string>([
  'signup',
  'email_confirmation',
  'recovery',
  'magiclink',
  'invite',
  'email_change',
]);

export function readCallbackUrl({ search, hash }: Pick<Location, 'search' | 'hash'>): CallbackUrl {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const get = (key: string) => fragment.get(key) ?? query.get(key);
  const rawType = get('type');
  const errorCode = get('error_code') ?? get('error');
  return {
    type: rawType === null ? null : KNOWN_TYPES.has(rawType) ? (rawType as CallbackType) : 'other',
    hasTokens: fragment.has('access_token') && fragment.has('refresh_token'),
    hasCode: query.has('code'),
    error: errorCode ? { code: errorCode, description: get('error_description') ?? '' } : null,
    welcome: query.get('welcome') === '1',
    redirect: query.get('redirect'),
  };
}

/**
 * A recovery link that landed on the callback page belongs on the update-password page: the
 * target keeps the query and the hash (with the tokens), so that page can use them. Null for
 * every other URL.
 */
export function recoveryForward(location: Pick<Location, 'pathname' | 'search' | 'hash'>) {
  if (location.pathname !== AUTH_CALLBACK_PATH) return null;
  return readCallbackUrl(location).type === 'recovery'
    ? `${UPDATE_PASSWORD_PATH}${location.search}${location.hash}`
    : null;
}

/** Whether the confirmation deserves the welcome email (legacy rule). */
export function wantsWelcome(callback: CallbackUrl): boolean {
  return callback.welcome || callback.type === 'signup' || callback.type === 'email_confirmation';
}

/** Plain-language text for an error in a link. */
export function callbackErrorMessage(error: CallbackUrl['error']): string {
  if (!error) return 'This link did not sign you in. Ask for a new one and try again.';
  if (/expired/i.test(error.code) || /expired/i.test(error.description)) {
    return 'This link has expired or was already used. Links work once and for a limited time.';
  }
  if (error.code === 'access_denied') {
    return 'Sign-in was canceled or not allowed. You can try again.';
  }
  return 'This link did not work. Ask for a new one and try again.';
}

/** Tab-scoped marker: this tab saw a real `PASSWORD_RECOVERY` event, less than an hour ago. */
export { RECOVERY_MARK_KEY };

/** How long the marker holds: as long as the email link does. */
export const RECOVERY_MARK_TTL_MS = 60 * 60 * 1000;

/**
 * Whether the tab marker is a fresh one. The marker is `{"savedAt": <ms>}`; anything else (the
 * old bare "1", broken JSON, a time in the future, older than the link's hour) is not proof.
 * Proof of a reset link is only ever the `PASSWORD_RECOVERY` event, which supabase-js emits after
 * it has checked the tokens and saved the recovery session. The URL says nothing: `type=recovery`
 * and two made-up tokens in the hash can be typed by anyone, and supabase-js keeps the existing
 * session when the URL login fails.
 */
export function readRecoveryMark(
  storage: Pick<Storage, 'getItem'> | null,
  now: number = Date.now(),
): boolean {
  try {
    const raw = storage?.getItem(RECOVERY_MARK_KEY);
    if (!raw) return false;
    const savedAt = (JSON.parse(raw) as { savedAt?: unknown } | null)?.savedAt;
    return typeof savedAt === 'number' && savedAt <= now && now - savedAt < RECOVERY_MARK_TTL_MS;
  } catch {
    return false;
  }
}

export function writeRecoveryMark(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null,
  on: boolean,
  now: number = Date.now(),
) {
  try {
    if (on) storage?.setItem(RECOVERY_MARK_KEY, JSON.stringify({ savedAt: now }));
    else storage?.removeItem(RECOVERY_MARK_KEY);
  } catch {
    // Private mode: a reload then needs a new link, as before.
  }
}
