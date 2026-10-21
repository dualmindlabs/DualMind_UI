import { useCallback, useSyncExternalStore } from 'react';

/**
 * True while the media query matches, followed live. The prerender and hydration use
 * `serverValue`, so only use it for UI that renders after the data loads, that renders only in
 * the browser (the arena), or that only opens on a click (sheet or drawer).
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
