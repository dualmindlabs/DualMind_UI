/**
 * The arena's one-time coach mark (audit P2-6): a short note on the empty Battle screen that says
 * model names stay hidden until the visitor votes. Whether it was dismissed lives in localStorage,
 * and every access is guarded: blocked or full storage means the note simply shows each visit,
 * never an error.
 */
export const REVEAL_COACH_KEY = 'dm.arena.coach.reveal.v1';

export function isRevealCoachDismissed(
  storage: Pick<Storage, 'getItem'> | null = safeStorage(),
): boolean {
  try {
    return storage?.getItem(REVEAL_COACH_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissRevealCoach(storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(REVEAL_COACH_KEY, '1');
  } catch {
    // Blocked or full storage: the note comes back next visit, which is harmless.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
