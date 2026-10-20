/**
 * Count Up, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/CountUp-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - Prerendered counters show their final value and do not move (no flash, readable without
 *   JavaScript); counters that mount after hydration count in, on view or at once.
 * - Reduced motion (useShouldReduceMotion) shows the final value.
 * - Easing from the motion tokens (--ease-out-expo); `tabular-nums` always on.
 * - Kept the count mode, direction, separators, decimals, prefix and suffix; removed the roll
 *   mode, compact format, hover replay and spring easing. Named export.
 * - Screen readers get the final value (visually hidden); the ticking number is hidden.
 */
import { animate } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { ease } from '@/components/motion/presets';
import { useHydrated } from '@/hooks/use-hydrated';
import { useInView } from '@/hooks/use-in-view';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  /** Seconds before it starts. */
  delay?: number;
  /** Seconds. */
  duration?: number;
  className?: string;
  /** Thousands separator, such as "," (none by default). */
  separator?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** `view`: when it scrolls into view. `load`: as soon as it mounts. */
  trigger?: 'view' | 'load';
  onEnd?: () => void;
}

function decimalPlaces(value: number): number {
  const fraction = value.toString().split('.')[1];
  return fraction && Number(fraction) !== 0 ? fraction.length : 0;
}

function formatNumber(
  value: number,
  {
    decimals,
    separator,
    prefix,
    suffix,
  }: { decimals: number; separator: string; prefix: string; suffix: string },
): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole = '0', fraction] = fixed.split('.');
  const grouped = separator ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : whole;
  const negative = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return `${prefix}${negative}${grouped}${fraction ? `.${fraction}` : ''}${suffix}`;
}

/** A number that counts from `from` to `to` once. */
export function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className,
  separator = '',
  decimals,
  prefix = '',
  suffix = '',
  trigger = 'view',
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduce = useShouldReduceMotion();
  const inView = useInView(ref, { once: true });
  const start = direction === 'down' ? to : from;
  const end = direction === 'down' ? from : to;
  const format = {
    decimals: decimals ?? Math.max(decimalPlaces(from), decimalPlaces(to)),
    separator,
    prefix,
    suffix,
  };
  // Only counters that mount after hydration animate; prerendered ones keep the final value.
  const [animated] = useState(() => hydrated);
  const playing = animated && !reduce;
  const ready = trigger === 'load' || inView;
  const endRef = useRef(onEnd);
  const formatRef = useRef(format);

  useEffect(() => {
    endRef.current = onEnd;
    formatRef.current = format;
  });

  useEffect(() => {
    const node = textRef.current;
    if (!playing || !ready || !node) return undefined;
    const controls = animate(start, end, {
      duration: Math.max(0, duration),
      delay,
      ease: ease.outExpo,
      onUpdate: latest => {
        // Write to React's own text node, so later renders keep updating the same node.
        const textNode = node.firstChild;
        if (textNode) textNode.nodeValue = formatNumber(latest, formatRef.current);
      },
      onComplete: () => endRef.current?.(),
    });
    return () => controls.stop();
  }, [playing, ready, start, end, duration, delay]);

  const finalText = formatNumber(end, format);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      <span className="sr-only">{finalText}</span>
      <span ref={textRef} aria-hidden="true">
        {playing ? formatNumber(start, format) : finalText}
      </span>
    </span>
  );
}
