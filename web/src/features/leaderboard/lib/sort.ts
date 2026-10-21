import type { LeaderboardEntry, SortDirection, SortKey, SortState } from '../types';
import { byRank } from './entries';

/** Each sortable column, with the direction a first click sorts in (best first). */
export const SORT_COLUMNS: Readonly<Record<SortKey, { label: string; first: SortDirection }>> = {
  rank: { label: 'Rank', first: 'asc' },
  name: { label: 'Model', first: 'asc' },
  provider: { label: 'Provider', first: 'asc' },
  elo: { label: 'Elo', first: 'desc' },
  winRate: { label: 'Win rate', first: 'desc' },
  battles: { label: 'Battles', first: 'desc' },
};

export const DEFAULT_SORT: SortState = { key: 'rank', direction: 'asc' };

/** Ascending comparison on one column. */
function compareBy(key: SortKey, a: LeaderboardEntry, b: LeaderboardEntry): number {
  switch (key) {
    case 'rank':
      return a.rank - b.rank;
    case 'name':
      return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
    case 'provider':
      return a.providerLabel.localeCompare(b.providerLabel, 'en', { sensitivity: 'base' });
    case 'elo':
      return a.elo - b.elo;
    case 'winRate':
      return a.winRate - b.winRate;
    case 'battles':
      return a.battles - b.battles;
  }
}

/**
 * A sorted copy. Equal values keep rank order whatever the direction, so a sort never shuffles
 * models that tie on the sorted column.
 */
export function sortEntries(
  entries: readonly LeaderboardEntry[],
  { key, direction }: SortState,
): LeaderboardEntry[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...entries].sort((a, b) => sign * compareBy(key, a, b) || byRank(a, b));
}

/** What a click on a column header does: the same column flips, another starts best first. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: SORT_COLUMNS[key].first };
}

/** The header's `aria-sort` value. */
export function ariaSort(sort: SortState, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}
