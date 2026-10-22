/**
 * The leaderboard feature: the /leaderboard/ page, and the pieces other pages share (the models
 * directory, the landing page's preview): the board query, the model details sheet, badges,
 * controls, and formatters for Elo, percentages and counts.
 */

// Pages
export { LeaderboardPage } from './components/leaderboard-page';

// Shared components
export { BoardControls, type BoardControlsProps } from './components/board-controls';
export { BoardEmpty, BoardError, BoardNoMatch, BoardSkeleton } from './components/board-state';
export { BoardStatus, type BoardStatusProps } from './components/board-status';
export { EloBar, type EloBarProps } from './components/elo-bar';
export { ModelDetails, type ModelDetailsProps } from './components/model-details';
export { ProviderBadge, type ProviderBadgeProps } from './components/provider-badge';
export { RankNumber, type RankNumberProps } from './components/rank-number';
export { SortToggle, type SortToggleProps } from './components/sort-toggle';
export { UnratedBadge } from './components/unrated-badge';

// Hooks
export { type BoardView, useBoardView } from './hooks/use-board-view';
export { type LeaderboardQueryResult, useLeaderboard } from './hooks/use-leaderboard';
export { TABLE_QUERY, useMediaQuery } from './hooks/use-media-query';
export { useModelCommands } from './hooks/use-model-commands';
export { type ModelDetailsState, useModelDetails } from './hooks/use-model-details';

// Data rules and formatting
export {
  ALL_PROVIDERS,
  ARENA_HREF,
  ELO_BAR_FLOOR,
  PODIUM_SIZE,
  PROVISIONAL_BATTLES,
  RATINGS_HELP_HREF,
  REFRESH_INTERVAL_MS,
} from './lib/constants';
export {
  byRank,
  eloShare,
  isProvisional,
  isRated,
  providerOptions,
  summarize,
  toLeaderboard,
  toLeaderboardEntries,
} from './lib/entries';
export {
  EMPTY_FILTERS,
  filterEntries,
  hasActiveFilters,
  matchesProvider,
  matchesQuery,
  normalizeSearch,
} from './lib/filter';
export {
  documentLocale,
  formatClock,
  formatClockWithZone,
  formatCount,
  formatElo,
  formatEloDelta,
  formatOrdinal,
  formatPercent,
  formatRank,
  formatZone,
  pluralize,
  providerLabel,
} from './lib/format';
export { ariaSort, DEFAULT_SORT, nextSort, SORT_COLUMNS, sortEntries } from './lib/sort';
export type {
  Leaderboard,
  LeaderboardEntry,
  LeaderboardFilters,
  LeaderboardSummary,
  ProviderOption,
  RatedEntry,
  SortDirection,
  SortKey,
  SortState,
} from './types';
