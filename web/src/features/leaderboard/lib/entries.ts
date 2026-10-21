import type { ModelStat } from '@/lib/api';

import type { Leaderboard, LeaderboardEntry, LeaderboardSummary, ProviderOption } from '../types';
import { ELO_BAR_FLOOR, PROVISIONAL_BATTLES } from './constants';
import { providerLabel } from './format';

/** The provisional rule (lib/constants.ts): fewer than PROVISIONAL_BATTLES battles. */
export function isProvisional(battles: number): boolean {
  return battles < PROVISIONAL_BATTLES;
}

/**
 * Where a rating sits on the board, for the inline Elo bar: ELO_BAR_FLOOR for the lowest rating,
 * 1 for the highest, linear in between. A board where every rating is equal gives full bars.
 */
export function eloShare(elo: number, lowest: number, highest: number): number {
  const span = highest - lowest;
  if (!(span > 0)) return 1;
  const share = (elo - lowest) / span;
  return ELO_BAR_FLOOR + (1 - ELO_BAR_FLOOR) * Math.min(1, Math.max(0, share));
}

/** Rank order: the API's rank, then the higher rating, then the name (stable for equal ranks). */
export function byRank(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return a.rank - b.rank || b.elo - a.elo || a.name.localeCompare(b.name, 'en');
}

/**
 * Turns the normalised `model-stats` rows (camelCase only, see lib/api/schemas/leaderboard.ts)
 * into board entries: provider names, the provisional flag and the Elo bar share, in rank order.
 * Numbers are passed through as the API reports them; nothing is recomputed except the share.
 */
export function toLeaderboardEntries(stats: readonly ModelStat[]): LeaderboardEntry[] {
  if (stats.length === 0) return [];
  const ratings = stats.map(stat => stat.eloScore);
  const lowest = Math.min(...ratings);
  const highest = Math.max(...ratings);

  return stats
    .map(
      (stat): LeaderboardEntry => ({
        id: stat.modelId,
        name: stat.displayName,
        modelName: stat.modelName,
        provider: stat.providerName.trim().toLowerCase(),
        providerLabel: providerLabel(stat.providerName),
        rank: stat.eloRank,
        elo: stat.eloScore,
        wins: stat.totalWins,
        losses: stat.totalLosses,
        ties: stat.totalTies,
        battles: stat.totalResponses,
        winRate: stat.winRate,
        provisional: isProvisional(stat.totalResponses),
        eloShare: eloShare(stat.eloScore, lowest, highest),
      }),
    )
    .sort(byRank);
}

/** Board-wide numbers for the stats strip. */
export function summarize(entries: readonly LeaderboardEntry[]): LeaderboardSummary {
  const appearances = entries.reduce((sum, entry) => sum + entry.battles, 0);
  const ratings = entries.map(entry => entry.elo);
  return {
    models: entries.length,
    battles: Math.round(appearances / 2),
    providers: new Set(entries.map(entry => entry.provider)).size,
    provisional: entries.filter(entry => entry.provisional).length,
    topElo: ratings.length > 0 ? Math.max(...ratings) : 0,
    bottomElo: ratings.length > 0 ? Math.min(...ratings) : 0,
    averageWinRate:
      entries.length > 0
        ? entries.reduce((sum, entry) => sum + entry.winRate, 0) / entries.length
        : 0,
  };
}

/** The provider filter's options: every provider on the board, the largest first. */
export function providerOptions(entries: readonly LeaderboardEntry[]): ProviderOption[] {
  const counts = new Map<string, ProviderOption>();
  for (const entry of entries) {
    const option = counts.get(entry.provider);
    if (option) option.count += 1;
    else counts.set(entry.provider, { value: entry.provider, label: entry.providerLabel, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'en'),
  );
}

/** Everything the pages need from one `model-stats` response (TanStack Query's `select`). */
export function toLeaderboard(stats: readonly ModelStat[]): Leaderboard {
  const entries = toLeaderboardEntries(stats);
  return { entries, summary: summarize(entries), providers: providerOptions(entries) };
}
