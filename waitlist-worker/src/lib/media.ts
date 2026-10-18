import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a media query. The server render (and the hydration pass) always sees `false`,
 * then React re-renders with the real value, so the prerendered HTML never mismatches.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

const noop = () => () => {};

/** False during the server render and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
