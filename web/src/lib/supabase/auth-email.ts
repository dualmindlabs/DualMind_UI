/**
 * Welcome and sign-in notification emails, through the existing Supabase Edge Function
 * `email-wel-safe` (the contract of the legacy js/resend-auth-email.js, docs/api/endpoints.md
 * section 3.12): `POST <supabase url>/functions/v1/email-wel-safe` with the user's access token
 * as the bearer, body `{ type: 'welcome' | 'login', timezone, userAgent, ...extra }`.
 *
 * - Welcome: once per user per browser tab (sessionStorage
 *   `dualmind.auth.welcome-confirmed:<user id>`, the legacy key), after an email confirmation.
 * - Sign-in notice: after an explicit sign-in, at most once every 30 seconds per browser.
 *
 * `keepalive` lets the request finish while the page navigates on. Failures are swallowed: an
 * email is never a reason to block sign-in.
 */
import type { Session } from '@supabase/supabase-js';

import type { KeyValueStorage } from './storage';

export const AUTH_EMAIL_FUNCTION = 'email-wel-safe';
export const WELCOME_SENT_KEY_PREFIX = 'dualmind.auth.welcome-confirmed:';
export const LOGIN_EMAIL_AT_KEY = 'dm.auth.loginEmailAt';
export const LOGIN_EMAIL_DEBOUNCE_MS = 30_000;

export type AuthEmailType = 'welcome' | 'login';

export interface AuthEmailOptions {
  supabaseUrl: string;
  session: Pick<Session, 'access_token'> & { user: Pick<Session['user'], 'id'> };
  fetch?: typeof fetch;
  /** Extra body fields, e.g. `{ redirectUrl }` for the welcome email. */
  extra?: Record<string, string>;
}

export function authEmailUrl(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1/${AUTH_EMAIL_FUNCTION}`;
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Sends one email request; true when the function answered 2xx. Never throws. */
export async function sendAuthEmail(
  type: AuthEmailType,
  {
    supabaseUrl,
    session,
    fetch: fetcher = globalThis.fetch.bind(globalThis),
    extra = {},
  }: AuthEmailOptions,
): Promise<boolean> {
  try {
    const response = await fetcher(authEmailUrl(supabaseUrl), {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type,
        timezone: timezone(),
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
        ...extra,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** The welcome email after an email confirmation, once per user per tab. */
export async function sendWelcomeOnce(
  options: AuthEmailOptions,
  tabStorage: KeyValueStorage | null,
): Promise<boolean> {
  const key = `${WELCOME_SENT_KEY_PREFIX}${options.session.user.id}`;
  try {
    if (tabStorage?.getItem(key) === '1') return false;
  } catch {
    // Unreadable storage: send, at worst twice.
  }
  const sent = await sendAuthEmail('welcome', options);
  if (sent) {
    try {
      tabStorage?.setItem(key, '1');
    } catch {
      // Ignore.
    }
  }
  return sent;
}

/** The sign-in notice after an explicit sign-in, at most once per 30 seconds. */
export async function sendLoginNotice(
  options: AuthEmailOptions,
  storage: KeyValueStorage | null,
  now: number = Date.now(),
): Promise<boolean> {
  try {
    const last = Number(storage?.getItem(LOGIN_EMAIL_AT_KEY) ?? 0);
    if (Number.isFinite(last) && now - last < LOGIN_EMAIL_DEBOUNCE_MS) return false;
    storage?.setItem(LOGIN_EMAIL_AT_KEY, String(now));
  } catch {
    // Ignore: send anyway.
  }
  return sendAuthEmail('login', options);
}
