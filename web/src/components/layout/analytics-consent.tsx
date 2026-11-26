import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { featureConfig } from '@/config/features';
import { loadBeacon, track, unloadBeacon } from '@/lib/analytics';
import {
  analyticsActive,
  type Consent,
  readConsent,
  shouldAskConsent,
  trackingBlocked,
  writeConsent,
} from '@/lib/analytics/consent';

const CHANGE_EVENT = 'dm:consent-change';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** The stored choice; null on the server and while hydrating, so the first render matches. */
function useConsent(): Consent | null {
  return useSyncExternalStore(
    subscribe,
    () => readConsent(),
    () => null,
  );
}

/** The footer button asks the banner to open again. */
let reopenRequested = false;
const reopenListeners = new Set<() => void>();

function useReopen(): boolean {
  return useSyncExternalStore(
    listener => {
      reopenListeners.add(listener);
      return () => reopenListeners.delete(listener);
    },
    () => reopenRequested,
    () => false,
  );
}

function setReopen(value: boolean): void {
  reopenRequested = value;
  reopenListeners.forEach(listener => listener());
}

/**
 * The analytics consent banner. Renders nothing unless a Cloudflare Web Analytics token is set
 * (`VITE_ANALYTICS_TOKEN`) and the browser does not send Do Not Track or Global Privacy Control.
 * "Accept" loads the cookieless beacon; "No thanks" (or never answering) loads nothing. The
 * choice is kept in this browser and can be changed from the footer.
 */
export function AnalyticsConsent() {
  const token = featureConfig.analyticsToken;
  const consent = useConsent();
  const reopen = useReopen();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only flag; the first render must match the prerendered HTML
  useEffect(() => setMounted(true), []);
  const blocked = mounted && trackingBlocked();

  // Load the beacon (and count the visit) as soon as the stored choice allows it.
  useEffect(() => {
    if (!mounted) return;
    if (analyticsActive({ token, consent, blocked })) {
      loadBeacon(token);
      track('visit');
    } else {
      unloadBeacon();
    }
  }, [mounted, token, consent, blocked]);

  const choose = useCallback((value: Consent) => {
    writeConsent(value);
    setReopen(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  if (!mounted || token === null || blocked) return null;
  if (!shouldAskConsent({ token, consent, blocked }) && !reopen) return null;

  return (
    <section
      aria-labelledby="analytics-consent-title"
      data-testid="analytics-consent"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto grid max-w-xl gap-3 rounded-lg border border-line-strong bg-surface p-4 shadow-lift sm:p-5"
    >
      <h2 id="analytics-consent-title" className="text-ui font-semibold text-fg">
        Count visits without tracking you?
      </h2>
      <p className="text-ui-sm text-fg-soft">
        We would like to measure how many people use the Arena with Cloudflare Web Analytics. It
        sets no cookies, keeps no personal profile and does not follow you across sites. Your
        prompts and answers are never part of it. Read the{' '}
        <a href="/privacy/" className="underline underline-offset-4">
          privacy policy
        </a>
        .
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => choose('granted')}>Accept</Button>
        <Button variant="secondary" onClick={() => choose('denied')}>
          No thanks
        </Button>
      </div>
    </section>
  );
}

/**
 * A footer button that reopens the banner, so the choice can be changed. Renders nothing unless
 * analytics is configured and the browser does not send a do-not-track signal.
 */
export function AnalyticsChoicesButton({ className }: { className?: string }) {
  const [shown, setShown] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only flag; the first render must match the prerendered HTML
  useEffect(() => setShown(featureConfig.analyticsToken !== null && !trackingBlocked()), []);
  if (!shown) return null;
  return (
    <button type="button" className={className} onClick={() => setReopen(true)}>
      Analytics choices
    </button>
  );
}
