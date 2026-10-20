/**
 * Shiny Text, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/ShinyText-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - The sweep is a CSS animation (styles/effects.css, `animate-sweep`) instead of a gradient
 *   rebuilt in JavaScript every frame; it rests for the last 30% of each cycle.
 * - Colours are design tokens (`color`, `shineColor`); in forced-colours mode the text falls back
 *   to the system text colour, so it never disappears.
 * - Reduced motion shows plain text in the base colour.
 * - Kept speed, angle, band width and direction; removed hover and view triggers, yoyo,
 *   pointer following, bands, glow and the easing options. Named export.
 */
import type { CSSProperties, ReactNode } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface ShinyTextProps {
  children: ReactNode;
  /** Base colour token. */
  color?: `--${string}`;
  /** Highlight colour token. */
  shineColor?: `--${string}`;
  /** Seconds for one sweep (the rest between sweeps is added on top). */
  speed?: number;
  /** Gradient angle, in degrees. */
  angle?: number;
  /** Width of the highlight band, as a share of the text (0.05 to 0.5). */
  bandWidth?: number;
  direction?: 'left' | 'right';
  className?: string;
}

/** Text with a highlight that sweeps across it now and then: the "Generating" label. */
export function ShinyText({
  children,
  color = '--muted',
  shineColor = '--fg',
  speed = 2.4,
  angle = 110,
  bandWidth = 0.18,
  direction = 'left',
  className,
}: ShinyTextProps) {
  const reduce = useShouldReduceMotion();
  const band = Math.min(0.5, Math.max(0.05, bandWidth)) * 50;
  const style = {
    color: `var(${color})`,
    ...(reduce ? {} : { WebkitTextFillColor: 'transparent' }),
    backgroundImage: `linear-gradient(${angle}deg, var(${color}) ${50 - band}%, var(${shineColor}) 50%, var(${color}) ${50 + band}%)`,
    backgroundSize: '200% 100%',
    '--sweep-duration': `${speed / 0.7}s`,
    animationDirection: direction === 'right' ? 'reverse' : 'normal',
  } as CSSProperties;

  return (
    <span
      style={style}
      className={cn(
        'inline-block bg-clip-text',
        !reduce && 'animate-sweep',
        'forced-colors:bg-none forced-colors:[-webkit-text-fill-color:CanvasText]!',
        className,
      )}
    >
      {children}
    </span>
  );
}
