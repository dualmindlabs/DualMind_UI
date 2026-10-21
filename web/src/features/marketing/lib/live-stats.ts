import type { Leaderboard, LeaderboardEntry, RatedEntry } from '@/features/leaderboard';

/**
 * The landing page's live numbers, derived from the board the leaderboard feature builds from the
 * public `GET /api/arena/model-stats` (no account needed). Nothing here is typed in by hand: when
 * the call fails, the page says so instead of showing numbers (components/live-strip.tsx).
 *
 * - battles: the board's own total (every battle puts two models side by side, so half the sum of
 *   every model's battles).
 * - votes: a vote gives one model a win and the other a loss, or a tie to both (both-bad votes
 *   count as a loss for both), so votes = (wins + losses + ties) / 2. Follow-up turns keep the
 *   same pair and can each be voted on, so votes can be a little higher than battles.
 */
export interface LiveStats {
  battles: number;
  votes: number;
  models: number;
  /** Serving platforms ("Cloudflare Workers AI"), in board order of their best model. */
  providers: string[];
  /** Every model: the rated ones best rank first, then the ones not yet rated. */
  ranked: LeaderboardEntry[];
  /** The rated models only, best rank first: the leader and the top five come from here. */
  top: RatedEntry[];
}

export function toLiveStats(board: Leaderboard): LiveStats {
  const outcomes = board.entries.reduce(
    (sum, entry) => sum + entry.wins + entry.losses + entry.ties,
    0,
  );
  return {
    battles: board.summary.battles,
    votes: Math.round(outcomes / 2),
    models: board.summary.models,
    providers: [...new Set(board.entries.map(entry => entry.platformLabel))],
    ranked: board.entries,
    top: board.rated,
  };
}
