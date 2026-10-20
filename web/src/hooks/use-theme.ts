import { useSyncExternalStore } from 'react';

import {
  readThemePreference,
  setThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from '@/lib/theme/theme';

const serverSnapshot = (): ThemePreference => 'system';

/**
 * The stored theme preference and a setter. Prerendered HTML has no localStorage, so the server
 * snapshot is "system"; React swaps in the stored value right after hydration. Page colours never
 * wait for this hook: the inline theme script (components/layout/theme-script.tsx) applied them
 * before the first paint.
 */
export function useTheme(): {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
} {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    serverSnapshot,
  );
  return { preference, setPreference: setThemePreference };
}
