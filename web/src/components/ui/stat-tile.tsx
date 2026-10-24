/**
 * Stat tile: a label, one big tabular number and an optional delta or hint, on a lit surface.
 * `tone` puts the Mind A or Mind B rule across the top. Our own component.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** A change next to the value: "+7.2". Pass `trend` so the colour is never the only signal. */
  delta?: ReactNode;
  trend?: 'up' | 'down' | 'flat';
  hint?: ReactNode;
  tone?: 'neutral' | 'a' | 'b';
  className?: string;
}

const surface = { neutral: 'surface-duel', a: 'surface-a', b: 'surface-b' } as const;
const trendClass = { up: 'text-ok', down: 'text-bad', flat: 'text-muted' } as const;
const trendMark = { up: '▲', down: '▼', flat: '◆' } as const;

export function StatTile({
  label,
  value,
  delta,
  trend = 'flat',
  hint,
  tone = 'neutral',
  className,
}: StatTileProps) {
  return (
    <div
      data-slot="stat-tile"
      data-tone={tone}
      className={cn('flex flex-col gap-3 p-5', surface[tone], className)}
    >
      <dl className="flex flex-col gap-3">
        <dt className="eyebrow text-muted">{label}</dt>
        <dd className="flex items-baseline gap-3">
          <span className="numeric text-stat text-fg">{value}</span>
          {delta ? (
            <span
              className={cn('inline-flex items-center gap-1 numeric text-ui', trendClass[trend])}
            >
              <span aria-hidden="true" className="text-label">
                {trendMark[trend]}
              </span>
              {delta}
            </span>
          ) : null}
        </dd>
      </dl>
      {hint ? <p className="text-caption text-muted">{hint}</p> : null}
    </div>
  );
}
