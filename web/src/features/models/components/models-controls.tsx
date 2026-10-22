import { LayoutGrid, Rows3, Search, X } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelMark } from '@/components/ui/model-mark';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ALL_PROVIDERS,
  type LeaderboardFilters,
  type ProviderOption,
} from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

import type { ModelLayout } from './model-card';

export interface ModelsControlsProps {
  filters: LeaderboardFilters;
  onFiltersChange: (filters: LeaderboardFilters) => void;
  providers: readonly ProviderOption[];
  total: number;
  layout: ModelLayout;
  onLayoutChange: (layout: ModelLayout) => void;
  disabled?: boolean;
}

/**
 * Search, the maker chips (a mark and a count each; a scrolling row on phones, wrapping on wide
 * screens) and the cards / list switch. Names stay what they were: a "Search models" field and one
 * single-choice button per maker.
 */
export function ModelsControls({
  filters,
  onFiltersChange,
  providers,
  total,
  layout,
  onLayoutChange,
  disabled = false,
}: ModelsControlsProps) {
  const searchId = useId();
  const providerLabelId = useId();
  const layoutLabelId = useId();
  const options = [{ value: ALL_PROVIDERS, label: 'All', count: total }, ...providers];

  return (
    <div className="surface-duel grid gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
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
            placeholder="Name, model id or maker"
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

        <div className="flex items-center gap-3">
          <span id={layoutLabelId} className="eyebrow text-muted">
            View
          </span>
          <ToggleGroup
            aria-labelledby={layoutLabelId}
            size="sm"
            value={[layout]}
            onValueChange={value => {
              const next = value[0];
              if (next === 'cards' || next === 'list') onLayoutChange(next);
            }}
          >
            <ToggleGroupItem value="cards">
              <LayoutGrid aria-hidden="true" strokeWidth={1.75} />
              Cards
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <Rows3 aria-hidden="true" strokeWidth={1.75} />
              List
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid gap-2">
        <span id={providerLabelId} className="eyebrow text-muted">
          Maker
        </span>
        <ToggleGroup
          aria-labelledby={providerLabelId}
          value={[filters.provider]}
          disabled={disabled}
          onValueChange={value => {
            onFiltersChange({ ...filters, provider: value[0] ?? ALL_PROVIDERS });
          }}
          className="-mx-4 w-auto [scrollbar-width:none] flex-nowrap gap-2 overflow-x-auto rounded-none border-0 bg-transparent p-0 px-4 pb-1 sm:mx-0 sm:w-fit sm:max-w-full sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {options.map(option => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={cn(
                'h-9 gap-2 rounded-full border-line pr-3 pl-1.5',
                option.value === ALL_PROVIDERS && 'pl-3',
                'data-pressed:border-mind-a/55 data-pressed:bg-mind-a-tint data-pressed:text-fg',
              )}
            >
              {option.value === ALL_PROVIDERS ? null : (
                <ModelMark name={option.label} size="sm" className="rounded-full" />
              )}
              {option.label}
              <span className="font-mono text-caption text-muted tabular-nums">{option.count}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
