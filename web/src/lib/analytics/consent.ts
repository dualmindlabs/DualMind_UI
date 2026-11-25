/**
 * Consent for privacy-friendly analytics (cycle 2). Analytics is OFF unless ALL of these hold:
 *
 * 1. the build has a Cloudflare Web Analytics token (`VITE_ANALYTICS_TOKEN`, src/config/features.ts);
 * 2. the browser does not say "do not track" (`navigator.doNotTrack` or Global Privacy Control);
 * 3. the visitor said yes in the consent banner (kept in localStorage as `dm.consent.analytics.v1`).
 *
 * Declining, or never answering, means nothing loads and nothing is sent. The choice can be
 * changed any time from the footer ("Analytics choices").
 */

export const CONSENT_KEY = 'dm.consent.analytics.v1';

export type Consent = 'granted' | 'denied';

type ConsentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): ConsentStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The stored choice, or null when the visitor has not answered (or storage is blocked). */
export function readConsent(storage: ConsentStorage | null = browserStorage()): Consent | null {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

/** Stores the choice. False when storage is blocked: the choice then lasts for this page only. */
export function writeConsent(
  value: Consent,
  storage: ConsentStorage | null = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(CONSENT_KEY, value);
    return true;
  } catch {
    return false;
  }
}

type SignalSource = {
  doNotTrack?: string | null;
  msDoNotTrack?: string | null;
  globalPrivacyControl?: boolean;
};

/**
 * True when the browser asks not to be tracked: Do Not Track ("1" or "yes") or Global Privacy
 * Control. Such a visitor is never asked and never counted.
 */
export function trackingBlocked(
  source: SignalSource | undefined = typeof navigator === 'undefined'
    ? undefined
    : (navigator as unknown as SignalSource),
  win: { doNotTrack?: string | null } | undefined = typeof window === 'undefined'
    ? undefined
    : (window as unknown as { doNotTrack?: string | null }),
): boolean {
  const dnt = [source?.doNotTrack, source?.msDoNotTrack, win?.doNotTrack];
  if (dnt.some(value => value === '1' || value === 'yes')) return true;
  return source?.globalPrivacyControl === true;
}

/** Whether the beacon may load and events may be emitted. */
export function analyticsActive(options: {
  token: string | null;
  consent: Consent | null;
  blocked: boolean;
}): boolean {
  return options.token !== null && !options.blocked && options.consent === 'granted';
}

/** Whether the banner should ask: configured, not blocked, and not answered yet. */
export function shouldAskConsent(options: {
  token: string | null;
  consent: Consent | null;
  blocked: boolean;
}): boolean {
  return options.token !== null && !options.blocked && options.consent === null;
}
