import { useCallback, useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

const getServerSnapshot = (): boolean => false;

/**
 * True once the page has scrolled past `threshold` pixels (the header condenses then). Only
 * re-renders when the answer flips, not on every scroll event. Prerendered HTML assumes the top.
 */
export function useScrolled(threshold = 8): boolean {
  const getSnapshot = useCallback(
    () => typeof window !== 'undefined' && window.scrollY > threshold,
    [threshold],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
