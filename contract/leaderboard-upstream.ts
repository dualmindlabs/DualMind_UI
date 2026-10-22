// The v1 `GET /api/arena/model-stats` body as the Worker reads it (BE-4, section 6.4). Tolerant on
// purpose: v1 sends every field twice (camelCase and snake_case) plus aliases, so each value is
// read from its canonical name first and from the aliases only as a fallback. Worker only.

import { z } from 'zod';

/** One upstream row: any object. Fields are picked with the readers below, never trusted. */
export const upstreamRowSchema = z.looseObject({});

/** The list is `{ success, items: [...] }`; a bare array is accepted too. */
export const upstreamResponseSchema = z.union([z.array(z.unknown()), z.looseObject({ items: z.array(z.unknown()) })]);

export const UPSTREAM_FIELDS = {
  modelId: ['modelId', 'model_id', 'id'],
  modelName: ['modelName', 'model_name', 'name'],
  displayName: ['displayName', 'display_name'],
  providerName: ['providerName', 'provider_name', 'provider'],
  eloScore: ['eloScore', 'elo_rating', 'elo'],
  eloRank: ['eloRank', 'elo_rank', 'rank'],
  totalWins: ['totalWins', 'total_wins', 'wins'],
  totalLosses: ['totalLosses', 'total_losses', 'losses'],
  totalTies: ['totalTies', 'total_ties', 'ties'],
  totalResponses: ['totalResponses', 'total_responses', 'total_matches', 'matches'],
  winRate: ['winRate', 'win_rate'],
} as const;

type Row = Record<string, unknown>;

/** The first present (not null or undefined) value among the names. */
function firstPresent(row: Row, names: readonly string[]): unknown {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

export function readText(row: Row, field: keyof typeof UPSTREAM_FIELDS): string | undefined {
  const value = firstPresent(row, UPSTREAM_FIELDS[field]);
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function readNumber(row: Row, field: keyof typeof UPSTREAM_FIELDS): number | undefined {
  const value = firstPresent(row, UPSTREAM_FIELDS[field]);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readCount(row: Row, field: keyof typeof UPSTREAM_FIELDS): number | undefined {
  const value = readNumber(row, field);
  return value !== undefined && Number.isInteger(value) && value >= 0 ? value : undefined;
}
