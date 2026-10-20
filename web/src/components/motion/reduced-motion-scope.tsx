import { MotionConfig } from 'motion/react';
import { type ReactNode, useContext } from 'react';

import { ForcedReducedMotionContext } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

interface ReducedMotionScopeProps {
  /** Force reduced motion for everything inside, whatever the OS setting. */
  reduce: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Forces reduced motion for a subtree: effects read it through useShouldReduceMotion(), Motion
 * through MotionConfig, and CSS animations through `data-reduced-motion` (styles/effects.css
 * stops them, like the media query does in base.css). An outer scope that forces it wins.
 */
export function ReducedMotionScope({ reduce, className, children }: ReducedMotionScopeProps) {
  const forced = useContext(ForcedReducedMotionContext) || reduce;
  return (
    <ForcedReducedMotionContext value={forced}>
      <MotionConfig reducedMotion={forced ? 'always' : 'user'}>
        <div data-reduced-motion={forced ? 'true' : undefined} className={cn(className)}>
          {children}
        </div>
      </MotionConfig>
    </ForcedReducedMotionContext>
  );
}
