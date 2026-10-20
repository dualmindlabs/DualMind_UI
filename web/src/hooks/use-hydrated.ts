import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False while the page is prerendered and during hydration, true afterwards. Effects use it to
 * keep the prerendered HTML readable (nothing hidden waiting for JavaScript) and to animate only
 * content that mounts after hydration.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
