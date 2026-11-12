import { cn } from '@/lib/utils/cn';

import type { RangeDomain } from '../lib/confidence';

export interface RangeBarProps {
  elo: number;
  /** The estimated 95% range around `elo` (lib/confidence.ts). */
  low: number;
  high: number;
  /** The scale shared by every bar on the page, so bars compare. */
  domain: RangeDomain;
  tone?: 'default' | 'lead';
  /** A taller bar for the podium and the details. */
  size?: 'sm' | 'md';
  className?: string;
}

function position(value: number, { min, max }: RangeDomain): number {
  const span = max - min;
  if (!(span > 0)) return 50;
  return Math.min(100, Math.max(0, ((value - min) / span) * 100));
}

/**
 * The rating and its estimated range on one scale: a track, a band from the low to the high end
 * of the range, and a dot at the rating. The band is wide for a model with few battles and
 * narrows as they accumulate. Decorative: the numbers next to it are the values.
 */
export function RangeBar({
  elo,
  low,
  high,
  domain,
  tone = 'default',
  size = 'sm',
  className,
}: RangeBarProps) {
  const left = position(low, domain);
  const right = position(high, domain);
  const dot = position(elo, domain);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block w-full rounded-full bg-line',
        size === 'md' ? 'h-2' : 'h-1.5',
        className,
      )}
    >
      <span
        style={{ left: `${left.toFixed(2)}%`, width: `${Math.max(1, right - left).toFixed(2)}%` }}
        className={cn(
          'absolute inset-y-0 origin-left animate-grow rounded-full',
          tone === 'lead' ? 'bg-mind-a/40' : 'bg-mind-a/25',
        )}
      />
      <span
        style={{ left: `${dot.toFixed(2)}%` }}
        className={cn(
          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface',
          size === 'md' ? 'size-3.5' : 'size-3',
          tone === 'lead' ? 'bg-mind-a' : 'bg-fg-soft',
        )}
      />
    </span>
  );
}
