import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { NumberTicker } from '@/components/vendor/magicui/number-ticker';
import { CountUp } from '@/components/vendor/reactbits/count-up';
import { cn } from '@/lib/utils/cn';

import { formatClock, formatZone } from '../lib/format';
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
  /**
   * Set when the Worker served a saved copy (ISO): the last time it confirmed the numbers with the
   * API. The cell then says so and shows this time instead of the browser's.
   */
  savedAt?: string | null | undefined;
  className?: string;
}

function Cell({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="relative grid content-start gap-2.5 bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] px-4 py-4 sm:px-6 sm:py-5">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="numeric text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-none text-fg">
        {children}
      </dd>
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
  savedAt = null,
  className,
}: StatsStripProps) {
  const pending = <Skeleton className="h-8 w-16" />;
  const savedMs = savedAt === null ? Number.NaN : Date.parse(savedAt);
  const saved = Number.isFinite(savedMs);
  const shownAt = saved ? savedMs : updatedAt;

  return (
    <dl
      aria-busy={summary === undefined}
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-lift sm:grid-cols-4 lg:grid-cols-2',
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
        label={saved ? 'Data as of' : 'Checked'}
        hint={
          summary ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  'size-1.5 rounded-full',
                  stale || saved ? 'bg-warn' : 'bg-ok',
                  refreshing && 'animate-pulse',
                )}
              />
              {saved
                ? 'Saved copy, the API is unreachable'
                : stale
                  ? 'Refresh failed'
                  : refreshing
                    ? 'Refreshing'
                    : 'Your browser asks every minute'}
            </span>
          ) : (
            'Loading'
          )
        }
      >
        {summary && shownAt > 0 ? (
          <time dateTime={new Date(shownAt).toISOString()}>
            {formatClock(shownAt)}{' '}
            <abbr
              title="Your time zone"
              className="text-caption font-normal text-muted no-underline"
            >
              {formatZone(shownAt)}
            </abbr>
          </time>
        ) : (
          pending
        )}
      </Cell>
    </dl>
  );
}
