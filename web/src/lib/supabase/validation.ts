/**
 * Field checks for the sign-in forms. Each returns an error sentence, or null when the value is
 * fine. They run on submit (and on blur once a field was touched); the server has the last word.
 */

export const OTP_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (email === '') return 'Enter your email address.';
  if (!EMAIL_RE.test(email)) return 'Enter an email address like name@example.com.';
  return null;
}

export function validatePasswordPresent(value: string): string | null {
  return value === '' ? 'Enter your password.' : null;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (name === '') return 'Enter your name.';
  if (name.length > 80) return 'Use 80 characters or fewer.';
  return null;
}

/** The OTP code with spaces removed; only digits count. */
export function normalizeOtp(value: string): string {
  return value.replace(/\s+/g, '');
}

export function validateOtp(value: string): string | null {
  const code = normalizeOtp(value);
  if (code === '') return `Enter the ${OTP_LENGTH}-digit code.`;
  if (!/^\d+$/.test(code)) return 'The code has digits only.';
  if (code.length !== OTP_LENGTH) return `Enter all ${OTP_LENGTH} digits.`;
  return null;
}

/**
 * The country codes a phone sign-in may text. An SMS code costs money in every country and is the
 * target of SMS-pumping fraud, so only the markets served are allowed (cycle 2 audit P0-1). Widen
 * it together with Twilio's geographic permissions, never alone.
 */
export const ALLOWED_PHONE_COUNTRY_CODES: readonly string[] = ['91'];

/**
 * A phone number in E.164 (`+919876543210`), or null. The number must start with `+` and an
 * allowed country code: a bare ten-digit number used to be read as Indian (+91), which sent a
 * visitor's code to a stranger in India. 8 to 15 digits, no leading zero.
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) return null;
  return ALLOWED_PHONE_COUNTRY_CODES.some(code => digits.startsWith(code)) ? `+${digits}` : null;
}

export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return 'Enter your phone number.';
  if (!trimmed.startsWith('+')) {
    return 'Start with the country code, for example +91 98765 43210.';
  }
  return normalizePhone(value) === null
    ? 'Phone sign-in is only available for numbers with the country code +91 for now.'
    : null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (confirm === '') return 'Type the password again.';
  return password === confirm ? null : 'The passwords do not match.';
}
