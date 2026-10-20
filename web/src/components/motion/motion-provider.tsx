import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

import { transitions } from './presets';

const loadFeatures = () => import('./features-dom-animation').then(module => module.features);

/**
 * Motion for a subtree: `m.*` components (the small Motion build) get their animation features
 * from a lazily loaded chunk, the default transition comes from the tokens, and Motion follows
 * the visitor's reduced-motion setting. Wrap the app (or the part that animates) in it once.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user" transition={transitions.base}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
