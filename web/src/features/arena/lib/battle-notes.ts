import { getUserMessage, isApiError, isApiErrorKind } from '@/lib/api';

import type { Unrated } from './battle-machine';

/** One calm line for a battle that cannot be voted on. It names no model (blind integrity). */
export const UNRATED_NOTES: Readonly<Record<Unrated, string>> = {
  fallback: 'One model was unavailable, so a backup answered. This battle is not rated.',
  unknown: 'This battle is not rated, so there is nothing to vote on.',
  closed: 'This battle can no longer be voted on.',
};

export const FORBIDDEN_THREAD_MESSAGE = 'This conversation belongs to another account.';

/** How a failed vote is handled: `closed` means stop (403, 404), `retry` leaves the bar open. */
export function voteFailure(error: unknown): { closed: boolean; message: string } {
  if (isApiErrorKind(error, 'forbidden', 'not_found')) {
    return { closed: true, message: UNRATED_NOTES.closed };
  }
  return { closed: false, message: getUserMessage(error) };
}

const CROSS_EXAMINE_MESSAGES: Readonly<Record<string, string>> = {
  FEATURE_DISABLED: 'Cross-examine is not available right now.',
  VOTE_FIRST: 'Cast your first vote before cross-examining.',
  CRITIQUE_FIRST: 'Ask for the critique before the second vote.',
  CRITIQUE_IN_PROGRESS: 'The critique is already being written. Try again in a few seconds.',
  CRITIQUE_RATE_LIMITED: 'You have asked for a lot of critiques. Try again later.',
  CRITIQUE_UNAVAILABLE: 'The models could not write a critique. Try again in a moment.',
  ALREADY_VOTED_ROUND2: 'You already cast a second vote on this battle.',
  COMPARISON_NOT_OWNED: 'You can only cross-examine your own battles.',
};

/** What to say when a cross-examine call fails, by the backend's code (backend PR 71). */
export function crossExamineMessage(error: unknown): string {
  if (isApiError(error)) {
    const known = CROSS_EXAMINE_MESSAGES[error.code];
    if (known !== undefined) return known;
  }
  return getUserMessage(error);
}
