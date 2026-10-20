/**
 * Border Beam, from Magic UI.
 * Source: https://magicui.design/r/border-beam.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - The beam moves with a CSS animation along a motion path (styles/effects.css,
 *   `animate-orbit`) instead of a Motion component, so it needs no JavaScript per frame.
 * - Colours are design tokens (`colorFrom`, `colorTo`).
 * - Reduced motion: no beam at all; the element's own border stays.
 * - Removed the `transition` and `style` props. Decorative (aria-hidden).
 */
import type { CSSProperties } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface BorderBeamProps {
  /** Length of the beam, in pixels. */
  size?: number;
  /** Seconds per lap. */
  duration?: number;
  /** Seconds to offset the start, so several beams can chase each other. */
  delay?: number;
  colorFrom?: `--${string}`;
  colorTo?: `--${string}`;
  reverse?: boolean;
  /** Starting point along the border, 0 to 100. */
  initialOffset?: number;
  borderWidth?: number;
  className?: string;
}

/** A short light travelling around the parent's border: the pane that is generating. */
export function BorderBeam({
  size = 60,
  duration = 6,
  delay = 0,
  colorFrom = '--mind-a',
  colorTo = '--mind-b',
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
  className,
}: BorderBeamProps) {
  const reduce = useShouldReduceMotion();
  if (reduce) return null;

  const beam = {
    width: size,
    offsetPath: `rect(0 auto auto 0 round ${size}px)`,
    backgroundImage: `linear-gradient(to left, var(${colorFrom}), var(${colorTo}), transparent)`,
    animationDelay: `${-delay}s`,
    animationDirection: reverse ? 'reverse' : 'normal',
    '--orbit-duration': `${duration}s`,
    '--orbit-start': `${initialOffset}%`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      style={{ borderWidth }}
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
    >
      <div style={beam} className={cn('absolute aspect-square animate-orbit', className)} />
    </div>
  );
}
