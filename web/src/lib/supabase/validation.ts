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
 * A phone number in E.164 (`+919876543210`), or null. Numbers with a `+` keep their country
 * code; ten digits without one are Indian numbers (+91), as the legacy page assumed.
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0')
      ? `+${digits}`
      : null;
  }
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

export function validatePhone(value: string): string | null {
  if (value.trim() === '') return 'Enter your phone number.';
  return normalizePhone(value) === null
    ? 'Enter your number with its country code, for example +91 98765 43210.'
    : null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (confirm === '') return 'Type the password again.';
  return password === confirm ? null : 'The passwords do not match.';
}
