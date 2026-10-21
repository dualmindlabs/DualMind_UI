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
    expect(stats.models).toBe(rows.length);
    expect(stats.battles).toBe(Math.round(responses / 2));
    expect(stats.votes).toBe(Math.round(outcomes / 2));
    expect(stats.providers).toEqual(['Cloudflare', 'Groq', 'Google']);
  });

  it('keeps the board order: best rank first, shared ranks in the API order', () => {
    const stats = toLiveStats(toLeaderboard(recorded('model-stats.recorded.json')));
    expect(stats.ranked.map(model => model.rank)).toEqual([1, 2, 9, 16, 18, 18, 36]);
    expect(stats.ranked[0]).toMatchObject({
      name: 'llama-3.3-70b-instruct-fp8-fast',
      providerLabel: 'Cloudflare',
      elo: 1150,
      battles: 96,
    });
  });

  it('reads the full recorded board used by the end-to-end tests', () => {
    const stats = toLiveStats(toLeaderboard(recorded('model-stats.board.recorded.json')));
    expect(stats.models).toBe(53);
    expect(stats.ranked.slice(0, 5).map(model => model.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(stats.votes).toBeGreaterThan(0);
  });

  it('handles an empty board without inventing anything', () => {
    expect(toLiveStats(toLeaderboard([]))).toMatchObject({
      votes: 0,
      models: 0,
      providers: [],
      ranked: [],
    });
  });
});
