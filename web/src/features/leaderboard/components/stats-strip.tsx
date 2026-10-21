import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { NumberTicker } from '@/components/vendor/magicui/number-ticker';
import { CountUp } from '@/components/vendor/reactbits/count-up';
import { cn } from '@/lib/utils/cn';

import { formatClock } from '../lib/format';
import type { LeaderboardSummary } from '../types';

export interface StatsStripProps {
  /** Undefined while the board loads (and in the prerendered HTML). */
  summary: LeaderboardSummary | undefined;
  /** When the board was last fetched (ms), or 0. */
  updatedAt: number;
  /** A refresh is running. */
  refreshing?: boolean;
  /** The last refresh failed; the numbers are from `updatedAt`. */
  stale?: boolean;
  className?: string;
}

function Cell({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="grid content-start gap-2 bg-surface px-4 py-4 sm:px-6 sm:py-5">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="text-h2 leading-none font-light text-fg tabular-nums">{children}</dd>
      {hint ? <dd className="text-caption text-muted">{hint}</dd> : null}
    </div>
  );
}

/**
 * The timing board's header row: models, battles, providers and when the numbers were read.
 * Numbers count in once the data arrives (Count Up) and spring to new values on a refresh
 * (Number Ticker); both show the final value at once under reduced motion.
 */
export function StatsStrip({
  summary,
  updatedAt,
  refreshing = false,
  stale = false,
  className,
}: StatsStripProps) {
  const pending = <Skeleton className="h-8 w-16" />;

  return (
    <dl
      aria-busy={summary === undefined}
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-raise sm:grid-cols-4 lg:grid-cols-2',
        className,
      )}
    >
      <Cell label="Models" hint="Ranked by Elo">
        {summary ? <CountUp to={summary.models} duration={1.2} trigger="load" /> : pending}
      </Cell>
      <Cell label="Battles" hint="Two models each">
        {summary ? <NumberTicker value={summary.battles} stiffness={140} damping={28} /> : pending}
      </Cell>
      <Cell label="Makers" hint="Behind the models">
        {summary ? <CountUp to={summary.providers} duration={0.8} trigger="load" /> : pending}
      </Cell>
      <Cell
        label="Updated"
        hint={
          summary ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  'size-1.5 rounded-full',
                  stale ? 'bg-warn' : 'bg-ok',
                  refreshing && 'animate-pulse',
                )}
              />
              {stale ? 'Refresh failed' : refreshing ? 'Refreshing' : 'Live, every minute'}
            </span>
          ) : (
            'Loading'
          )
        }
      >
        {summary && updatedAt > 0 ? (
          <time dateTime={new Date(updatedAt).toISOString()}>{formatClock(updatedAt)}</time>
        ) : (
          pending
        )}
      </Cell>
    </dl>
  );
}
