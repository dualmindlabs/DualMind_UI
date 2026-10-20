/**
 * Animated Beam, from Magic UI.
 * Source: https://magicui.design/r/animated-beam.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - Colours are design tokens: the resting path uses `--line-strong`, the beam runs from
 *   `gradientStartColor` to `gradientStopColor` (`--token` names).
 * - Uses `m.linearGradient` (render inside MotionProvider); easing from the motion tokens.
 * - Reduced motion: no travelling light, the path is drawn in the start colour instead.
 * - The path is measured in a ResizeObserver callback (none in old browsers or jsdom: measured
 *   once on the next frame). Decorative (aria-hidden).
 */
import { m } from 'motion/react';
import { type RefObject, useEffect, useId, useState } from 'react';

import { ease } from '@/components/motion/presets';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  /** Positive values bow the path upwards, in pixels. */
  curvature?: number;
  reverse?: boolean;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: `--${string}`;
  gradientStopColor?: `--${string}`;
  /** Seconds before the first run. */
  delay?: number;
  /** Seconds per run. */
  duration?: number;
  repeatDelay?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

interface Geometry {
  d: string;
  width: number;
  height: number;
}

/** A light that travels along a curved line between two elements: prompt to Mind A and Mind B. */
export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  pathWidth = 2,
  pathOpacity = 0.35,
  gradientStartColor = '--mind-a',
  gradientStopColor = '--mind-b',
  delay = 0,
  duration = 4,
  repeatDelay = 0.5,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: AnimatedBeamProps) {
  const id = useId();
  const reduce = useShouldReduceMotion();
  const [geometry, setGeometry] = useState<Geometry>({ d: '', width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (!container || !from || !to) return;
      const box = container.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const startX = a.left - box.left + a.width / 2 + startXOffset;
      const startY = a.top - box.top + a.height / 2 + startYOffset;
      const endX = b.left - box.left + b.width / 2 + endXOffset;
      const endY = b.top - box.top + b.height / 2 + endYOffset;
      const controlY = startY - curvature;
      setGeometry({
        d: `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`,
        width: box.width,
        height: box.height,
      });
    };

    if (typeof ResizeObserver === 'undefined') {
      const frame = requestAnimationFrame(update);
      return () => cancelAnimationFrame(frame);
    }
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  const coordinates = reverse
    ? { x1: ['90%', '-10%'], x2: ['100%', '0%'], y1: ['0%', '0%'], y2: ['0%', '0%'] }
    : { x1: ['10%', '110%'], x2: ['0%', '100%'], y1: ['0%', '0%'], y2: ['0%', '0%'] };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      className={cn('pointer-events-none absolute top-0 left-0 transform-gpu', className)}
    >
      <path
        d={geometry.d}
        strokeWidth={pathWidth}
        strokeLinecap="round"
        style={{
          stroke: reduce ? `var(${gradientStartColor})` : 'var(--line-strong)',
          strokeOpacity: reduce ? 0.8 : pathOpacity,
        }}
      />
      {reduce ? null : (
        <>
          <path
            d={geometry.d}
            strokeWidth={pathWidth}
            stroke={`url(#${id})`}
            strokeLinecap="round"
          />
          <defs>
            <m.linearGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              initial={{ x1: '0%', x2: '0%', y1: '0%', y2: '0%' }}
              animate={coordinates}
              transition={{
                delay,
                duration,
                ease: ease.outExpo,
                repeat: Infinity,
                repeatDelay,
              }}
            >
              <stop style={{ stopColor: `var(${gradientStartColor})`, stopOpacity: 0 }} />
              <stop style={{ stopColor: `var(${gradientStartColor})` }} />
              <stop offset="32.5%" style={{ stopColor: `var(${gradientStopColor})` }} />
              <stop
                offset="100%"
                style={{ stopColor: `var(${gradientStopColor})`, stopOpacity: 0 }}
              />
            </m.linearGradient>
          </defs>
        </>
      )}
    </svg>
  );
}
