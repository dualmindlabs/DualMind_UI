import type { LeaderboardEntry, LeaderboardFilters } from '../types';
import { ALL_PROVIDERS } from './constants';

export const EMPTY_FILTERS: LeaderboardFilters = { query: '', provider: ALL_PROVIDERS };

/** Lower case, accents removed, separators (`-`, `_`, `/`, `.`, `@`) read as spaces. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[-_/.@:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matches every word of the query against the model's name, full model id, maker and serving
 * platform, in any order: "llama 70b" finds "llama-3.3-70b-instruct-fp8-fast", "groq kimi" finds Kimi on Groq.
 */
export function matchesQuery(entry: LeaderboardEntry, query: string): boolean {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearch(`${entry.name} ${entry.modelName} ${entry.providerLabel} ${entry.platformLabel}`);
  return words.every(word => haystack.includes(word));
}

export function matchesProvider(entry: LeaderboardEntry, provider: string): boolean {
  return provider === ALL_PROVIDERS || entry.provider === provider;
}

/** The entries that match both the search and the provider filter, in their current order. */
export function filterEntries(
  entries: readonly LeaderboardEntry[],
  { query, provider }: LeaderboardFilters,
): LeaderboardEntry[] {
  return entries.filter(entry => matchesProvider(entry, provider) && matchesQuery(entry, query));
}

export function hasActiveFilters({ query, provider }: LeaderboardFilters): boolean {
  return query.trim() !== '' || provider !== ALL_PROVIDERS;
}
