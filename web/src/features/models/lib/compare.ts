/**
 * Head-to-head maths for the models directory. Elo says how likely each model is to win a single
 * battle against the other: expected score = 1 / (1 + 10^((other - own) / 400)). It is a
 * forecast from the current ratings, not a measured record.
 */

export interface HeadToHead {
  /** Chance that the first model wins a battle against the second, 0 to 1. */
  first: number;
  /** Chance that the second model wins, 0 to 1 (`1 - first`). */
  second: number;
  /** First rating minus second rating. */
  gap: number;
}

export function expectedScore(own: number, other: number): number {
  return 1 / (1 + 10 ** ((other - own) / 400));
}

export function headToHead(firstElo: number, secondElo: number): HeadToHead {
  const first = expectedScore(firstElo, secondElo);
  return { first, second: 1 - first, gap: firstElo - secondElo };
}

/** Whole-number percentage of a 0-1 chance, kept inside 1-99 so a forecast never reads as certain. */
export function chancePercent(chance: number): number {
  return Math.min(99, Math.max(1, Math.round(chance * 100)));
}

/**
 * Pin or unpin a model in a two-slot comparison. A third pin replaces the oldest, so the pair
 * always reads "last two you picked". The first slot is Mind A (cyan), the second Mind B.
 */
export function togglePinned(pinned: readonly string[], id: string): string[] {
  if (pinned.includes(id)) return pinned.filter(item => item !== id);
  return [...pinned.slice(-1), id];
}
