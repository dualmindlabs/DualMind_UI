/**
 * Blur Fade, from Magic UI.
 * Source: https://magicui.design/r/blur-fade.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - Only content that mounts after hydration fades in (a new answer, a revealed card); content
 *   in the prerendered HTML renders in place, so nothing is invisible without JavaScript. For
 *   scroll entrances of prerendered content use components/motion/reveal.tsx.
 * - Uses `m.div` (render inside MotionProvider); duration and easing from the motion tokens.
 * - Under reduced motion it is a plain opacity fade, as the motion rules ask.
 * - Removed AnimatePresence (no exit), the custom `variant` prop and the MotionProps spread.
 */
import { m } from 'motion/react';
import { type ReactNode, useRef, useState } from 'react';

import { duration as durations, ease } from '@/components/motion/presets';
import { useHydrated } from '@/hooks/use-hydrated';
import { useInView } from '@/hooks/use-in-view';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

export interface BlurFadeProps {
  children: ReactNode;
  className?: string;
  /** Seconds. */
  duration?: number;
  /** Seconds. */
  delay?: number;
  /** Distance travelled, in pixels. */
  offset?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Wait until it scrolls into view. */
  inView?: boolean;
  blur?: string;
}

/** Content that fades in out of a light blur. */
export function BlurFade({
  children,
  className,
  duration = durations.slow,
  delay = 0,
  offset = 6,
  direction = 'down',
  inView = false,
  blur = '6px',
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const reduce = useShouldReduceMotion();
  const seen = useInView(ref, { once: true, rootMargin: '-50px' });
  // Prerendered content stays where it is; content that mounts later animates.
  const [animated] = useState(() => hydrated);
  const horizontal = direction === 'left' || direction === 'right';
  const from = direction === 'right' || direction === 'down' ? -offset : offset;
  const shift = horizontal ? { x: from, y: 0 } : { x: 0, y: from };
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, ...shift, filter: `blur(${blur})` };
  const visible = reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' };
  const show = !animated || !inView || seen;

  return (
    <m.div
      ref={ref}
      initial={animated ? hidden : false}
      animate={show ? visible : hidden}
      transition={{ delay: 0.04 + delay, duration, ease: ease.outExpo }}
      className={className}
    >
      {children}
    </m.div>
  );
}
