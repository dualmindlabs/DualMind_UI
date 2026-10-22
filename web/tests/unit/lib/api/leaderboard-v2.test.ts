import { PROVISIONAL_BELOW } from '@contract/leaderboard';
import { describe, expect, it } from 'vitest';

import { toLeaderboard } from '@/features/leaderboard';
import { createApiClient } from '@/lib/api';
import { leaderboardV2Schema } from '@/lib/api/schemas/leaderboard';

import v2Board from '../../../fixtures/api/leaderboard-v2.board.json';
import v2 from '../../../fixtures/api/leaderboard-v2.recorded.json';
import v1 from '../../../fixtures/api/model-stats.recorded.json';
import { jsonResponse, scriptedFetch } from './helpers';

const NO_RETRY = { retry: false } as const;

describe('GET /api/v2/leaderboard', () => {
  it('parses the camelCase body and keeps meta', () => {
    const data = leaderboardV2Schema.parse(v2);
    expect(data.source).toBe('v2');
    expect(data.items).toHaveLength(v2.items.length);
    expect(data.provisionalBelow).toBe(PROVISIONAL_BELOW);
    expect(data.generatedAt).toBe(v2.meta.generatedAt);
    expect(data.items[0]).toMatchObject({ eloScore: 1150, eloRank: 1, winRate: 64.58 });
  });

  it('carries the provisional flag from the server into the board', () => {
    const data = leaderboardV2Schema.parse(v2Board);
    const flagged = data.items.filter(item => item.provisional);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.every(item => item.totalResponses < PROVISIONAL_BELOW)).toBe(true);
    const board = toLeaderboard(data.items);
    expect(board.unrated).toHaveLength(flagged.length);
    expect(board.unrated.every(entry => entry.rank === null)).toBe(true);
    expect(board.rated.every(entry => !entry.provisional)).toBe(true);
  });

  it('rejects a body that breaks the contract', () => {
    expect(() => leaderboardV2Schema.parse({ items: [{ modelId: 'x' }], meta: {} })).toThrow();
  });

  it('is requested first, without a token', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(v2));
    const api = createApiClient({ fetch });
    const data = await api.getLeaderboard(NO_RETRY);
    expect(data.source).toBe('v2');
    expect(calls).toHaveLength(1);
    expect(new URL(calls[0]?.url ?? '').pathname).toBe('/api/v2/leaderboard');
    expect(calls[0]?.headers.has('authorization')).toBe(false);
  });
});

describe('v1 fallback (goes in the next release)', () => {
  it.each([404, 501])('reads /api/arena/model-stats when v2 answers %i', async status => {
    const { fetch, calls } = scriptedFetch(call =>
      new URL(call.url).pathname === '/api/v2/leaderboard'
        ? jsonResponse({ title: 'Not found', status }, { status })
        : jsonResponse(v1),
    );
    const data = await createApiClient({ fetch }).getLeaderboard(NO_RETRY);
    expect(calls.map(call => new URL(call.url).pathname)).toEqual([
      '/api/v2/leaderboard',
      '/api/arena/model-stats',
    ]);
    expect(data.source).toBe('v1');
    expect(data.generatedAt).toBeNull();
    expect(data.provisionalBelow).toBe(PROVISIONAL_BELOW);
    expect(data.items).toHaveLength(v1.items.length);
    expect(
      data.items.every(item => item.provisional === item.totalResponses < PROVISIONAL_BELOW),
    ).toBe(true);
  });

  it('does not fall back on other errors', async () => {
    const { fetch, calls } = scriptedFetch(
      jsonResponse({ title: 'Boom', status: 500 }, { status: 500 }),
    );
    await expect(createApiClient({ fetch }).getLeaderboard(NO_RETRY)).rejects.toMatchObject({
      status: 500,
    });
    expect(calls).toHaveLength(1);
  });
});
