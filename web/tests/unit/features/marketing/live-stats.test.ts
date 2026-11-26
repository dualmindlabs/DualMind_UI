import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { toLeaderboard } from '@/features/leaderboard';
import { toLiveStats } from '@/features/marketing/lib/live-stats';
import type { ModelStat } from '@/lib/api';
import { leaderboardSchema } from '@/lib/api/schemas/leaderboard';

const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/api',
);
const recorded = (name: string): ModelStat[] =>
  leaderboardSchema.parse(JSON.parse(readFileSync(path.join(fixtures, name), 'utf8')));

describe('live stats from the public leaderboard', () => {
  it('derives battles, votes, models and providers from the recorded response', () => {
    const rows = recorded('model-stats.recorded.json');
    const stats = toLiveStats(toLeaderboard(rows));
    const responses = rows.reduce((sum, row) => sum + row.totalResponses, 0);
    const outcomes = rows.reduce(
      (sum, row) => sum + row.totalWins + row.totalLosses + row.totalTies,
      0,
    );
    // Only the two Google models are in blind battles: four Cloudflare models are pick-only and
    // Compound Mini is retired. Battles and votes stay whole-board facts.
    expect(stats.models).toBe(2);
    expect(stats.battles).toBe(Math.round(responses / 2));
    expect(stats.votes).toBe(Math.round(outcomes / 2));
    expect(stats.providers).toEqual(['Google AI']);
  });

  it('keeps the board order: best rank first, shared ranks in the API order', () => {
    const stats = toLiveStats(toLeaderboard(recorded('model-stats.recorded.json')));
    expect(stats.ranked.map(model => model.rank)).toEqual([1, 2]);
    expect(stats.top.map(model => model.rank)).toEqual([1, 2]);
    expect(stats.ranked[1]).toMatchObject({
      name: 'Gemma 3 1B IT',
      platformLabel: 'Google AI',
      elo: 1000,
      battles: 8,
    });
  });

  it('reads the full recorded board used by the end-to-end tests', () => {
    const stats = toLiveStats(toLeaderboard(recorded('model-stats.board.recorded.json')));
    // 10 of the 53 models are in blind battles: the rest are pick-only (Cloudflare), retired or
    // not chat models.
    expect(stats.models).toBe(10);
    expect(stats.ranked.slice(0, 5).map(model => model.rank)).toEqual([1, 2, 3, 3, 5]);
    expect(stats.ranked.every(model => model.availability === 'blind')).toBe(true);
    // The top five never includes a model that is not yet rated.
    expect(stats.top).toHaveLength(8);
    expect(stats.top.some(model => model.provisional)).toBe(false);
    expect(stats.votes).toBeGreaterThan(0);
  });

  it('handles an empty board without inventing anything', () => {
    expect(toLiveStats(toLeaderboard([]))).toMatchObject({
      votes: 0,
      models: 0,
      providers: [],
      ranked: [],
      top: [],
    });
  });
});
