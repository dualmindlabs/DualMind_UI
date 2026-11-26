import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  analyticsEnabled,
  BEACON_SRC,
  FUNNEL_EVENT,
  loadBeacon,
  track,
  unloadBeacon,
} from '@/lib/analytics';
import {
  analyticsActive,
  CONSENT_KEY,
  readConsent,
  shouldAskConsent,
  trackingBlocked,
  writeConsent,
} from '@/lib/analytics/consent';

// Cycle 2: privacy-friendly analytics runs only with a token, no Do Not Track signal, and consent.

const TOKEN = '0123456789abcdef0123456789abcdef';

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

afterEach(() => {
  unloadBeacon();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('consent storage', () => {
  it('reads only a clear answer', () => {
    const storage = memory();
    expect(readConsent(storage)).toBeNull();
    storage.data.set(CONSENT_KEY, 'granted');
    expect(readConsent(storage)).toBe('granted');
    storage.data.set(CONSENT_KEY, 'maybe');
    expect(readConsent(storage)).toBeNull();
    expect(readConsent(null)).toBeNull();
  });

  it('writes the answer, and survives blocked storage', () => {
    const storage = memory();
    expect(writeConsent('denied', storage)).toBe(true);
    expect(storage.data.get(CONSENT_KEY)).toBe('denied');
    expect(writeConsent('granted', null)).toBe(false);
    const full = {
      ...storage,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(writeConsent('granted', full)).toBe(false);
  });
});

describe('trackingBlocked', () => {
  it('honours Do Not Track and Global Privacy Control', () => {
    expect(trackingBlocked({ doNotTrack: '1' }, undefined)).toBe(true);
    expect(trackingBlocked({ doNotTrack: 'yes' }, undefined)).toBe(true);
    expect(trackingBlocked({ msDoNotTrack: '1' }, undefined)).toBe(true);
    expect(trackingBlocked({}, { doNotTrack: '1' })).toBe(true);
    expect(trackingBlocked({ globalPrivacyControl: true }, undefined)).toBe(true);
  });

  it('is false without a signal', () => {
    expect(trackingBlocked({ doNotTrack: '0' }, undefined)).toBe(false);
    expect(
      trackingBlocked({ doNotTrack: null, globalPrivacyControl: false }, { doNotTrack: null }),
    ).toBe(false);
    expect(trackingBlocked({}, undefined)).toBe(false);
  });
});

describe('when analytics may run', () => {
  const base = { token: TOKEN, consent: 'granted' as const, blocked: false };

  it('needs a token, consent and no do-not-track signal', () => {
    expect(analyticsActive(base)).toBe(true);
    expect(analyticsActive({ ...base, token: null })).toBe(false);
    expect(analyticsActive({ ...base, consent: 'denied' })).toBe(false);
    expect(analyticsActive({ ...base, consent: null })).toBe(false);
    expect(analyticsActive({ ...base, blocked: true })).toBe(false);
  });

  it('asks only when configured, not blocked and not answered', () => {
    expect(shouldAskConsent({ token: TOKEN, consent: null, blocked: false })).toBe(true);
    expect(shouldAskConsent({ token: null, consent: null, blocked: false })).toBe(false);
    expect(shouldAskConsent({ token: TOKEN, consent: null, blocked: true })).toBe(false);
    expect(shouldAskConsent({ token: TOKEN, consent: 'denied', blocked: false })).toBe(false);
  });

  it('is off in a default build (no token), whatever the stored choice', () => {
    expect(analyticsEnabled('granted')).toBe(false);
  });
});

describe('the beacon', () => {
  it('is not added without a token', () => {
    expect(loadBeacon(null)).toBe(false);
    expect(document.querySelector('script[data-dm-analytics]')).toBeNull();
  });

  it('is added once, from Cloudflare, with the token and no cookies', () => {
    expect(loadBeacon(TOKEN)).toBe(true);
    expect(loadBeacon(TOKEN)).toBe(true);
    const scripts = document.querySelectorAll('script[data-dm-analytics]');
    expect(scripts).toHaveLength(1);
    const script = scripts[0] as HTMLScriptElement;
    expect(script.src).toBe(BEACON_SRC);
    expect(JSON.parse(script.getAttribute('data-cf-beacon') ?? '{}')).toEqual({
      token: TOKEN,
      spa: true,
    });
    unloadBeacon();
    expect(document.querySelector('script[data-dm-analytics]')).toBeNull();
  });
});

describe('funnel events', () => {
  it('emit nothing while analytics is off', () => {
    const seen = vi.fn();
    window.addEventListener(FUNNEL_EVENT, seen);
    expect(track('vote', false)).toBe(false);
    window.removeEventListener(FUNNEL_EVENT, seen);
    expect(seen).not.toHaveBeenCalled();
  });

  it('emit once per kind and tab session, carrying only the name', () => {
    const seen = vi.fn();
    window.addEventListener(FUNNEL_EVENT, seen);
    expect(track('first_battle', true)).toBe(true);
    expect(track('first_battle', true)).toBe(false);
    expect(track('vote', true)).toBe(true);
    window.removeEventListener(FUNNEL_EVENT, seen);
    expect(seen).toHaveBeenCalledTimes(2);
    expect((seen.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ name: 'first_battle' });
  });
});
