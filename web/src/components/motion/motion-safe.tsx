import { Fragment, type ReactNode } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

interface MotionSafeProps {
  children: ReactNode;
  /**
   * The still version, rendered instead of `children` while motion is reduced. Without it the
   * children render either way (they handle reduced motion themselves) and are only remounted.
   */
  still?: ReactNode;
}

/**
 * The reduced-motion gate. Several vendored effects read the setting once, when they mount, so
 * this remounts them whenever it flips (the OS setting changing, or a ReducedMotionScope), and
 * swaps in the still version when there is one.
 */
export function MotionSafe({ children, still }: MotionSafeProps) {
  const reduce = useShouldReduceMotion();
  if (reduce && still !== undefined) return <Fragment key="still">{still}</Fragment>;
  return <Fragment key={reduce ? 'reduced' : 'full'}>{children}</Fragment>;
}
