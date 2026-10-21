// Public API of the arena feature: the signed-in arena at `/` (slices S8 and S9), loaded lazily,
// its loading frame, the hook that decides between the landing page and the arena, and the
// read-only transcript the share page renders (slice S11). The settings page (slice S12) reads
// and writes the same preferences (mode, send key, single-key shortcuts), lists the keyboard
// map, exports threads with the same turn rules, and shows the account menu.
export { AccountMenu } from './components/account-menu';
export { ArenaBoot } from './components/arena-boot';
export { LazyArenaApp } from './components/lazy-arena-app';
export { ThreadTranscript, type ThreadTranscriptProps } from './components/thread-transcript';
export { type HomeView, useHomeView } from './hooks/use-home-view';
export { useStoredValue } from './hooks/use-stored-value';
export { ARENA_MODES, type ArenaMode, isArenaMode, MODE_DETAILS, modeFromThread } from './lib/modes';
export { ARENA_PREFERENCE_KEYS, type SendKey, sendKeyFrom } from './lib/preferences';
export { SHORTCUT_GROUPS, type ShortcutEntry, type ShortcutGroup } from './lib/shortcuts';
export { formatDuration, toTurns, type TurnData, VOTE_LABELS } from './lib/turns';
