import { describe, expect, it } from 'vitest';

import {
  ALL_PROVIDERS,
  ariaSort,
  DEFAULT_SORT,
  EMPTY_FILTERS,
  filterEntries,
  hasActiveFilters,
  matchesQuery,
  nextSort,
  normalizeSearch,
  SORT_COLUMNS,
  sortEntries,
} from '@/features/leaderboard';

import { entry, fullBoard, names, sampleBoard } from './helpers';

const entries = sampleBoard.entries;

describe('sortEntries', () => {
  it('sorts by rank by default', () => {
    expect(DEFAULT_SORT).toEqual({ key: 'rank', direction: 'asc' });
    expect(sortEntries(entries, DEFAULT_SORT)).toEqual(entries);
  });

  it('sorts every column both ways', () => {
    const byBattles = sortEntries(entries, { key: 'battles', direction: 'desc' });
    expect(byBattles.map(item => item.battles)).toEqual([250, 217, 167, 101, 96, 8, 6]);
    const fewest = sortEntries(entries, { key: 'battles', direction: 'asc' });
    expect(fewest.map(item => item.battles)).toEqual([6, 8, 96, 101, 167, 217, 250]);

    const byWinRate = sortEntries(entries, { key: 'winRate', direction: 'desc' });
    expect(byWinRate[0]?.winRate).toBe(64.58);
    expect(byWinRate.at(-1)?.winRate).toBe(0);

    const byElo = sortEntries(entries, { key: 'elo', direction: 'asc' });
    expect(byElo[0]?.elo).toBe(1000);

    expect(names(sortEntries(entries, { key: 'name', direction: 'asc' }))).toEqual([
      'Compound Mini',
      'Gemma 3 1B IT',
      'Gemma 3n E2B IT',
      'hermes-2-pro-mistral-7b',
      'llama-3.1-70b-instruct',
      'llama-3.2-11b-vision-instruct',
      'llama-3.3-70b-instruct-fp8-fast',
    ]);

    const byProvider = sortEntries(entries, { key: 'provider', direction: 'asc' });
    expect(byProvider.map(item => item.providerLabel)).toEqual([
      'Cloudflare',
      'Cloudflare',
      'Cloudflare',
      'Cloudflare',
      'Google',
      'Google',
      'Groq',
    ]);
  });

  it('keeps rank order among equal values, whatever the direction', () => {
    const tied = [
      entry({ id: 'b', name: 'B', rank: 2, battles: 50 }),
      entry({ id: 'a', name: 'A', rank: 1, battles: 50 }),
      entry({ id: 'c', name: 'C', rank: 3, battles: 80 }),
    ];
    expect(names(sortEntries(tied, { key: 'battles', direction: 'desc' }))).toEqual([
      'C',
      'A',
      'B',
    ]);
    expect(names(sortEntries(tied, { key: 'battles', direction: 'asc' }))).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('never changes the list it is given', () => {
    const copy = [...entries];
    sortEntries(entries, { key: 'name', direction: 'desc' });
    expect(entries).toEqual(copy);
  });
});

describe('nextSort and ariaSort', () => {
  it('starts a new column best first and flips the current one', () => {
    expect(nextSort(DEFAULT_SORT, 'elo')).toEqual({ key: 'elo', direction: 'desc' });
    expect(nextSort({ key: 'elo', direction: 'desc' }, 'elo')).toEqual({
      key: 'elo',
      direction: 'asc',
    });
    expect(nextSort(DEFAULT_SORT, 'rank')).toEqual({ key: 'rank', direction: 'desc' });
    expect(nextSort(DEFAULT_SORT, 'name')).toEqual({ key: 'name', direction: 'asc' });
    expect(SORT_COLUMNS.battles.first).toBe('desc');
    expect(SORT_COLUMNS.winRate.first).toBe('desc');
  });

  it('reports the header state for screen readers', () => {
    expect(ariaSort(DEFAULT_SORT, 'rank')).toBe('ascending');
    expect(ariaSort({ key: 'elo', direction: 'desc' }, 'elo')).toBe('descending');
    expect(ariaSort(DEFAULT_SORT, 'elo')).toBe('none');
  });
});

describe('search and provider filter', () => {
  it('normalises case, accents and separators', () => {
    expect(normalizeSearch('  @cf/Meta/Llama-3.3_70B  ')).toBe('cf meta llama 3 3 70b');
    expect(normalizeSearch('Gémma')).toBe('gemma');
  });

  it('matches every word in any order, against name, model id and provider', () => {
    const llama = entries[0];
    if (!llama) throw new Error('fixture');
    expect(matchesQuery(llama, 'llama 70b')).toBe(true);
    expect(matchesQuery(llama, '70B LLAMA')).toBe(true);
    expect(matchesQuery(llama, 'meta')).toBe(true);
    expect(matchesQuery(llama, 'cloudflare fp8')).toBe(true);
    expect(matchesQuery(llama, 'llama groq')).toBe(false);
    expect(matchesQuery(llama, '   ')).toBe(true);
  });

  it('filters by provider and query together', () => {
    expect(filterEntries(entries, EMPTY_FILTERS)).toEqual(entries);
    expect(names(filterEntries(entries, { query: '', provider: 'google' }))).toEqual([
      'Gemma 3n E2B IT',
      'Gemma 3 1B IT',
    ]);
    expect(names(filterEntries(entries, { query: 'gemma 1b', provider: ALL_PROVIDERS }))).toEqual([
      'Gemma 3 1B IT',
    ]);
    expect(filterEntries(entries, { query: 'gemma', provider: 'groq' })).toEqual([]);
    expect(filterEntries(fullBoard.entries, { query: 'gpt oss', provider: 'groq' })).toHaveLength(2);
  });

  it('knows when a filter is on', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ query: ' ', provider: ALL_PROVIDERS })).toBe(false);
    expect(hasActiveFilters({ query: 'qwen', provider: ALL_PROVIDERS })).toBe(true);
    expect(hasActiveFilters({ query: '', provider: 'groq' })).toBe(true);
  });
});
