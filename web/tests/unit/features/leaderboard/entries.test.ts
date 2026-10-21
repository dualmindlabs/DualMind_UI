import { describe, expect, it } from 'vitest';

import {
  ELO_BAR_FLOOR,
  eloShare,
  isProvisional,
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

  it('flags the recorded board by battles, whatever the rank', () => {
    const leader = fullBoard.entries[0];
    expect(leader?.rank).toBe(1);
    expect(leader?.battles).toBe(96);
    expect(leader?.provisional).toBe(true);
    expect(fullBoard.entries.filter(entry => entry.provisional)).toHaveLength(17);
    expect(fullBoard.summary.provisional).toBe(17);
  });
});

describe('toLeaderboardEntries (normalised model-stats to board entries)', () => {
  const entries = sampleBoard.entries;

  it('keeps the API order (rank, then rating) and its numbers', () => {
    expect(entries.map(entry => entry.rank)).toEqual([1, 2, 9, 16, 18, 18, 36]);
    expect(entries[0]).toMatchObject({
      id: 'fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5',
      name: 'llama-3.3-70b-instruct-fp8-fast',
      modelName: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      provider: 'cloudflare',
      providerLabel: 'Cloudflare',
      elo: 1150,
      wins: 62,
      losses: 27,
      ties: 9,
      battles: 96,
      winRate: 64.58,
    });
  });

  it('sorts rows the API sent out of order and breaks shared ranks by rating, then name', () => {
    const shuffled = [...sampleStats].reverse();
    expect(names(toLeaderboardEntries(shuffled))).toEqual(names(entries));
    const shared = entries.filter(entry => entry.rank === 18);
    expect(names(shared)).toEqual(['hermes-2-pro-mistral-7b', 'llama-3.2-11b-vision-instruct']);
  });

  it('places the Elo bar between the floor and full width', () => {
    expect(entries[0]?.eloShare).toBe(1);
    expect(entries.at(-1)?.eloShare).toBe(ELO_BAR_FLOOR);
    const shares = entries.map(entry => entry.eloShare);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    expect(eloShare(1000, 1000, 1000)).toBe(1);
    expect(eloShare(1075, 1000, 1150)).toBeCloseTo(ELO_BAR_FLOOR + (1 - ELO_BAR_FLOOR) / 2);
    expect(eloShare(2000, 1000, 1150)).toBe(1);
  });

  it('handles an empty board', () => {
    expect(toLeaderboardEntries([])).toEqual([]);
    expect(toLeaderboard([])).toEqual({
      entries: [],
      providers: [],
      summary: {
        models: 0,
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
  it('counts models, battles (each has two models), providers and the rating range', () => {
    const summary = summarize(sampleBoard.entries);
    const appearances = sampleBoard.entries.reduce((sum, entry) => sum + entry.battles, 0);
    expect(summary).toMatchObject({
      models: 7,
      battles: Math.round(appearances / 2),
      providers: 3,
      topElo: 1150,
      bottomElo: 1000,
    });
    expect(summary.provisional).toBe(3);
  });

  it('matches the recorded 53-model board', () => {
    expect(fullBoard.summary).toMatchObject({
      models: 53,
      battles: 3576,
      providers: 3,
      topElo: 1150,
      bottomElo: 909,
    });
    expect(fullBoard.summary.averageWinRate).toBeGreaterThan(30);
    expect(fullBoard.summary.averageWinRate).toBeLessThan(50);
  });
});

describe('providerOptions', () => {
  it('lists every provider once, the largest first', () => {
    expect(providerOptions(fullBoard.entries)).toEqual([
      { value: 'cloudflare', label: 'Cloudflare', count: 34 },
      { value: 'google', label: 'Google', count: 10 },
      { value: 'groq', label: 'Groq', count: 9 },
    ]);
  });
});
