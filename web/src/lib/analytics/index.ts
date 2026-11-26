/**
 * Privacy-friendly analytics: the Cloudflare Web Analytics beacon, and a small set of funnel
 * events. Cookieless, no personal data, no cross-site tracking, no fingerprinting. It loads only
 * when `analyticsActive()` (a token is set, the browser sends no Do Not Track or Global Privacy
 * Control signal, and the visitor agreed: see ./consent.ts). Otherwise this module does nothing.
 *
 * The funnel events (visit, first battle, vote, signup, share) are emitted as a `dm:funnel`
 * window event, once per kind and tab session, and never carry a prompt, an answer, an id or an
 * email. Cloudflare Web Analytics itself has no custom events (it counts page views), so a sink
 * for them is a separate decision; until one is added they only exist as these events.
 */
import { featureConfig } from '@/config/features';

import { analyticsActive, type Consent, readConsent, trackingBlocked } from './consent';

export const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';
export const FUNNEL_EVENT = 'dm:funnel';
export const FUNNEL_NAMES = ['visit', 'first_battle', 'vote', 'signup', 'share'] as const;
export type FunnelName = (typeof FUNNEL_NAMES)[number];

const SEEN_PREFIX = 'dm.funnel.';
const BEACON_ATTRIBUTE = 'data-dm-analytics';

/** True when analytics may run right now (reads the stored choice). */
export function analyticsEnabled(
  consent: Consent | null = readConsent(),
  token: string | null = featureConfig.analyticsToken,
): boolean {
  return analyticsActive({ token, consent, blocked: trackingBlocked() });
}

/** Adds the beacon once. Does nothing without a token or on the server. */
export function loadBeacon(token: string | null = featureConfig.analyticsToken): boolean {
  if (typeof document === 'undefined' || token === null) return false;
  if (document.querySelector(`script[${BEACON_ATTRIBUTE}]`)) return true;
  const script = document.createElement('script');
  script.defer = true;
  script.src = BEACON_SRC;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token, spa: true }));
  script.setAttribute(BEACON_ATTRIBUTE, '');
  document.head.append(script);
  return true;
}

/** Removes the beacon element (a loaded script keeps running until the next page load). */
export function unloadBeacon(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`script[${BEACON_ATTRIBUTE}]`).forEach(element => element.remove());
}

function sessionStore(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Emits one funnel event, at most once per kind in this tab session. No-op unless analytics is
 * enabled. Never throws.
 */
export function track(name: FunnelName, enabled: boolean = analyticsEnabled()): boolean {
  if (!enabled || typeof window === 'undefined') return false;
  try {
    const store = sessionStore();
    const key = `${SEEN_PREFIX}${name}`;
    if (store?.getItem(key) === '1') return false;
    store?.setItem(key, '1');
    window.dispatchEvent(new CustomEvent(FUNNEL_EVENT, { detail: { name } }));
    return true;
  } catch {
    return false;
  }
}
