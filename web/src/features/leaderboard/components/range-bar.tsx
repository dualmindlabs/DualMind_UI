import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  /**
   * The range is measured (the crowd board's bootstrap interval), not estimated: it is drawn as a
   * whisker, a line with an end cap at each side, so a measured interval reads differently from
   * the estimated band.
   */
  measured?: boolean;
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
  measured = false,
  className,
}: RangeBarProps) {
  const left = position(low, domain);
  const right = position(high, domain);
  const dot = position(elo, domain);
  // A range wider than the shared scale runs off the track: say so with an arrow at that end.
  const clipsLow = low < domain.min;
  const clipsHigh = high > domain.max;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block w-full rounded-full bg-line',
        size === 'md' ? 'h-2' : 'h-1.5',
        className,
      )}
    >
      {measured ? (
        <span
          data-whisker=""
          style={{ left: `${left.toFixed(2)}%`, width: `${Math.max(1, right - left).toFixed(2)}%` }}
          className="absolute inset-y-[-3px] origin-left animate-grow"
        >
          <span
            className={cn(
              'absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full',
              tone === 'lead' ? 'bg-mind-a' : 'bg-fg-soft',
            )}
          />
          {(['left-0', 'right-0'] as const).map(side => (
            <span
              key={side}
              className={cn(
                'absolute inset-y-0 w-0.5 rounded-full',
                side,
                tone === 'lead' ? 'bg-mind-a' : 'bg-fg-soft',
              )}
            />
          ))}
        </span>
      ) : (
        <span
          style={{ left: `${left.toFixed(2)}%`, width: `${Math.max(1, right - left).toFixed(2)}%` }}
          className={cn(
            'absolute inset-y-0 origin-left animate-grow rounded-full',
            tone === 'lead' ? 'bg-mind-a/40' : 'bg-mind-a/25',
          )}
        />
      )}
      {clipsLow ? (
        <ChevronLeft
          data-clipped="low"
          strokeWidth={2.5}
          className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 text-fg-soft"
        />
      ) : null}
      {clipsHigh ? (
        <ChevronRight
          data-clipped="high"
          strokeWidth={2.5}
          className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 text-fg-soft"
        />
      ) : null}
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
