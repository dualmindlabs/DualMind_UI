/**
 * Plain-language messages for Supabase Auth errors. Supabase sends a stable `code` on newer
 * errors and only a message on older ones, so both are read (the message rules come from the
 * legacy js/auth/supabase-auth.js `_parseError`). Unknown errors get a generic line; the raw
 * message never reaches the page.
 */

export const GENERIC_AUTH_ERROR = 'Something went wrong. Please try again.';
export const NETWORK_AUTH_ERROR =
  'We could not reach the sign-in service. Check your connection and try again.';

const MESSAGES = {
  invalidCredentials: 'That email and password do not match. Check them and try again.',
  emailNotConfirmed: 'Confirm your email first: open the link we sent you, then sign in.',
  accountExists: 'An account with this email already exists. Sign in instead.',
  weakPassword: 'Choose a stronger password: longer, with a mix of letters, numbers and symbols.',
  invalidEmail: 'Enter a valid email address.',
  invalidPhone: 'Enter your phone number with its country code, for example +91 98765 43210.',
  expired: 'That code or link has expired. Ask for a new one.',
  wrongCode: 'That code is not right. Check it and try again.',
  rateLimited: 'Too many attempts. Wait a few minutes, then try again.',
  sessionEnded: 'Your session has ended. Sign in again.',
} as const;

const BY_CODE: Readonly<Record<string, string>> = {
  invalid_credentials: MESSAGES.invalidCredentials,
  email_not_confirmed: MESSAGES.emailNotConfirmed,
  phone_not_confirmed: 'Confirm your phone number first with the code we sent you.',
  user_already_exists: MESSAGES.accountExists,
  email_exists: MESSAGES.accountExists,
  phone_exists: 'An account with this phone number already exists. Sign in instead.',
  weak_password: MESSAGES.weakPassword,
  same_password: 'Your new password must be different from the old one.',
  otp_expired: MESSAGES.expired,
  otp_disabled: 'Sign-in with a code is turned off right now. Use your password instead.',
  over_email_send_rate_limit: 'Too many emails were sent. Wait a minute, then try again.',
  over_sms_send_rate_limit: 'Too many codes were sent. Wait a minute, then try again.',
  over_request_rate_limit: MESSAGES.rateLimited,
  signup_disabled: 'New sign-ups are closed right now.',
  email_address_invalid: MESSAGES.invalidEmail,
  email_address_not_authorized: 'This email address cannot receive sign-in emails yet.',
  validation_failed: 'Check the details you entered and try again.',
  sms_send_failed: 'We could not send a text message to that number. Check it and try again.',
  session_not_found: MESSAGES.sessionEnded,
  session_expired: MESSAGES.sessionEnded,
  user_not_found: 'We could not find that account.',
  provider_disabled: 'This sign-in option is turned off right now.',
  access_denied: 'Sign-in was cancelled or not allowed.',
  reauthentication_needed: 'For your security, sign in again before changing your password.',
};

const BY_MESSAGE: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid login credentials/i, MESSAGES.invalidCredentials],
  [/email not confirmed/i, MESSAGES.emailNotConfirmed],
  [/already registered|already exists/i, MESSAGES.accountExists],
  [/password should be at least|weak password/i, MESSAGES.weakPassword],
  [/invalid email|unable to validate email/i, MESSAGES.invalidEmail],
  [/invalid phone/i, MESSAGES.invalidPhone],
  [/token has expired|expired/i, MESSAGES.expired],
  [/invalid token|token.*invalid|otp.*invalid/i, MESSAGES.wrongCode],
  [/rate limit|too many/i, MESSAGES.rateLimited],
  [/failed to fetch|network|load failed/i, NETWORK_AUTH_ERROR],
];

function field(error: unknown, key: string): unknown {
  return typeof error === 'object' && error !== null
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

/** A sentence for the page, from any Supabase Auth error (or anything thrown around it). */
export function authErrorMessage(error: unknown): string {
  const code = field(error, 'code');
  const byCode = typeof code === 'string' ? BY_CODE[code] : undefined;
  if (byCode) return byCode;
  if (field(error, 'status') === 429) return MESSAGES.rateLimited;
  const name = field(error, 'name');
  if (name === 'AuthRetryableFetchError' || error instanceof TypeError) return NETWORK_AUTH_ERROR;
  const message = field(error, 'message');
  if (typeof message === 'string') {
    for (const [pattern, text] of BY_MESSAGE) {
      if (pattern.test(message)) return text;
    }
  }
  return GENERIC_AUTH_ERROR;
}
