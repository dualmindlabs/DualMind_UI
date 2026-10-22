import { getUserMessage, isApiErrorKind } from '@/lib/api';

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
