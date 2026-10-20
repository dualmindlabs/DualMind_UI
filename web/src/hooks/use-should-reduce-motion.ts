import { createContext, useContext } from 'react';

import { useReducedMotion } from './use-reduced-motion';

/**
 * True inside a subtree that forces reduced motion whatever the OS says. Provided by
 * components/motion/reduced-motion-scope.tsx: the /design/ effects preview today, a settings
 * override later.
 */
export const ForcedReducedMotionContext = createContext(false);

/**
 * True when motion should be reduced: the visitor asks for it (followed live) or the surrounding
 * ReducedMotionScope forces it. Every effect reads this instead of the media query.
 */
export function useShouldReduceMotion(): boolean {
  const system = useReducedMotion();
  const forced = useContext(ForcedReducedMotionContext);
  return system || forced;
}
