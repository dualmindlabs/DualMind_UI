/**
 * What an email link or OAuth return carries, read once from the URL before supabase-js
 * removes the tokens from the address bar (the route's clientLoader takes the snapshot).
 *
 * Supabase puts the result in the #hash with the implicit flow: tokens and `type` on success,
 * `error`, `error_code` and `error_description` on failure (older links put errors in the query).
 */
import { AUTH_CALLBACK_PATH, UPDATE_PASSWORD_PATH } from '@/lib/supabase';

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
