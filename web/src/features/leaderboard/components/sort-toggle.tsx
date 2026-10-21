import { useId } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils/cn';

import { SORT_COLUMNS } from '../lib/sort';
import type { SortKey, SortState } from '../types';

export interface SortToggleProps {
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  /** The orders offered, best first each. */
  options?: readonly SortKey[];
  /** Labels that differ from the table's column names. */
  labels?: Partial<Record<SortKey, string>>;
  className?: string;
}

/**
 * Sort without column headers (the phone list, the models grid): one single-choice toggle per
 * order, each sorting best first.
 */
export function SortToggle({
  sort,
  onSortChange,
  options = ['rank', 'winRate', 'battles'],
  labels = {},
  className,
}: SortToggleProps) {
  const labelId = useId();
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <span id={labelId} className="eyebrow text-muted">
        Sort
      </span>
      <ToggleGroup
        aria-labelledby={labelId}
        value={[sort.key]}
        onValueChange={value => {
          const key = value[0] as SortKey | undefined;
          if (key) onSortChange({ key, direction: SORT_COLUMNS[key].first });
        }}
        className="flex-wrap"
        size="sm"
      >
        {options.map(option => (
          <ToggleGroupItem key={option} value={option}>
            {labels[option] ?? SORT_COLUMNS[option].label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
