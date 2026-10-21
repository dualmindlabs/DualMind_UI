import { useSyncExternalStore } from 'react';

import {
  type MotionPreference,
  readMotionPreference,
  setMotionPreference,
  subscribeMotionPreference,
} from '@/lib/motion/motion-preference';

const serverSnapshot = (): MotionPreference => 'system';

/**
 * The motion override from /settings/ (`system`, `reduce` or `allow`) and a setter. Prerendered
 * HTML reads "system"; the inline head script has already applied a stored choice to CSS by then
 * (lib/motion/motion-preference.ts).
 */
export function useMotionPreference(): {
  preference: MotionPreference;
  setPreference: (preference: MotionPreference) => void;
} {
  const preference = useSyncExternalStore(
    subscribeMotionPreference,
    readMotionPreference,
    serverSnapshot,
  );
  return { preference, setPreference: setMotionPreference };
}
