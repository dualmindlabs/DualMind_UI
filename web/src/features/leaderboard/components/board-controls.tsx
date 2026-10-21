import { Search, X } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils/cn';

import { ALL_PROVIDERS } from '../lib/constants';
import type { LeaderboardFilters, ProviderOption } from '../types';

export interface BoardControlsProps {
  filters: LeaderboardFilters;
  onFiltersChange: (filters: LeaderboardFilters) => void;
  /** Every provider on the board; empty while it loads. */
  providers: readonly ProviderOption[];
  /** Models on the board, for the "All" count. */
  total: number;
  /** Placeholder text for the search field. */
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Search and the provider filter. The search matches names, model ids and providers as you
 * type; the provider filter is a single-choice toggle group (arrow keys move between options).
 */
export function BoardControls({
  filters,
  onFiltersChange,
  providers,
  total,
  searchPlaceholder = 'Name, model id or provider',
  disabled = false,
  className,
}: BoardControlsProps) {
  const searchId = useId();
  const providerLabelId = useId();
  const options = [{ value: ALL_PROVIDERS, label: 'All', count: total }, ...providers];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="relative w-full lg:max-w-sm">
        <label htmlFor={searchId} className="sr-only">
          Search models
        </label>
        <Search
          aria-hidden="true"
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        />
        <Input
          id={searchId}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={searchPlaceholder}
          value={filters.query}
          disabled={disabled}
          onChange={event => onFiltersChange({ ...filters, query: event.target.value })}
          onKeyDown={event => {
            if (event.key === 'Escape' && filters.query !== '') {
              event.preventDefault();
              onFiltersChange({ ...filters, query: '' });
            }
          }}
          className="pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query !== '' ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Clear the search"
            onClick={() => onFiltersChange({ ...filters, query: '' })}
            className="absolute top-1/2 right-2.5 -translate-y-1/2"
          >
            <X aria-hidden="true" strokeWidth={1.75} />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span id={providerLabelId} className="eyebrow text-muted">
          Provider
        </span>
        <ToggleGroup
          aria-labelledby={providerLabelId}
          value={[filters.provider]}
          disabled={disabled}
          onValueChange={value => {
            // Pressing the active option again would leave none: fall back to all providers.
            onFiltersChange({ ...filters, provider: value[0] ?? ALL_PROVIDERS });
          }}
          className="flex-wrap"
        >
          {options.map(option => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
              <span className="hidden font-mono text-caption text-muted tabular-nums sm:inline">
                {option.count}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
