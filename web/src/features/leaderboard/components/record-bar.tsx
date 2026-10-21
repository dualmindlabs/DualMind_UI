import { cn } from '@/lib/utils/cn';

import { formatCount } from '../lib/format';

export interface RecordBarProps {
  wins: number;
  ties: number;
  losses: number;
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
export function RecordBar({ wins, ties, losses }: RecordBarProps) {
  const values = { wins, ties, losses };
  const total = wins + ties + losses;

  return (
    <figure className="grid gap-3">
      <div
        aria-hidden="true"
        className={cn('flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full', total === 0 && 'bg-line')}
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
    </figure>
  );
}
