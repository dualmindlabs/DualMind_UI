import { cn } from '@/lib/utils/cn';

import { formatCount } from '../lib/format';

export interface RecordBarProps {
  wins: number;
  ties: number;
  losses: number;
  /** A thin decorative bar without the legend, for a table cell or card: name the numbers beside it. */
  compact?: boolean;
  className?: string;
}

const SEGMENTS = [
  { key: 'wins', label: 'Wins', swatch: 'bg-mind-a' },
  { key: 'ties', label: 'Ties', swatch: 'bg-muted' },
  { key: 'losses', label: 'Losses', swatch: 'bg-line-strong' },
] as const;

/**
 * A model's record as one stacked bar (wins, ties, losses, separated by 2px gaps) with a legend
 * that carries the numbers, so the colours are never the only signal. Wins take the Mind A
 * accent; ties and losses stay neutral, because a loss is not an error state.
 */
export function RecordBar({ wins, ties, losses, compact = false, className }: RecordBarProps) {
  const values = { wins, ties, losses };
  const total = wins + ties + losses;

  return (
    <figure
      aria-hidden={compact ? 'true' : undefined}
      className={cn('grid', compact ? 'gap-0' : 'gap-3', className)}
    >
      <div
        aria-hidden="true"
        className={cn(
          'flex w-full gap-0.5 overflow-hidden rounded-full',
          compact ? 'h-1.5' : 'h-3',
          total === 0 && 'bg-line',
        )}
      >
        {total > 0
          ? SEGMENTS.filter(segment => values[segment.key] > 0).map(segment => (
              <span
                key={segment.key}
                className={cn('h-full', segment.swatch)}
                style={{ flexGrow: values[segment.key], flexBasis: 0 }}
              />
            ))
          : null}
      </div>
      {compact ? null : (
        <figcaption>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-ui-sm text-fg-soft">
            {SEGMENTS.map(segment => (
              <li key={segment.key} className="inline-flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-2.5 rounded-[2px]', segment.swatch)} />
                {segment.label}
                <span className="font-mono font-medium text-fg tabular-nums">
                  {formatCount(values[segment.key])}
                </span>
              </li>
            ))}
          </ul>
        </figcaption>
      )}
    </figure>
  );
}
