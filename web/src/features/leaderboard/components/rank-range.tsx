import type { LeaderboardEntry } from '../types';

/** "2–4" when the crowd board's intervals allow more than one rank, else null. */
export function rankRangeLabel(entry: LeaderboardEntry): string | null {
  const crowd = entry.crowd;
  if (crowd === null || crowd.rankLow === null || crowd.rankHigh === null) return null;
  if (crowd.rankLow === crowd.rankHigh) return null;
  return `${crowd.rankLow}–${crowd.rankHigh}`;
}

/** True for a rated crowd-board model whose votes cannot yet support a rank claim. */
export function lacksRankClaim(entry: LeaderboardEntry): boolean {
  return entry.crowd !== null && !entry.provisional && entry.crowd.rank === null;
}

/**
 * Under the rank number on the crowd board: the ranks the 95% intervals still allow ("2–4"), or,
 * for a rated model with too few votes or too wide an interval, a note that the order is by rating
 * only. Nothing on the classic board.
 */
export function RankRange({ entry, className }: { entry: LeaderboardEntry; className?: string }) {
  const range = rankRangeLabel(entry);
  if (range !== null) {
    return (
      <span
        data-rank-range={range}
        className={className}
        title={`The intervals allow any rank from ${entry.crowd?.rankLow} to ${entry.crowd?.rankHigh}`}
      >
        <span aria-hidden="true" className="numeric text-label text-muted">
          {range}
        </span>
        <span className="sr-only">
          , could rank anywhere from {entry.crowd?.rankLow} to {entry.crowd?.rankHigh}
        </span>
      </span>
    );
  }
  if (lacksRankClaim(entry)) {
    return (
      <span
        data-rank-claim="none"
        className={className}
        title="Not enough votes, or an interval too wide, to claim a rank: ordered by rating"
      >
        <span aria-hidden="true" className="text-label text-muted">
          by rating
        </span>
        <span className="sr-only">
          , no rank claimed yet: too few votes or an interval that is too wide
        </span>
      </span>
    );
  }
  return null;
}
