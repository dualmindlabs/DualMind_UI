/**
 * Waitlist signups.
 *
 * Production has no signup backend today. Exactly like the page this replaces, a valid email is
 * trimmed, lower-cased and saved in this browser's localStorage under `dualmind_waitlist` (a JSON
 * array of emails) after a short pause, and an email already in that list is reported as a
 * duplicate. Nothing is sent anywhere.
 *
 * Building with VITE_WAITLIST_ENDPOINT set switches to a real endpoint instead:
 *   POST <endpoint>  { "email": "<lower-cased>", "ref": "<ref, when present>" }
 *   2xx = joined, 409 = already on the list, anything else (or no response) = error.
 * The production build leaves it unset. CI sets it, with a mocked endpoint, to test those states.
 */

export const STORAGE_KEY = 'dualmind_waitlist';
const LOCAL_DELAY_MS = 900;
const REQUEST_TIMEOUT_MS = 10_000;

const endpoint = (import.meta.env.VITE_WAITLIST_ENDPOINT ?? '').trim();

export type JoinOutcome = 'joined' | 'duplicate' | 'error';

export function joinWaitlist(email: string, ref: string | null): Promise<JoinOutcome> {
  const normalised = email.trim().toLowerCase();
  return endpoint ? joinRemote(normalised, ref) : joinLocal(normalised);
}

async function joinLocal(email: string): Promise<JoinOutcome> {
  let saved: unknown;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return 'error';
  }
  // Never overwrite a list this code didn't write.
  if (!Array.isArray(saved)) return 'error';
  if (saved.includes(email)) return 'duplicate';

  await new Promise(resolve => setTimeout(resolve, LOCAL_DELAY_MS));
  try {
    saved.push(email);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return 'joined';
  } catch {
    return 'error';
  }
}

async function joinRemote(email: string, ref: string | null): Promise<JoinOutcome> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(ref ? { email, ref } : { email }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 409) return 'duplicate';
    return response.ok ? 'joined' : 'error';
  } catch {
    return 'error';
  }
}
