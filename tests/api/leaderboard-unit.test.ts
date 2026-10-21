import { describe, expect, it } from 'vitest';
import { LEADERBOARD_SOURCE, leaderboardItemSchema, PROVISIONAL_BELOW } from '../../contract/leaderboard.ts';
import { canonicalJson, contentEtag, ifNoneMatchHits } from '../../server/v2/leaderboard/etag.ts';
import { normaliseModelStats } from '../../server/v2/leaderboard/normalise.ts';
import { cacheStatus } from '../../server/v2/leaderboard/service.ts';
import { board, expectedItems, recordedRows } from './fixtures/model-stats.ts';

const row = (overrides: Record<string, unknown> = {}) => ({
  modelId: 'm1',
  modelName: '@cf/meta/llama',
  providerName: 'cloudflare',
  eloScore: 1200,
  totalWins: 3,
  totalLosses: 1,
  totalTies: 0,
  totalResponses: 4,
  ...overrides,
});

describe('normaliseModelStats', () => {
  it('turns the recorded v1 rows (every field twice) into exactly the documented items', () => {
    expect(normaliseModelStats(recordedRows)).toEqual({ items: expectedItems, dropped: 0 });
  });

  it('derives displayName from the model name without its provider prefix', () => {
    const [item] = normaliseModelStats([row()]).items;
    expect(item!.displayName).toBe('llama');
    expect(normaliseModelStats([row({ modelName: 'plain' })]).items[0]!.displayName).toBe('plain');
  });

  it('reads snake_case and alias-only rows', () => {
    const { items } = normaliseModelStats([
      { model_id: 'a', model_name: '@cf/x/y', provider_name: 'groq', elo_rating: 1010.46, wins: 5, losses: 4, ties: 1, matches: 10 },
    ]);
    expect(items).toEqual([
      { modelId: 'a', modelName: '@cf/x/y', displayName: 'y', providerName: 'groq', eloScore: 1010.5, eloRank: 1, totalWins: 5, totalLosses: 4, totalTies: 1, totalResponses: 10, winRate: 50, provisional: false },
    ]);
  });

  it('drops rows with missing fields, NaN, negative or fractional counts, and counts them', () => {
    const rows = [
      row({ modelId: 'ok' }),
      row({ modelId: undefined }),
      row({ modelId: 'nan', eloScore: Number.NaN }),
      row({ modelId: 'neg', totalWins: -1 }),
      row({ modelId: 'frac', totalLosses: 1.5 }),
      row({ modelId: 'str', totalTies: '2' }),
      null,
      'nonsense',
    ];
    const result = normaliseModelStats(rows);
    expect(result.items.map(item => item.modelId)).toEqual(['ok']);
    expect(result.dropped).toBe(7);
  });

  it('keeps the duplicate with more responses', () => {
    const { items } = normaliseModelStats([row({ totalResponses: 4 }), row({ totalResponses: 9, totalWins: 8 })]);
    expect(items).toHaveLength(1);
    expect(items[0]!.totalResponses).toBe(9);
  });

  it('recomputes ranks with shared places when upstream ranks are missing or partial', () => {
    const rows = [row({ modelId: 'a', eloScore: 1100 }), row({ modelId: 'b', eloScore: 1200 }), row({ modelId: 'c', eloScore: 1200, eloRank: 1 }), row({ modelId: 'd', eloScore: 1000 })];
    const ranks = Object.fromEntries(normaliseModelStats(rows).items.map(item => [item.modelId, item.eloRank]));
    expect(ranks).toEqual({ b: 1, c: 1, a: 3, d: 4 });
  });

  it('keeps upstream ranks when every row has a valid one', () => {
    const { items } = normaliseModelStats([row({ modelId: 'a', eloScore: 1100, eloRank: 2 }), row({ modelId: 'b', eloScore: 1200, eloRank: 1 })]);
    expect(items.map(item => [item.modelId, item.eloRank])).toEqual([['b', 1], ['a', 2]]);
  });

  it('recomputes winRate when absent or out of range, and gives 0 without responses', () => {
    expect(normaliseModelStats([row({ totalWins: 1, totalResponses: 3 })]).items[0]!.winRate).toBe(33.33);
    expect(normaliseModelStats([row({ winRate: 150, totalWins: 1, totalResponses: 4 })]).items[0]!.winRate).toBe(25);
    expect(normaliseModelStats([row({ winRate: 61.6 })]).items[0]!.winRate).toBe(61.6);
    expect(normaliseModelStats([row({ totalWins: 0, totalLosses: 0, totalResponses: 0 })]).items[0]!.winRate).toBe(0);
  });

  it('flags provisional below the threshold (boundary)', () => {
    expect(PROVISIONAL_BELOW).toBe(5);
    expect(normaliseModelStats([row({ totalResponses: 4 })]).items[0]!.provisional).toBe(true);
    expect(normaliseModelStats([row({ totalResponses: 5 })]).items[0]!.provisional).toBe(false);
  });

  it('sorts by rank, then Elo descending, then display name, and is stable', () => {
    const rows = [
      row({ modelId: 'z', modelName: 'zed', eloScore: 1000 }),
      row({ modelId: 'a', modelName: 'alpha', eloScore: 1000 }),
      row({ modelId: 'top', modelName: 'top', eloScore: 1500 }),
    ];
    const ids = normaliseModelStats(rows).items.map(item => item.modelId);
    expect(ids).toEqual(['top', 'a', 'z']);
    expect(normaliseModelStats([...rows].reverse()).items.map(item => item.modelId)).toEqual(ids);
  });

  it('handles a 53-row board with mixed casing and produces schema-valid items', () => {
    const { items, dropped } = normaliseModelStats(board(53));
    expect(dropped).toBe(0);
    expect(items).toHaveLength(53);
    expect(items.map(item => item.eloRank)).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));
    for (const item of items) expect(leaderboardItemSchema.safeParse(item).success).toBe(true);
    expect(items[0]).toMatchObject({ displayName: 'model-0', eloScore: 1300 });
  });

  it('returns an empty list for no rows', () => {
    expect(normaliseModelStats([])).toEqual({ items: [], dropped: 0 });
  });
});

