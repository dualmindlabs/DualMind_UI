/**
 * Number Ticker, from Magic UI.
 * Source: https://magicui.design/r/number-ticker.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Why next to React Bits Count Up: Count Up plays once with an easing curve (a count-in on first
 * view); Number Ticker springs to every new `value`, so it suits live numbers that keep changing
 * (votes and battles while the page is open).
 * Our changes:
 * - Prerendered tickers show the value and do not move; tickers that mount after hydration
 *   count in from `startValue` when they come into view; every later change springs.
 * - Reduced motion (useShouldReduceMotion) jumps straight to each value.
 * - Writes to React's own text node; screen readers get the settled value (visually hidden).
 * - Token colours (inherits the text colour) and `tabular-nums`; removed `direction`.
 */
import { useMotionValue, useSpring } from 'motion/react';
import { type ComponentProps, useEffect, useRef, useState } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { useInView } from '@/hooks/use-in-view';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface NumberTickerProps extends Omit<ComponentProps<'span'>, 'children'> {
  value: number;
  startValue?: number;
  /** Seconds before the first count. */
  delay?: number;
  decimalPlaces?: number;
}

function format(value: number, decimals: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value.toFixed(decimals)));
}

/** A number that springs to each new value. */
export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduce = useShouldReduceMotion();
  const inView = useInView(ref, { once: true });
  // Prerendered tickers start at the value; tickers that mount later count in.
  const [initial] = useState(() => (hydrated ? startValue : value));
  const motionValue = useMotionValue(initial);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 100 });

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      spring.jump(value);
      return undefined;
    }
    const timer = window.setTimeout(() => motionValue.set(value), delay * 1000);
    return () => window.clearTimeout(timer);
  }, [inView, reduce, value, delay, motionValue, spring]);

  useEffect(
    () =>
      spring.on('change', latest => {
        const textNode = textRef.current?.firstChild;
        if (textNode) textNode.nodeValue = format(latest, decimalPlaces);
      }),
    [spring, decimalPlaces],
  );

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      <span className="sr-only">{format(value, decimalPlaces)}</span>
      <span ref={textRef} aria-hidden="true">
        {format(initial, decimalPlaces)}
      </span>
    </span>
  );
}
