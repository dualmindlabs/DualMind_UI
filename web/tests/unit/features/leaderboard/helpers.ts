import { type LeaderboardEntry, toLeaderboard } from '@/features/leaderboard';
import { leaderboardSchema } from '@/lib/api/schemas/leaderboard';

import board from '../../../fixtures/api/model-stats.board.recorded.json';
import sample from '../../../fixtures/api/model-stats.recorded.json';

/** The 7-row recorded sample (ranks 1, 2, 9, 16, 18, 18, 36), through the real schema. */
export const sampleStats = leaderboardSchema.parse(sample);
export const sampleBoard = toLeaderboard(sampleStats);

/** The full 53-model board recorded on 2026-10-21. */
export const fullBoard = toLeaderboard(leaderboardSchema.parse(board));

/** An entry with defaults, for rules that need specific numbers. */
export function entry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    id: 'id',
    name: 'Model',
    modelName: 'provider/model',
    provider: 'cloudflare',
    providerLabel: 'Cloudflare',
    rank: 1,
    elo: 1000,
    wins: 0,
    losses: 0,
    ties: 0,
    battles: 0,
    winRate: 0,
    provisional: true,
    eloShare: 1,
    ...overrides,
  };
}

export const names = (entries: readonly LeaderboardEntry[]) => entries.map(item => item.name);
