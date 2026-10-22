import type { VoteChoice } from '@/lib/api';

/** How far one vote can move a rating at most (a standard Elo step for a young board). */
export const ELO_K = 24;

export interface EloMovement {
  /** Rating points Mind A gains (negative: loses). Mind B moves by the opposite amount. */
  a: number;
  b: number;
  /** The winner was the lower rated model (an upset), the favourite won, or nobody won. */
  kind: 'upset' | 'expected' | 'even' | 'none';
}

/**
 * The movement one vote would cause under a plain Elo step, from the two ratings the board shows
 * now. It is a projection for the reveal, not the server's number: the board folds votes in on
 * its own schedule. "Both are bad" is a quality signal and moves nothing.
 */
export function projectElo(ratingA: number, ratingB: number, vote: VoteChoice): EloMovement {
  if (vote === 'both-bad') return { a: 0, b: 0, kind: 'none' };
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const scoreA = vote === 'left' ? 1 : vote === 'right' ? 0 : 0.5;
  const a = Math.round(ELO_K * (scoreA - expectedA));
  const kind =
    vote === 'tie'
      ? 'even'
      : (vote === 'left' ? ratingA < ratingB : ratingB < ratingA)
        ? 'upset'
        : 'expected';
  return { a, b: -a, kind };
}

/** The "why this matters" line under the ranking. */
export function whyItMatters(movement: EloMovement): string {
  switch (movement.kind) {
    case 'upset':
      return 'An upset: beating a higher rated model moves the board the most.';
    case 'expected':
      return 'The favourite won, so the ratings barely move. Surprises are what shape the board.';
    case 'even':
      return 'A tie pulls the two ratings toward each other.';
    default:
      return 'Both answers failed you, so no rating moves. It still tells us where models fall short.';
  }
}
