import { describe, expect, it } from 'vitest';

import {
  ELO_BAR_FLOOR,
  eloShare,
  isProvisional,
  isRated,
  providerOptions,
  PROVISIONAL_BATTLES,
  summarize,
  toLeaderboard,
  toLeaderboardEntries,
} from '@/features/leaderboard';

import { fullBoard, names, sampleBoard, sampleStats } from './helpers';

describe('the provisional rule', () => {
  it('is fewer than 100 battles', () => {
    expect(PROVISIONAL_BATTLES).toBe(100);
    expect(isProvisional(0)).toBe(true);
    expect(isProvisional(99)).toBe(true);
    expect(isProvisional(100)).toBe(false);
    expect(isProvisional(291)).toBe(false);
  });

  it('puts the models below the threshold in a separate group, without a rank', () => {
    // The API ranks a 96-battle model first; the board does not.
    const leader = fullBoard.entries[0];
    expect(leader?.rank).toBe(1);
    expect(leader?.battles).toBe(250);
    expect(leader?.provisional).toBe(false);
    expect(fullBoard.entries.filter(entry => entry.provisional)).toHaveLength(17);
    expect(fullBoard.summary.provisional).toBe(17);
    expect(fullBoard.summary.rated).toBe(36);
    expect(fullBoard.rated).toHaveLength(36);
    expect(fullBoard.unrated).toHaveLength(17);
    expect(fullBoard.unrated.every(entry => entry.rank === null && entry.provisional)).toBe(true);
    expect(fullBoard.rated.every(entry => isRated(entry) && !entry.provisional)).toBe(true);
    // Rated models first, then the rest.
    expect(fullBoard.entries.slice(0, 36)).toEqual(fullBoard.rated);
    expect(fullBoard.entries.slice(36)).toEqual(fullBoard.unrated);
  });

  it('recomputes ranks among the rated models: equal ratings share a rank, the next one skips', () => {
    const ranks = fullBoard.rated.map(entry => entry.rank);
    expect(ranks.slice(0, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ranks.at(-1)).toBeLessThanOrEqual(36);
    // The two 8B builds at 1025 share a rank.
    const shared = fullBoard.rated.filter(entry => Math.round(entry.elo) === 1025);
    expect(new Set(shared.map(entry => entry.rank)).size).toBe(1);
    expect(shared).toHaveLength(2);
  });
});

describe('toLeaderboardEntries (normalised model-stats to board entries)', () => {
  const entries = sampleBoard.entries;

  it('lists the rated models by rank, then the rest by rating, with the API numbers', () => {
    expect(entries.map(entry => entry.rank)).toEqual([1, 2, 3, 3, null, null, null]);
    expect(names(entries).slice(0, 2)).toEqual(['Llama 3.1 70B Instruct', 'Compound Mini']);
    expect(entries[0]).toMatchObject({
      id: '2f2219b0-d1ce-402d-b6d0-29d1e67ef04b',
      name: 'Llama 3.1 70B Instruct',
      modelName: '@cf/meta/llama-3.1-70b-instruct',
      provider: 'meta',
      providerLabel: 'Meta',
      platform: 'cloudflare',
      platformLabel: 'Cloudflare Workers AI',
      servedBy: 'via Cloudflare Workers AI',
      elo: 1140,
      battles: 250,
      provisional: false,
    });
    // The API's own leader, with 96 battles, comes first among the unrated.
    expect(entries[4]).toMatchObject({
      name: 'Llama 3.3 70B Instruct (FP8, fast)',
      elo: 1150,
      wins: 62,
      losses: 27,
      ties: 9,
      battles: 96,
      winRate: 64.58,
      rank: null,
      provisional: true,
    });
    // A model that serves itself has no "via" note.
    expect(entries.find(entry => entry.name === 'Compound Mini')?.servedBy).toBeNull();
  });

  it('sorts rows the API sent out of order and breaks shared ranks by rating, then name', () => {
    const shuffled = [...sampleStats].reverse();
    expect(names(toLeaderboardEntries(shuffled))).toEqual(names(entries));
    const shared = entries.filter(entry => entry.rank === 3);
    expect(names(shared)).toEqual(['Hermes 2 Pro Mistral 7B', 'Llama 3.2 11B Vision Instruct']);
  });

  it('places the Elo bar between the floor and full width', () => {
    expect(entries[0]?.eloShare).toBe(1);
    expect(entries.at(-1)?.eloShare).toBe(ELO_BAR_FLOOR);
    const shares = entries.filter(isRated).map(entry => entry.eloShare);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    expect(eloShare(1000, 1000, 1000)).toBe(1);
    expect(eloShare(1075, 1000, 1150)).toBeCloseTo(ELO_BAR_FLOOR + (1 - ELO_BAR_FLOOR) / 2);
    expect(eloShare(2000, 1000, 1150)).toBe(1);
  });

  it('handles an empty board', () => {
    expect(toLeaderboardEntries([])).toEqual([]);
    expect(toLeaderboard([])).toEqual({
      entries: [],
      rated: [],
      unrated: [],
      providers: [],
      summary: {
        models: 0,
        rated: 0,
        battles: 0,
        providers: 0,
        provisional: 0,
        topElo: 0,
        bottomElo: 0,
        averageWinRate: 0,
      },
    });
  });
});

describe('summarize', () => {
  it('counts models, battles (each has two models), makers and the rating range', () => {
    const summary = summarize(sampleBoard.entries);
    const appearances = sampleBoard.entries.reduce((sum, entry) => sum + entry.battles, 0);
    expect(summary).toMatchObject({
      models: 7,
      rated: 4,
      battles: Math.round(appearances / 2),
      providers: 4,
      topElo: 1150,
      bottomElo: 1000,
    });
    expect(summary.provisional).toBe(3);
  });

  it('matches the recorded 53-model board', () => {
    expect(fullBoard.summary).toMatchObject({
      models: 53,
      rated: 36,
      battles: 3576,
      providers: 15,
      topElo: 1150,
      bottomElo: 909,
    });
    expect(fullBoard.summary.averageWinRate).toBeGreaterThan(30);
    expect(fullBoard.summary.averageWinRate).toBeLessThan(50);
  });
});

describe('providerOptions', () => {
  it('lists every maker once, the largest first, then by name', () => {
    expect(providerOptions(fullBoard.entries)).toEqual([
      { value: 'meta', label: 'Meta', count: 19 },
      { value: 'google', label: 'Google', count: 13 },
      { value: 'qwen', label: 'Alibaba Qwen', count: 4 },
      { value: 'mistral', label: 'Mistral', count: 4 },
      { value: 'groq', label: 'Groq', count: 2 },
      { value: 'openai', label: 'OpenAI', count: 2 },
      { value: 'ai-singapore', label: 'AI Singapore', count: 1 },
      { value: 'deepseek', label: 'DeepSeek', count: 1 },
      { value: 'defog', label: 'Defog', count: 1 },
      { value: 'ibm', label: 'IBM', count: 1 },
      { value: 'microsoft', label: 'Microsoft', count: 1 },
      { value: 'moonshot', label: 'Moonshot AI', count: 1 },
      { value: 'nous', label: 'Nous Research', count: 1 },
      { value: 'nvidia', label: 'NVIDIA', count: 1 },
      { value: 'zai', label: 'Z.ai', count: 1 },
    ]);
  });
});
