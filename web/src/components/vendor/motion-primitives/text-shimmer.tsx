/**
 * Text Shimmer, from Motion Primitives by ibelick.
 * Source: https://motion-primitives.com/c/text-shimmer.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - The shimmer is a CSS animation (styles/effects.css, `animate-shimmer`) instead of a Motion
 *   component created on every render; no JavaScript per frame.
 * - Colours are design tokens (`--muted` base, `--fg` highlight by default); in forced-colours
 *   mode the text uses the system text colour, so it never disappears.
 * - Reduced motion shows plain text in the base colour.
 * - `as` is limited to text elements; no React.memo, no 'use client'.
 */
import type { CSSProperties, ElementType } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  /** Seconds per pass. */
  duration?: number;
  /** Width of the highlight, in pixels per character. */
  spread?: number;
  baseColor?: `--${string}`;
  shimmerColor?: `--${string}`;
}

/** A soft highlight running across a label: "Generating", "Thinking". */
export function TextShimmer({
  children,
  as: Tag = 'span',
  className,
  duration = 2,
  spread = 2,
  baseColor = '--muted',
  shimmerColor = '--fg',
}: TextShimmerProps) {
  const reduce = useShouldReduceMotion();
  const width = children.length * spread;
  const style = {
    color: `var(${baseColor})`,
    '--shimmer-duration': `${duration}s`,
    ...(reduce
      ? {}
      : {
          WebkitTextFillColor: 'transparent',
          backgroundImage: `linear-gradient(90deg, transparent calc(50% - ${width}px), var(${shimmerColor}), transparent calc(50% + ${width}px)), linear-gradient(var(${baseColor}), var(${baseColor}))`,
          backgroundSize: '250% 100%, auto',
          backgroundRepeat: 'no-repeat, padding-box',
        }),
  } as CSSProperties;

  return (
    <Tag
      style={style}
      className={cn(
        'relative inline-block bg-clip-text',
        !reduce && 'animate-shimmer',
        'forced-colors:bg-none forced-colors:[-webkit-text-fill-color:CanvasText]!',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
