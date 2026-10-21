import { MotionConfig } from 'motion/react';
import { type ReactNode, useContext } from 'react';

import { useMotionPreference } from '@/hooks/use-motion-preference';
import { ForcedReducedMotionContext } from '@/hooks/use-should-reduce-motion';
import { motionConfigValue } from '@/lib/motion/motion-preference';
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
 * stops them, like the media query does in base.css). An outer scope that forces it wins; when
 * nothing is forced, the page-wide setting applies (the OS, or the override on /settings/).
 */
export function ReducedMotionScope({ reduce, className, children }: ReducedMotionScopeProps) {
  const forced = useContext(ForcedReducedMotionContext) || reduce;
  const { preference } = useMotionPreference();
  return (
    <ForcedReducedMotionContext value={forced}>
      <MotionConfig reducedMotion={forced ? 'always' : motionConfigValue(preference)}>
        <div data-reduced-motion={forced ? 'true' : undefined} className={cn(className)}>
          {children}
        </div>
      </MotionConfig>
    </ForcedReducedMotionContext>
  );
}
