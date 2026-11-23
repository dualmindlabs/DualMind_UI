import { describe, expect, it, vi } from 'vitest';

import { toLeaderboard } from '@/features/leaderboard';
import { createApiClient } from '@/lib/api';
import { voteResultSchema } from '@/lib/api/schemas/arena';
import { crowdBoardSchema } from '@/lib/api/schemas/crowd';

import board from '../../../fixtures/api/crowd-board.json';
import categories from '../../../fixtures/api/crowd-categories.json';
import v2 from '../../../fixtures/api/leaderboard-v2.recorded.json';
import { jsonResponse, scriptedFetch } from './helpers';

const NO_RETRY = { retry: false } as const;
const pathOf = (url: string) => new URL(url, 'https://app.test').pathname;
const off = (status = 404) =>
  jsonResponse({ success: false, error: 'Not found', code: 'FEATURE_DISABLED' }, { status });

describe('crowd board schema', () => {
  it('reads the legacy fields and the crowd fields of every row', () => {
    const data = crowdBoardSchema.parse(board);
    expect(data.source).toBe('crowd');
    expect(data.items).toHaveLength(board.items.length);
    expect(data.crowd).toMatchObject({ methodology: 'bt-v1', voteCount: 4821, degraded: false });
    const top = data.items[0];
    expect(top?.crowd).toMatchObject({ ratingSource: 'votes', provisional: false });
    expect(top?.crowd?.ciLow).toBeLessThan(top?.eloScore ?? 0);
    expect(top?.crowd?.ciHigh).toBeGreaterThan(top?.eloScore ?? 0);
  });

  it('carries seeded rows without an interval or rank', () => {
    const data = crowdBoardSchema.parse(board);
    const seeded = data.items.filter(item => item.crowd?.ratingSource === 'seeded');
    expect(seeded.length).toBeGreaterThan(0);
    for (const item of seeded) {
      expect(item.provisional).toBe(true);
      expect(item.crowd).toMatchObject({ rating: null, ciLow: null, ciHigh: null, rank: null });
    }
  });

  it('turns into a board that keeps the rank ranges and marks rows without a rank claim', () => {
    const data = crowdBoardSchema.parse(board);
    const result = toLeaderboard(data.items, data);
    expect(result.source).toBe('crowd');
    expect(result.unrated.every(entry => entry.provisional)).toBe(true);
    const ranged = result.rated.filter(
      entry => entry.crowd?.rankLow != null && entry.crowd.rankLow !== entry.crowd.rankHigh,
    );
    expect(ranged.length).toBeGreaterThan(0);
    // A rated model without a rank claim keeps rank null: no number is invented for it.
    const noClaim = result.entries.filter(entry => !entry.provisional && entry.rank === null);
    expect(noClaim.length).toBeGreaterThan(0);
    expect(noClaim.every(entry => entry.crowd?.rank === null)).toBe(true);
    expect(result.rated.every(entry => entry.rank === entry.crowd?.rank)).toBe(true);
    // Ranked first, then the unranked by rating, then the models not yet rated.
    const lastRanked = result.entries.map(entry => entry.rank !== null).lastIndexOf(true);
    const firstUnranked = result.entries.findIndex(entry => entry.rank === null);
    expect(lastRanked).toBeLessThan(firstUnranked);
    const unranked = result.entries.filter(entry => entry.rank === null && !entry.provisional);
    expect(unranked.map(entry => entry.elo)).toEqual(
      [...unranked.map(entry => entry.elo)].sort((x, y) => y - x),
    );
    expect(result.entries.slice(-result.unrated.length)).toEqual(result.unrated);
    expect(result.summary.ranked).toBe(result.rated.length);
    expect(result.summary.rated).toBe(result.rated.length + noClaim.length);
    // The seeded scale never stretches the board's rating range.
    expect(result.summary.bottomElo).toBe(
      Math.min(...result.entries.filter(e => !e.provisional).map(e => e.elo)),
    );
    expect(result.summary.topElo).toBe(1150);
  });

  it('rejects a row that breaks the contract', () => {
    expect(() => crowdBoardSchema.parse({ items: [{ modelId: 'x' }] })).toThrow();
  });
});

describe('crowd board, missing numbers', () => {
  it('reads a missing vote count as unknown, not as 0', () => {
    const row: Record<string, unknown> = { ...board.items[0] };
    delete row.votes;
    const envelope: Record<string, unknown> = { ...board, items: [row] };
    delete envelope.voteCount;
    const data = crowdBoardSchema.parse(envelope);
    expect(data.crowd?.voteCount).toBeNull();
    expect(data.items[0]?.crowd?.votes).toBeNull();
  });
});

