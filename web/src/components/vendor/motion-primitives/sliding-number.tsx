/**
 * Sliding Number, from Motion Primitives by ibelick.
 * Source: https://motion-primitives.com/c/sliding-number.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - No react-use-measure: each digit column moves by a percentage of its own height, so nothing
 *   is measured and the first render is already correct (also when prerendered).
 * - Uses `m.span`; the digits' spring stays as in the original.
 * - Accessible: the value is read once from a visually hidden copy; the columns are hidden.
 * - Reduced motion renders the number as plain text.
 * - Removed the per-digit `layoutId`. Named export as before.
 */
import { m, type MotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

const TRANSITION = { stiffness: 280, damping: 18, mass: 0.3 };

function Digit({ value, place }: { value: number; place: number }) {
  const digit = Math.floor(value / place) % 10;
  const animated = useSpring(digit, TRANSITION);

  useEffect(() => {
    animated.set(digit);
  }, [animated, digit]);

  return (
    <span className="relative inline-block w-[1ch] overflow-y-clip leading-none tabular-nums">
      <span className="invisible">0</span>
      {Array.from({ length: 10 }, (_, number) => (
        <Numeral key={number} motionValue={animated} number={number} />
      ))}
    </span>
  );
}

function Numeral({ motionValue, number }: { motionValue: MotionValue<number>; number: number }) {
  const y = useTransform(motionValue, latest => {
    const offset = (10 + number - (latest % 10)) % 10;
    return `${(offset > 5 ? offset - 10 : offset) * 100}%`;
  });
  return (
    <m.span style={{ y }} className="absolute inset-0 flex items-center justify-center">
      {number}
    </m.span>
  );
}

export interface SlidingNumberProps {
  value: number;
  /** Pad single digits with a zero. */
  padStart?: boolean;
  decimalSeparator?: string;
  className?: string;
}

/** A number whose digits roll to their new values: ranks and Elo. */
export function SlidingNumber({
  value,
  padStart = false,
  decimalSeparator = '.',
  className,
}: SlidingNumberProps) {
  const reduce = useShouldReduceMotion();
  const absolute = Math.abs(value);
  const [integerPart = '0', decimalPart] = absolute.toString().split('.');
  const integerValue = parseInt(integerPart, 10);
  const padded = padStart && integerValue < 10 ? `0${integerPart}` : integerPart;
  const integerDigits = padded.split('');
  const label = `${value < 0 ? '-' : ''}${padded}${decimalPart ? `${decimalSeparator}${decimalPart}` : ''}`;

  if (reduce) return <span className={cn('tabular-nums', className)}>{label}</span>;

  return (
    <span className={cn('inline-flex items-center tabular-nums', className)}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="inline-flex items-center">
        {value < 0 ? '-' : null}
        {integerDigits.map((_, index) => {
          const place = 10 ** (integerDigits.length - index - 1);
          return <Digit key={`pos-${place}`} value={integerValue} place={place} />;
        })}
        {decimalPart ? (
          <>
            <span>{decimalSeparator}</span>
            {decimalPart.split('').map((_, index) => (
              <Digit
                key={`decimal-${index}`}
                value={parseInt(decimalPart, 10)}
                place={10 ** (decimalPart.length - index - 1)}
              />
            ))}
          </>
        ) : null}
      </span>
    </span>
  );
}
