import type { ModelStat } from '@/lib/api';
import {
  modelMaker,
  platformLabel,
  resolveDisplayName,
  servedBy,
} from '@/lib/models/display-name';

import type {
  Leaderboard,
  LeaderboardEntry,
  LeaderboardSummary,
  ProviderOption,
  RatedEntry,
} from '../types';
import { ELO_BAR_FLOOR, PROVISIONAL_BATTLES } from './constants';

/** The provisional rule (lib/constants.ts): fewer than PROVISIONAL_BATTLES battles. */
export function isProvisional(battles: number): boolean {
  return battles < PROVISIONAL_BATTLES;
}

/** True for a model with a rank (enough battles to be rated). */
export function isRated(entry: LeaderboardEntry): entry is RatedEntry {
  return entry.rank !== null;
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

/**
 * Board order: rated models by rank, then the higher rating, then the name; models not yet rated
 * come after them, by rating, then battles, then name.
 */
export function byRank(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.rank !== null && b.rank !== null) {
    return a.rank - b.rank || b.elo - a.elo || a.name.localeCompare(b.name, 'en');
  }
  if (a.rank !== null) return -1;
  if (b.rank !== null) return 1;
  return b.elo - a.elo || b.battles - a.battles || a.name.localeCompare(b.name, 'en');
}

/**
 * Turns the normalised `model-stats` rows (camelCase only, see lib/api/schemas/leaderboard.ts)
 * into board entries: human names, makers, the provisional flag, the Elo bar share and the rank,
 * rated models first. Elo, wins and the like are passed through as the API reports them. Ranks
 * are recomputed among the rated models only (competition ranking: equal ratings share a rank,
 * the next rank skips), because the API also ranks models with a handful of battles.
 */
export function toLeaderboardEntries(stats: readonly ModelStat[]): LeaderboardEntry[] {
  if (stats.length === 0) return [];
  const ratedStats = stats.filter(stat => !isProvisional(stat.totalResponses));
  const scale = (ratedStats.length > 0 ? ratedStats : stats).map(stat => stat.eloScore);
  const lowest = Math.min(...scale);
  const highest = Math.max(...scale);
  const ratedElos = ratedStats.map(stat => stat.eloScore);

  return stats
    .map((stat): LeaderboardEntry => {
      const provisional = isProvisional(stat.totalResponses);
      const made = modelMaker(stat.modelName, stat.providerName);
      const platform = platformLabel(stat.providerName);
      return {
        id: stat.modelId,
        name: resolveDisplayName(stat.modelName, stat.displayName),
        modelName: stat.modelName,
        provider: made.key,
        providerLabel: made.label,
        platform: stat.providerName.trim().toLowerCase(),
        platformLabel: platform,
        servedBy: servedBy(made, platform),
        rank: provisional ? null : 1 + ratedElos.filter(elo => elo > stat.eloScore).length,
        elo: stat.eloScore,
        wins: stat.totalWins,
        losses: stat.totalLosses,
        ties: stat.totalTies,
        battles: stat.totalResponses,
        winRate: stat.winRate,
        provisional,
        eloShare: eloShare(stat.eloScore, lowest, highest),
      };
    })
    .sort(byRank);
}

/** Board-wide numbers for the stats strip. */
export function summarize(entries: readonly LeaderboardEntry[]): LeaderboardSummary {
  const appearances = entries.reduce((sum, entry) => sum + entry.battles, 0);
  const ratings = entries.map(entry => entry.elo);
  return {
    models: entries.length,
    rated: entries.filter(isRated).length,
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
    else
      counts.set(entry.provider, { value: entry.provider, label: entry.providerLabel, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'en'),
  );
}

/** Everything the pages need from one `model-stats` response (TanStack Query's `select`). */
export function toLeaderboard(stats: readonly ModelStat[]): Leaderboard {
  const entries = toLeaderboardEntries(stats);
  return {
    entries,
    rated: entries.filter(isRated),
    unrated: entries.filter(entry => !isRated(entry)),
    summary: summarize(entries),
    providers: providerOptions(entries),
  };
}
