/**
 * Password rules for sign-up and password reset (the legacy js/auth-modern.js rules) and the
 * breach check.
 *
 * The breach check uses the Pwned Passwords range API with k-anonymity: the password is hashed
 * with SHA-1 in the browser and only the first five characters of the hash are sent; the API
 * answers with every suffix it knows for that prefix (padded with fake rows, `Add-Padding`), and
 * the match happens here. The password never leaves the browser.
 */

export const PASSWORD_MIN_LENGTH = 10;

export interface PasswordChecks {
  minLength: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
}

export type PasswordStrength = 'empty' | 'too-weak' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordEvaluation {
  checks: PasswordChecks;
  /** Checks passed, 0 to 5. */
  score: number;
  strength: PasswordStrength;
  /** All five checks pass: the password may be used. */
  ok: boolean;
}

/** The checklist shown under the field, in order. */
export const PASSWORD_RULES: ReadonlyArray<{ key: keyof PasswordChecks; label: string }> = [
  { key: 'minLength', label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { key: 'upper', label: 'An uppercase letter' },
  { key: 'lower', label: 'A lowercase letter' },
  { key: 'number', label: 'A number' },
  { key: 'symbol', label: 'A symbol, such as ! or #' },
];

export const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  empty: 'Not set',
  'too-weak': 'Too weak',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

export function evaluatePassword(value: string): PasswordEvaluation {
  const checks: PasswordChecks = {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const strength: PasswordStrength =
    value === ''
      ? 'empty'
      : score >= 5
        ? 'strong'
        : score === 4
          ? 'good'
          : score === 3
            ? 'fair'
            : score === 2
              ? 'weak'
              : 'too-weak';
  return { checks, score, strength, ok: score === 5 };
}

export type BreachResult =
  { status: 'clean' } | { status: 'pwned'; count: number } | { status: 'unavailable' };

export const PWNED_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

/** Upper-case hex SHA-1 of the text (Web Crypto). */
export async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** How often `suffix` appears in a range response (`SUFFIX:COUNT` lines), 0 when it does not. */
export function countInRange(body: string, suffix: string): number {
  for (const line of body.split(/\r?\n/)) {
    const [lineSuffix, count] = line.trim().split(':');
    if (lineSuffix?.toUpperCase() === suffix) return Number.parseInt(count ?? '0', 10) || 0;
  }
  return 0;
}

/**
 * Looks the password up in known breaches without sending it. `unavailable` when the service
 * cannot be reached: sign-up then continues (the check is advice, as it was before).
 */
export async function checkPwnedPassword(
  password: string,
  options: { fetch?: typeof fetch; signal?: AbortSignal } = {},
): Promise<BreachResult> {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  try {
    const hash = await sha1Hex(password);
    const response = await fetcher(`${PWNED_RANGE_URL}${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true' },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) return { status: 'unavailable' };
    const count = countInRange(await response.text(), hash.slice(5));
    return count > 0 ? { status: 'pwned', count } : { status: 'clean' };
  } catch {
    return { status: 'unavailable' };
  }
}
