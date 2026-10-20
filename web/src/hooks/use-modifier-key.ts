import { useSyncExternalStore } from 'react';

/** Keyboard shortcuts use Cmd on Apple platforms and Ctrl everywhere else. */
export type ModifierKey = 'Cmd' | 'Ctrl';

const subscribe = (): (() => void) => () => {};

function getSnapshot(): ModifierKey {
  if (typeof navigator === 'undefined') return 'Ctrl';
  const hints = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = hints.userAgentData?.platform ?? navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform) ? 'Cmd' : 'Ctrl';
}

const getServerSnapshot = (): ModifierKey => 'Ctrl';

/**
 * The modifier for shortcuts shown in the UI ("Ctrl K" or "Cmd K"). Prerendered HTML shows Ctrl;
 * Apple devices switch to Cmd right after hydration.
 */
export function useModifierKey(): ModifierKey {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