describe('feature detection', () => {
  it('getBoard uses the crowd board when it answers', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(board));
    const data = await createApiClient({ fetch }).getBoard(NO_RETRY);
    expect(data.source).toBe('crowd');
    expect(calls.map(call => pathOf(call.url))).toEqual(['/api/leaderboard']);
    expect(calls[0]?.headers.has('authorization')).toBe(false);
  });

  it.each([404, 501, 503])('getBoard falls back to the classic board on %i', async status => {
    const { fetch, calls } = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard' ? off(status) : jsonResponse(v2),
    );
    const data = await createApiClient({ fetch }).getBoard(NO_RETRY);
    expect(data.source).toBe('v2');
    expect(calls.map(call => pathOf(call.url))).toEqual([
      '/api/leaderboard',
      '/api/v2/leaderboard',
    ]);
  });

  it('getBoard falls back when the crowd board does not match its schema', async () => {
    const { fetch } = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard'
        ? jsonResponse({ items: [{ nope: 1 }] })
        : jsonResponse(v2),
    );
    expect((await createApiClient({ fetch }).getBoard(NO_RETRY)).source).toBe('v2');
  });

  it('remembers a 404 so a board that is off costs one failed call', async () => {
    const { fetch, calls } = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard' ? off() : jsonResponse(v2),
    );
    const api = createApiClient({ fetch });
    await api.getBoard(NO_RETRY);
    await api.getBoard(NO_RETRY);
    expect(calls.filter(call => pathOf(call.url) === '/api/leaderboard')).toHaveLength(1);
  });

  it('does not remember a 503: the board is asked again', async () => {
    const { fetch, calls } = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard' ? off(503) : jsonResponse(v2),
    );
    const api = createApiClient({ fetch });
    await api.getBoard(NO_RETRY);
    await api.getBoard(NO_RETRY);
    expect(calls.filter(call => pathOf(call.url) === '/api/leaderboard')).toHaveLength(2);
  });

  it('still fails loudly on a real server error', async () => {
    const { fetch } = scriptedFetch(jsonResponse({ error: 'boom' }, { status: 500 }));
    await expect(createApiClient({ fetch }).getBoard(NO_RETRY)).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('labels a category board with its category, and the overall fallback without one', async () => {
    const { fetch } = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard/categories/code' ? jsonResponse(board) : off(),
    );
    const api = createApiClient({ fetch });
    expect((await api.getBoard(NO_RETRY, 'code')).category).toBe('code');
    const { fetch: offFetch, calls } = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard' ? jsonResponse(board) : off(),
    );
    const data = await createApiClient({ fetch: offFetch }).getBoard(NO_RETRY, 'math');
    expect(data.category).toBeUndefined();
    expect(data.source).toBe('crowd');
    expect(calls.map(call => pathOf(call.url))).toEqual([
      '/api/leaderboard/categories/math',
      '/api/leaderboard',
    ]);
  });

  it.each([500, 502])(
    'falls back to the classic board on a %i, with a notice and no memory',
    async status => {
      const { fetch, calls } = scriptedFetch(call =>
        pathOf(call.url) === '/api/leaderboard'
          ? jsonResponse({ error: 'boom' }, { status })
          : jsonResponse(v2),
      );
      const api = createApiClient({ fetch });
      const first = await api.getBoard(NO_RETRY);
      expect(first).toMatchObject({ source: 'v2', fallback: 'failed' });
      await api.getBoard(NO_RETRY);
      expect(calls.filter(call => pathOf(call.url) === '/api/leaderboard')).toHaveLength(2);
    },
  );

  it('falls back on a network failure, and says unavailable on a 503, but not when the flag is off', async () => {
    const down = scriptedFetch(call => {
      if (pathOf(call.url) === '/api/leaderboard') throw new TypeError('Failed to fetch');
      return jsonResponse(v2);
    });
    expect(await createApiClient({ fetch: down.fetch }).getBoard(NO_RETRY)).toMatchObject({
      source: 'v2',
      fallback: 'failed',
    });
    const busy = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard' ? off(503) : jsonResponse(v2),
    );
    expect(await createApiClient({ fetch: busy.fetch }).getBoard(NO_RETRY)).toMatchObject({
      fallback: 'unavailable',
    });
    const disabled = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard' ? off() : jsonResponse(v2),
    );
    expect(
      (await createApiClient({ fetch: disabled.fetch }).getBoard(NO_RETRY)).fallback,
    ).toBeUndefined();
  });

  it('serves the overall board for an unknown category (400), and still fails when classic fails', async () => {
    const bad = scriptedFetch(call =>
      pathOf(call.url) === '/api/leaderboard/categories/code'
        ? jsonResponse({ success: false, error: 'bad', code: 'INVALID_CATEGORY' }, { status: 400 })
        : jsonResponse(board),
    );
    const data = await createApiClient({ fetch: bad.fetch }).getBoard(NO_RETRY, 'code');
    expect(data.category).toBeUndefined();
    expect(data.source).toBe('crowd');
    const allDown = scriptedFetch(jsonResponse({ error: 'boom' }, { status: 500 }));
    await expect(
      createApiClient({ fetch: allDown.fetch }).getBoard(NO_RETRY),
    ).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('warns once about an unreadable body and asks again after 30 s, not 5 min', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { fetch, calls } = scriptedFetch(call =>
        pathOf(call.url) === '/api/leaderboard'
          ? jsonResponse({ items: [{ nope: 1 }] })
          : jsonResponse(v2),
      );
      const api = createApiClient({ fetch });
      await api.getBoard(NO_RETRY);
      await api.getBoard(NO_RETRY);
      expect(calls.filter(call => pathOf(call.url) === '/api/leaderboard')).toHaveLength(1);
      vi.setSystemTime(Date.now() + 31_000);
      await api.getBoard(NO_RETRY);
      expect(calls.filter(call => pathOf(call.url) === '/api/leaderboard')).toHaveLength(2);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
      vi.useRealTimers();
    }
  });

  it('reads a category board, and never sends an unsafe category', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(board));
    const api = createApiClient({ fetch });
    expect((await api.getCrowdBoard('long-context', NO_RETRY))?.source).toBe('crowd');
    expect(pathOf(calls[0]?.url ?? '')).toBe('/api/leaderboard/categories/long-context');
    expect(await api.getCrowdBoard('../admin', NO_RETRY)).toBeNull();
    expect(await api.getCrowdBoard('Code?x=1', NO_RETRY)).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it('reads the categories, and null while they are off', async () => {
    const on = createApiClient({ fetch: scriptedFetch(jsonResponse(categories)).fetch });
    expect((await on.getCrowdCategories(NO_RETRY))?.map(item => item.id)).toEqual([
      'code',
      'math',
      'writing',
      'long-context',
      'other',
    ]);
    const disabled = createApiClient({ fetch: scriptedFetch(off()).fetch });
    expect(await disabled.getCrowdCategories(NO_RETRY)).toBeNull();
  });

  it('reads the methodology as text, and null while it is off', async () => {
    const text = 'DualMind Arena leaderboard methodology (bt-v1)\n\nScale\nA gap of 100 points.';
    const { fetch } = scriptedFetch(
      new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } }),
    );
    expect(await createApiClient({ fetch }).getLeaderboardMethodology(NO_RETRY)).toBe(text);
    expect(
      await createApiClient({ fetch: scriptedFetch(off()).fetch }).getLeaderboardMethodology(
        NO_RETRY,
      ),
    ).toBeNull();
  });
});

describe('vote receipt', () => {
  const hash = 'a'.repeat(64);

  it('is read from the vote response while the receipts flag is on', () => {
    const result = voteResultSchema.parse({
      success: true,
      message: 'Vote recorded successfully',
      receipt: {
        receiptId: 'c0ffee00-0000-4000-8000-000000000001',
        seq: 42,
        entryHash: hash,
        prevHash: hash,
      },
    });
    expect(result).toMatchObject({ receipt: { seq: 42, entryHash: hash } });
  });

  it('has no receipt when the flag is off, and a broken receipt never fails the vote', () => {
    expect(voteResultSchema.parse({ success: true, message: 'ok' })).not.toHaveProperty('receipt');
    expect(voteResultSchema.parse(null)).not.toHaveProperty('receipt');
    const broken = voteResultSchema.parse({
      success: true,
      receipt: { receiptId: 'x', seq: 'no' },
    });
    expect(broken.success).toBe(true);
    expect(broken).not.toHaveProperty('receipt');
  });
});
