import type { LeaderboardEntry } from '../types';

/** z for a 95% interval. */
const Z = 1.96;
/** The widest margin drawn, in Elo points: a model with almost no battles is "anywhere". */
export const MAX_ELO_MARGIN = 400;

/**
 * The Wilson score interval for a share of wins in `n` trials (95%). Unlike the plain normal
 * interval it behaves at the edges and for small samples, which is where most of the board is.
 */
export function wilsonInterval(score: number, n: number): { low: number; high: number } {
  if (!(n > 0)) return { low: 0, high: 1 };
  const p = Math.min(1, Math.max(0, score));
  const z2 = Z * Z;
  const denominator = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denominator;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** The Elo gap that an expected score implies (the logistic Elo curve, 400 points per decade). */
function eloGap(score: number): number {
  const p = Math.min(0.99, Math.max(0.01, score));
  return 400 * Math.log10(p / (1 - p));
}

/**
 * An estimated 95% margin on a rating, in Elo points, from the model's own record: the Wilson
 * interval of its score (a win is 1, a tie a half) turned into rating points. The API does not
 * report a confidence interval yet (backend roadmap BE-9), so this is an estimate that narrows as
 * battles accumulate; it is labelled as one everywhere it shows.
 */
export function eloMargin(entry: Pick<LeaderboardEntry, 'wins' | 'losses' | 'ties' | 'battles'>) {
  const recorded = entry.wins + entry.losses + entry.ties;
  const n = recorded > 0 ? recorded : entry.battles;
  if (!(n > 0)) return MAX_ELO_MARGIN;
  const score = (entry.wins + entry.ties / 2) / n;
  const { low, high } = wilsonInterval(score, n);
  const margin = (eloGap(high) - eloGap(low)) / 2;
  return Math.min(MAX_ELO_MARGIN, Math.max(4, margin));
}

/** The rating and its estimated range: `[low, high]` around `elo`. */
export function ratingRange(entry: LeaderboardEntry) {
  const margin = eloMargin(entry);
  return { elo: entry.elo, margin, low: entry.elo - margin, high: entry.elo + margin };
}

export interface RangeDomain {
  min: number;
  max: number;
}

/**
 * The scale every range bar on a page shares, so bars compare: the span of the ratings themselves,
 * with a margin, rounded to tens. A range wider than the scale runs off its edge (the bar clips
 * it), which is the honest picture of a rating that is still anywhere: it does not flatten the
 * bars of everyone else.
 */
export function rangeDomain(entries: readonly LeaderboardEntry[]): RangeDomain {
  if (entries.length === 0) return { min: 0, max: 1 };
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    min = Math.min(min, entry.elo);
    max = Math.max(max, entry.elo);
  }
  const pad = 70;
  return { min: Math.floor((min - pad) / 10) * 10, max: Math.ceil((max + pad) / 10) * 10 };
}
