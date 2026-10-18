/**
 * Waitlist signups.
 *
 * The form posts to the waitlist Worker's own endpoint, on the same origin (server/signup.js),
 * which stores the email in Cloudflare D1:
 *   POST /api/signup  { "email": "<lower-cased>", "ref": "<ref, when present>" }
 *   201 { "status": "created" } = joined, 200 { "status": "exists" } = already on the list,
 *   400 = invalid email, 429 = too many tries, anything else (or no answer in 10 s) = error.
 *
 * localStorage only remembers the last email that joined from this browser (DEVICE_KEY), to greet a
 * returning visitor. It is never treated as a signup: the server decides.
 *
 * LEGACY_KEY is where the previous page kept its "signups". That page had no backend, so those
 * emails never reached the team; the form offers to send them for real.
 */

export const SIGNUP_ENDPOINT = '/api/signup';
export const DEVICE_KEY = 'dualmind_waitlist_joined';
export const LEGACY_KEY = 'dualmind_waitlist';
/** Name of the hidden honeypot field. People leave it empty; bots that fill it are ignored. */
export const HONEYPOT_FIELD = 'website';
const REQUEST_TIMEOUT_MS = 10_000;

export type JoinOutcome = 'joined' | 'duplicate' | 'invalid' | 'rate_limited' | 'error';

export async function joinWaitlist(email: string, ref: string | null, honeypot = ''): Promise<JoinOutcome> {
  const normalised = email.trim().toLowerCase();
  const payload: Record<string, string> = { email: normalised };
  if (ref) payload.ref = ref;
  if (honeypot) payload[HONEYPOT_FIELD] = honeypot;

  let response: Response;
  try {
    response = await fetch(SIGNUP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return 'error';
  }
  if (response.status === 400) return 'invalid';
  if (response.status === 429) return 'rate_limited';
  if (!response.ok) return 'error';

  let status: unknown;
  try {
    status = ((await response.json()) as { status?: unknown } | null)?.status;
  } catch {
    return 'error';
  }
  if (status !== 'created' && status !== 'exists') return 'error';
  remember(normalised);
  return status === 'created' ? 'joined' : 'duplicate';
}

export type DeviceNote = { kind: 'joined'; email: string } | { kind: 'legacy'; email: string };

/** What this browser remembers: an email that joined from here, or one the old page kept locally. */
export function readDeviceNote(): DeviceNote | null {
  try {
    const joined = localStorage.getItem(DEVICE_KEY);
    if (joined && joined.includes('@')) return { kind: 'joined', email: joined };
    const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    if (Array.isArray(legacy)) {
      const last = legacy.filter((item): item is string => typeof item === 'string' && item.includes('@')).pop();
      if (last) return { kind: 'legacy', email: last };
    }
  } catch {
    // Storage blocked or unreadable: no note.
  }
  return null;
}

function remember(email: string) {
  try {
    localStorage.setItem(DEVICE_KEY, email);
  } catch {
    // Storage blocked: the signup itself still counts.
  }
}
