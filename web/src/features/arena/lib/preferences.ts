/** localStorage keys of the arena's own preferences (the model choices use the legacy keys). */
export const ARENA_PREFERENCE_KEYS = {
  /** The mode for the next battle: `battle`, `side` or `direct`. */
  mode: 'dm.arena.mode',
  /** `collapsed` while the history panel is a rail on wide screens. */
  sidebar: 'dm.arena.sidebar',
  /** `off` turns the single-key shortcuts off (WCAG 2.1.4). */
  shortcuts: 'dm.arena.shortcuts',
} as const;

/** Tailwind's `lg`: the history is a panel from here, a drawer below. */
export const WIDE_QUERY = '(min-width: 1024px)';
