/**
 * Marquee, from Magic UI.
 * Source: https://magicui.design/r/marquee.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - The keyframes live in styles/effects.css (`animate-marquee`, `animate-marquee-vertical`);
 *   duration and gap are props.
 * - Accessible structure: only the first copy is exposed to assistive technology; the repeats
 *   are aria-hidden and inert, so links inside them leave the tab order.
 * - Stops while `paused` (bind it to a visible pause control, WCAG 2.2.2), on hover when asked,
 *   whenever something inside has keyboard focus, and under reduced motion.
 */
import type { ComponentProps, CSSProperties, ReactNode } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface MarqueeProps extends Omit<ComponentProps<'div'>, 'children'> {
  children: ReactNode;
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  /** Copies of the content; enough to fill the track at least twice. */
  repeat?: number;
  /** Seconds per loop. */
  duration?: number;
  /** Any CSS length. */
  gap?: string;
  paused?: boolean;
}

/** Content that scrolls in an endless loop: testimonials, the model strip (alternate). */
export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  duration = 40,
  gap = '1rem',
  paused = false,
  style,
  ...props
}: MarqueeProps) {
  const reduce = useShouldReduceMotion();
  const moving = !reduce;

  return (
    <div
      {...props}
      style={{ '--marquee-duration': `${duration}s`, '--gap': gap, ...style } as CSSProperties}
      className={cn(
        'group flex gap-(--gap) overflow-hidden p-2',
        vertical ? 'flex-col' : 'flex-row',
        className,
      )}
    >
      {Array.from({ length: Math.max(1, repeat) }, (_, index) => (
        <div
          key={index}
          aria-hidden={index > 0 || undefined}
          inert={index > 0}
          className={cn(
            'flex shrink-0 justify-around gap-(--gap)',
            vertical ? 'flex-col' : 'flex-row',
            moving && (vertical ? 'animate-marquee-vertical' : 'animate-marquee'),
            moving && reverse && '[animation-direction:reverse]',
            moving && pauseOnHover && 'group-hover:[animation-play-state:paused]',
            moving && 'group-focus-within:[animation-play-state:paused]',
            moving && paused && '[animation-play-state:paused]',
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
