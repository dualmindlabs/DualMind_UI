import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { EMPTY_FILTERS, filterEntries } from '../lib/filter';
import { DEFAULT_SORT, nextSort, sortEntries } from '../lib/sort';
import type { LeaderboardEntry, LeaderboardFilters, SortKey, SortState } from '../types';

export interface BoardView {
  sort: SortState;
  /** A column header was pressed: flip it, or sort a new column best first. */
  toggleSort: (key: SortKey) => void;
  setSort: (sort: SortState) => void;
  filters: LeaderboardFilters;
  setFilters: (filters: LeaderboardFilters) => void;
  clearFilters: () => void;
  /** The entries to show, filtered and sorted; undefined while the board loads. */
  visible: LeaderboardEntry[] | undefined;
}

/**
 * Sort, search and provider filter for a list of entries. The search runs on a deferred copy of
 * the query, so typing stays responsive while the list re-renders.
 */
export function useBoardView(
  entries: readonly LeaderboardEntry[] | undefined,
  initialSort: SortState = DEFAULT_SORT,
): BoardView {
  const [sort, setSort] = useState<SortState>(initialSort);
  const [filters, setFilters] = useState<LeaderboardFilters>(EMPTY_FILTERS);
  const query = useDeferredValue(filters.query);

  const visible = useMemo(
    () =>
      entries === undefined
        ? undefined
        : sortEntries(filterEntries(entries, { query, provider: filters.provider }), sort),
    [entries, query, filters.provider, sort],
  );

  const toggleSort = useCallback((key: SortKey) => setSort(current => nextSort(current, key)), []);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return { sort, toggleSort, setSort, filters, setFilters, clearFilters, visible };
}
