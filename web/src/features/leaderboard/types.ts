/** One model on the board, normalised from a `model-stats` row (lib/entries.ts). */
export interface LeaderboardEntry {
  /** `modelId` from the API. */
  id: string;
  /** What people read: the API's display name. */
  name: string;
  /** The full model id the provider uses (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`). */
  modelName: string;
  /** Provider key from the API (`cloudflare`, `groq`, `google`...). */
  provider: string;
  /** The provider's name for people (`Cloudflare`). */
  providerLabel: string;
  /** Rank from the API; models with the same rating share a rank. */
  rank: number;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  /** Battles the model took part in (`totalResponses`). */
  battles: number;
  /** Wins divided by battles, as a percentage (ties count as non-wins, like the API). */
  winRate: number;
  /** Fewer than PROVISIONAL_BATTLES battles: the rating can still move a lot. */
  provisional: boolean;
  /** Where the rating sits between the lowest and the highest on the board, 0 to 1. */
  eloShare: number;
}

export interface ProviderOption {
  value: string;
  label: string;
  count: number;
}

/** Board-wide numbers for the stats strip. */
export interface LeaderboardSummary {
  models: number;
  /** Half the sum of every model's battles: each battle puts two models side by side. */
  battles: number;
  providers: number;
  provisional: number;
  topElo: number;
  bottomElo: number;
  /** Mean win rate across the board, in percent. */
  averageWinRate: number;
}

export interface Leaderboard {
  /** In rank order. */
  entries: LeaderboardEntry[];
  summary: LeaderboardSummary;
  providers: ProviderOption[];
}

export type SortKey = 'rank' | 'name' | 'provider' | 'elo' | 'winRate' | 'battles';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export interface LeaderboardFilters {
  query: string;
  /** A provider key, or ALL_PROVIDERS. */
  provider: string;
}
