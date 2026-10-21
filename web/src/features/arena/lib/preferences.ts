/** localStorage keys of the arena's own preferences (the model choices use the legacy keys). */
export const ARENA_PREFERENCE_KEYS = {
  /** The mode for the next battle: `battle`, `side` or `direct`. */
  mode: 'dm.arena.mode',
  /** `collapsed` while the history panel is a rail on wide screens. */
  sidebar: 'dm.arena.sidebar',
  /** `off` turns the single-key shortcuts off (WCAG 2.1.4). */
  shortcuts: 'dm.arena.shortcuts',
  /** `mod-enter`: only Ctrl/Cmd+Enter sends and Enter adds a line. Unset: Enter sends. */
  send: 'dm.arena.send',
} as const;

/** Which key sends the prompt (set on /settings/). */
export type SendKey = 'enter' | 'mod-enter';

export function sendKeyFrom(stored: string | null): SendKey {
  return stored === 'mod-enter' ? 'mod-enter' : 'enter';
}

/** Tailwind's `lg`: the history is a panel from here, a drawer below. */
export const WIDE_QUERY = '(min-width: 1024px)';
