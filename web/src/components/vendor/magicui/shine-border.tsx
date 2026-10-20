/**
 * Shine Border, from Magic UI.
 * Source: https://magicui.design/r/shine-border.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - Colours are design tokens (`shineColor` takes one or more `--token` names).
 * - The keyframes live in styles/effects.css (`animate-shine`). The animation moves a background
 *   on a 1px ring only, so it repaints a tiny area; reduced motion stops it on a still shine.
 * - Decorative (aria-hidden); no 'use client'.
 */
import type { ComponentProps, CSSProperties } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface ShineBorderProps extends ComponentProps<'div'> {
  borderWidth?: number;
  /** Seconds per cycle. */
  duration?: number;
  shineColor?: `--${string}` | `--${string}`[];
}

/** A shimmering border: the #1 card on the leaderboard podium. */
export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = ['--mind-a', '--mind-b', '--human'],
  className,
  style,
  ...props
}: ShineBorderProps) {
  const reduce = useShouldReduceMotion();
  const colors = (Array.isArray(shineColor) ? shineColor : [shineColor])
    .map(token => `var(${token})`)
    .join(',');

  return (
    <div
      aria-hidden="true"
      style={
        {
          '--shine-duration': `${duration}s`,
          backgroundImage: `radial-gradient(transparent, transparent, ${colors}, transparent, transparent)`,
          backgroundSize: '300% 300%',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: borderWidth,
          ...style,
        } as CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 size-full rounded-[inherit]',
        !reduce && 'animate-shine will-change-[background-position]',
        className,
      )}
      {...props}
    />
  );
}
