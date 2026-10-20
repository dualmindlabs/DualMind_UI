/**
 * Border Trail, from Motion Primitives by ibelick.
 * Source: https://motion-primitives.com/c/border-trail.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - The trail moves with a CSS animation along a motion path (styles/effects.css,
 *   `animate-orbit`) instead of a Motion component; `duration` replaces `transition`.
 * - Colour is a design token, drawn as a soft radial light instead of the zinc square.
 * - Reduced motion: no trail; the element's own border stays.
 * - Removed `onAnimationComplete` and `style`. Decorative (aria-hidden).
 */
import type { CSSProperties } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface BorderTrailProps {
  className?: string;
  /** Size of the light, in pixels. */
  size?: number;
  /** Seconds per lap. */
  duration?: number;
  color?: `--${string}`;
}

/** A light that runs around the parent's border: the alternate generating state. */
export function BorderTrail({
  className,
  size = 60,
  duration = 5,
  color = '--mind-b',
}: BorderTrailProps) {
  const reduce = useShouldReduceMotion();
  if (reduce) return null;

  const trail = {
    width: size,
    offsetPath: `rect(0 auto auto 0 round ${size}px)`,
    backgroundImage: `radial-gradient(closest-side, var(${color}), transparent)`,
    '--orbit-duration': `${duration}s`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] [mask-composite:intersect] [mask-clip:padding-box,border-box]"
    >
      <div style={trail} className={cn('absolute aspect-square animate-orbit', className)} />
    </div>
  );
}
