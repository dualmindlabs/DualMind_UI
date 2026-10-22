import { RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { ModelMark } from '@/components/ui/model-mark';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils/cn';

import { ALL_PROVIDERS } from '../lib/constants';
import { hasActiveFilters } from '../lib/filter';
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

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName);
}

/**
 * Search and the provider filter on one lit panel. The search matches names, model ids and
 * providers as you type, and "/" jumps to it from anywhere on the page; the provider filter is a
 * single-choice toggle group (arrow keys move between options) with each maker's mark.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const options = [{ value: ALL_PROVIDERS, label: 'All', count: total }, ...providers];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || inputRef.current?.disabled) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={cn('surface-duel grid gap-4 p-3 sm:p-4', className)}>
      <div className="relative w-full">
        <label htmlFor={searchId} className="sr-only">
          Search models
        </label>
        <Search
          aria-hidden="true"
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        />
        <Input
          ref={inputRef}
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
          className="h-12 surface-inset pr-14 pl-10 text-body [&::-webkit-search-cancel-button]:hidden"
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
        ) : (
          <Kbd
            aria-hidden="true"
            className="absolute top-1/2 right-3 -translate-y-1/2 pointer-coarse:hidden"
          >
            /
          </Kbd>
        )}
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
              {option.value === ALL_PROVIDERS ? null : (
                <ModelMark name={option.label} size="sm" className="size-5 text-[0.625rem]" />
              )}
              {option.label}
              <span className="hidden font-mono text-caption text-muted tabular-nums sm:inline">
                {option.count}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {hasActiveFilters(filters) ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onFiltersChange({ query: '', provider: ALL_PROVIDERS })}
            className="ml-auto"
          >
            <RotateCcw aria-hidden="true" strokeWidth={1.75} />
            Reset
            <span className="sr-only"> search and provider</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
