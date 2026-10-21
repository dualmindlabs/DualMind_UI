import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

import { ariaSort, SORT_COLUMNS } from '../lib/sort';
import type { SortKey, SortState } from '../types';

export interface SortHeaderProps {
  column: SortKey;
  sort: SortState;
  onSort: (column: SortKey) => void;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * A sortable column header: a <th> with `aria-sort` (screen readers announce the state) and a
 * button named after the column. The arrow shows the direction; a first press sorts best first.
 */
export function SortHeader({ column, sort, onSort, align = 'start', className }: SortHeaderProps) {
  const state = ariaSort(sort, column);
  const { label } = SORT_COLUMNS[column];
  const iconClass = cn(
    'size-3.5 shrink-0 transition-opacity duration-(--dur-fast)',
    state === 'none'
      ? 'opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100'
      : 'text-mind-a opacity-100',
  );

  return (
    <th scope="col" aria-sort={state} className={cn('p-0 font-normal', className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'group/sort relative inline-flex h-10 w-full cursor-pointer items-center gap-1.5 px-3 eyebrow whitespace-nowrap transition-colors duration-(--dur-fast) hover:text-fg focus-visible:-outline-offset-2 pointer-coarse:h-11',
          align === 'end' ? 'justify-end text-right' : 'justify-start text-left',
          state === 'none' ? 'text-muted' : 'text-fg',
        )}
      >
        {label}
        {state === 'ascending' ? (
          <ArrowUp aria-hidden="true" strokeWidth={1.75} className={iconClass} />
        ) : state === 'descending' ? (
          <ArrowDown aria-hidden="true" strokeWidth={1.75} className={iconClass} />
        ) : (
          <ArrowUpDown aria-hidden="true" strokeWidth={1.75} className={iconClass} />
        )}
      </button>
    </th>
  );
}
