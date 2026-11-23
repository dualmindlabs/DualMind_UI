import type { CrowdStat, LeaderboardData } from '@/lib/api';

/** One model on the board, normalised from a `model-stats` row (lib/entries.ts). */
export interface LeaderboardEntry {
  /** `modelId` from the API. */
  id: string;
  /** What people read: a human title ("Llama 3.3 70B Instruct (FP8, fast)", lib/models). */
  name: string;
  /** The raw model id (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`): tooltips and the details. */
  modelName: string;
  /** Key of the model's maker (`meta`, `deepseek`, `qwen`...), the provider filter's value. */
  provider: string;
  /** The maker's name for people ("Meta", "Alibaba Qwen"). */
  providerLabel: string;
  /** The serving platform's key from the API (`cloudflare`, `groq`, `google`...). */
  platform: string;
  /** The serving platform's name for people ("Cloudflare Workers AI"). */
  platformLabel: string;
  /** "via Cloudflare Workers AI", or null when the maker serves its own model. */
  servedBy: string | null;
  /**
   * Rank among the rated models (ties share a rank), or null: not yet rated (`provisional`), or,
   * on the crowd board, rated but without a rank claim (too few votes, interval too wide).
   * Classic board: recomputed here, the API ranks every model, rated or not. Crowd board: as sent.
   */
  rank: number | null;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  /** Battles the model took part in (`totalResponses`). */
  battles: number;
  /** Wins divided by battles, as a percentage (ties count as non-wins, like the API). */
  winRate: number;
  /**
   * Fewer than PROVISIONAL_BATTLES battles: the rating can still move a lot, so the model is
   * listed as "Not yet rated" without a rank.
   */
  provisional: boolean;
  /** Where the rating sits between the lowest and the highest on the board, 0 to 1. */
  eloShare: number;
  /**
   * The crowd board's facts for this model (measured 95% interval, rank range, countable votes),
   * or null on the classic board, where the range is estimated from the record.
   */
  crowd: CrowdStat | null;
}

/** A model that has a rank: enough battles to be rated. */
export type RatedEntry = LeaderboardEntry & { rank: number };

export interface ProviderOption {
  value: string;
  label: string;
  count: number;
}

/** Board-wide numbers for the stats strip. */
export interface LeaderboardSummary {
  /** Every model on the board, rated or not. */
  models: number;
  /** Models that are rated: not provisional (a fitted rating on the crowd board). */
  rated: number;
  /** Rated models that carry a rank number (on the crowd board, fewer than `rated` can). */
  ranked: number;
  /** Half the sum of every model's battles: each battle puts two models side by side. */
  battles: number;
  /** Distinct model makers. */
  providers: number;
  /** Models not yet rated (fewer than PROVISIONAL_BATTLES battles). */
  provisional: number;
  topElo: number;
  bottomElo: number;
  /** Mean win rate across the board, in percent. */
  averageWinRate: number;
}

export interface Leaderboard {
  /** Ranked models in rank order, then rated ones without a rank claim, then those not yet rated. */
  entries: LeaderboardEntry[];
  /** The ranked models, in rank order: the podium, the ranking and the landing top five. */
  rated: RatedEntry[];
  /** The models not yet rated (provisional), best rating first. They have no rank. */
  unrated: LeaderboardEntry[];
  summary: LeaderboardSummary;
  providers: ProviderOption[];
  /** Which route answered: `crowd` is the measured board, the others the classic one. */
  source: LeaderboardData['source'];
  /** Crowd board only: method id, votes the fit used, and whether it is a stale copy. */
  crowd: LeaderboardData['crowd'] | null;
  /** The category this board belongs to; null for the overall board, or when it fell back to it. */
  category: string | null;
  /** The crowd board is down or failed and the classic board is shown instead; null otherwise. */
  fallback: LeaderboardData['fallback'] | null;
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
