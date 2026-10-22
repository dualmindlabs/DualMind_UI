/**
 * Whether the browser thinks it is online: `navigator.onLine` plus the `online` and `offline`
 * events. Only a hint (a captive portal still reads as online), but a reliable "no network at
 * all", which is what the arena's offline notice and the lazy-chunk retry need.
 */

/** True unless the browser says it is offline (also true when there is no browser). */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** For useSyncExternalStore: calls `onChange` on every online and offline event. */
export function subscribeOnline(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Resolves at the next `online` event, or at once when the browser is online already. */
export function waitForOnline(): Promise<void> {
  if (isOnline() || typeof window === 'undefined') return Promise.resolve();
  return new Promise(resolve => {
    window.addEventListener('online', () => resolve(), { once: true });
  });
}

/** Fired on `window` when a link to another page is blocked because the browser is offline. */
export const OFFLINE_BLOCKED_EVENT = 'dm:offline-blocked';

/**
 * Pages are separate documents, so leaving one while offline would replace the app with the
 * browser's offline page. Where a screen listens for this event (the arena's notice), it
 * cancels the event, and the navigation is not made. Returns true when it was blocked.
 */
export function blockOfflineNavigation(): boolean {
  if (typeof window === 'undefined' || isOnline()) return false;
  const event = new CustomEvent(OFFLINE_BLOCKED_EVENT, { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