describe('etag', () => {
  it('does not depend on key order or on generatedAt', async () => {
    const items = normaliseModelStats(recordedRows).items;
    const reordered = items.map(item => Object.fromEntries(Object.entries(item).reverse())) as typeof items;
    expect(await contentEtag(items, 5)).toBe(await contentEtag(reordered, 5));
    expect(await contentEtag(items, 5)).toMatch(/^"lb-[0-9a-f]{16}"$/);
  });

  it('changes with the data and with the threshold', async () => {
    const items = normaliseModelStats(recordedRows).items;
    const changed = items.map((item, i) => (i === 0 ? { ...item, totalWins: item.totalWins + 1 } : item));
    expect(await contentEtag(changed, 5)).not.toBe(await contentEtag(items, 5));
    expect(await contentEtag(items, 6)).not.toBe(await contentEtag(items, 5));
  });

  it('sorts keys in canonical JSON', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe('{"a":[{"c":2,"d":1}],"b":1}');
  });

  it('matches If-None-Match as a tag, a list, a weak tag or *, and ignores garbage', () => {
    const tag = '"lb-0123456789abcdef"';
    expect(ifNoneMatchHits(tag, tag)).toBe(true);
    expect(ifNoneMatchHits(`"x", ${tag}`, tag)).toBe(true);
    expect(ifNoneMatchHits(`W/${tag}`, tag)).toBe(true);
    expect(ifNoneMatchHits('*', tag)).toBe(true);
    expect(ifNoneMatchHits('"other"', tag)).toBe(false);
    expect(ifNoneMatchHits('garbage', tag)).toBe(false);
    expect(ifNoneMatchHits('', tag)).toBe(false);
    expect(ifNoneMatchHits(null, tag)).toBe(false);
  });
});

describe('cacheStatus', () => {
  it('describes each state (RFC 9211)', () => {
    expect(cacheStatus({ state: 'hit', ageSeconds: 18 })).toBe('DualMind; hit; ttl=42');
    expect(cacheStatus({ state: 'hit-l1', ageSeconds: 100 })).toBe('DualMind; hit; ttl=0');
    expect(cacheStatus({ state: 'stale', ageSeconds: 100 })).toBe('DualMind; hit; stale; detail=revalidating');
    expect(cacheStatus({ state: 'stale-error', ageSeconds: 100 })).toBe('DualMind; hit; stale; detail=upstream-error');
    expect(cacheStatus({ state: 'miss', ageSeconds: 0 })).toBe('DualMind; fwd=miss');
  });

  it('names the source in the contract', () => {
    expect(LEADERBOARD_SOURCE).toBe('dualmind-api:model-stats');
  });
});
