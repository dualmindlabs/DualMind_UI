import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

import { useMotionPreference } from '@/hooks/use-motion-preference';
import { motionConfigValue } from '@/lib/motion/motion-preference';

import { transitions } from './presets';

const loadFeatures = () => import('./features-dom-animation').then(module => module.features);

/**
 * Motion for a subtree: `m.*` components (the small Motion build) get their animation features
 * from a lazily loaded chunk, the default transition comes from the tokens, and Motion follows
 * the visitor's reduced-motion setting, or the override chosen on /settings/ ("reduce" always
 * reduces, "allow" never does). Wrap the app (or the part that animates) in it once.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const { preference } = useMotionPreference();
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion={motionConfigValue(preference)} transition={transitions.base}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
