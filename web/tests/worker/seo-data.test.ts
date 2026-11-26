import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  enrichSeoPage,
  injectSeoData,
  itemListJsonLd,
  jsonForScript,
  noscriptTable,
  SEO_MAX_ITEMS,
  seoKindFor,
  topItems,
} from '../../../server/seo-data.js';

// Model data in the HTML of /leaderboard/ and /models/ for crawlers without JavaScript. The
// HTMLRewriter step only exists in workerd; the pure builders and the fail-safe rules run here.

const ORIGIN = 'https://arena.dualmindlab.tech';

const item = (rank: number, name: string, extra: Record<string, unknown> = {}) => ({
  modelId: `id-${rank}`,
  modelName: `vendor/${name}`,
  displayName: name,
  providerName: 'vendor',
  eloScore: 1200.4 - rank,
  eloRank: rank,
  totalWins: 10,
  totalLosses: 5,
  totalTies: 1,
  totalResponses: 16,
  winRate: 62.5,
  provisional: false,
  ...extra,
});

const board = (count = 3) => ({
  items: Array.from({ length: count }, (_, index) => item(index + 1, `model-${index + 1}`)),
  meta: { generatedAt: '2026-11-26T08:30:00.000Z', count, provisionalBelow: 5, source: 'x' },
});

const page = () =>
  new Response('<!doctype html><html><head><title>L</title></head><body><div id="root"></div></body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', etag: '"x"' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('seoKindFor', () => {
  it.each([
    ['/leaderboard/', 'leaderboard'],
    ['/leaderboard', 'leaderboard'],
    ['/models/', 'models'],
    ['/models', 'models'],
    ['/models/x', null],
    ['/', null],
    ['/leaderboard.md', null],
  ])('%s is %s', (path, kind) => {
    expect(seoKindFor(path)).toBe(kind);
  });
});

describe('the data written into the page', () => {
  it('builds an ItemList in rank order with positions', () => {
    const list = itemListJsonLd('leaderboard', board(3), ORIGIN);
    expect(list['@type']).toBe('ItemList');
    expect(list.url).toBe(`${ORIGIN}/leaderboard/`);
    expect(list.numberOfItems).toBe(3);
    const elements = list.itemListElement as Array<{ position: number; name: string }>;
    expect(elements.map(entry => [entry.position, entry.name])).toEqual([
      [1, 'model-1'],
      [2, 'model-2'],
      [3, 'model-3'],
    ]);
    expect(itemListJsonLd('models', board(1), ORIGIN).url).toBe(`${ORIGIN}/models/`);
  });

  it('keeps only the top rows and skips rows without a name', () => {
    const many = board(SEO_MAX_ITEMS + 10);
    expect(topItems(many)).toHaveLength(SEO_MAX_ITEMS);
    expect(topItems({ items: [item(1, ''), item(2, 'ok')], meta: { generatedAt: '' } })).toHaveLength(1);
    expect(topItems(null)).toEqual([]);
  });

  it('labels the table with the date of the data and escapes every value', () => {
    const html = noscriptTable('leaderboard', {
      items: [item(1, '<script>alert(1)</script>', { providerName: 'a"b' })],
      meta: { generatedAt: '2026-11-26T08:30:00.000Z' },
    });
    expect(html).toContain('as of 2026-11-26');
    expect(html).toContain('<th>Rank</th>');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a&quot;b');
    expect(noscriptTable('models', board(2))).toContain('<th>Provider</th>');
  });

  it('cannot close the JSON-LD script from a value', () => {
    expect(jsonForScript({ name: '</script><b>' })).not.toContain('</script>');
    expect(JSON.parse(jsonForScript({ name: '</script><b>' }))).toEqual({ name: '</script><b>' });
  });
});

describe('enrichSeoPage is fail-safe', () => {
  const request = (path = '/leaderboard/', method = 'GET') =>
    new Request(`${ORIGIN}${path}`, { method });

  it('leaves the page alone without HTMLRewriter (Node)', async () => {
    const loadBoard = vi.fn(() => Promise.resolve(board()));
    const original = page();
    const result = await enrichSeoPage(request(), original, { loadBoard });
    expect(result).toBe(original);
    expect(loadBoard).not.toHaveBeenCalled();
  });

  describe('with HTMLRewriter', () => {
    const rewriter = class {
      handlers: Record<string, { element: (element: unknown) => void }> = {};
      on(selector: string, handler: { element: (element: unknown) => void }) {
        this.handlers[selector] = handler;
        return this;
      }
      transform(response: Response) {
        const body = { appended: [] as string[] };
        for (const [selector, handler] of Object.entries(this.handlers)) {
          handler.element({ append: (html: string) => body.appended.push(`${selector}:${html}`) });
        }
        return new Response(body.appended.join('\n'), { status: 200, headers: response.headers });
      }
    };

    it('writes the list into <head> and the table into <body>, and drops the stale ETag', async () => {
      vi.stubGlobal('HTMLRewriter', rewriter);
      const result = await enrichSeoPage(request(), page(), {
        loadBoard: () => Promise.resolve(board(2)),
      });
      const text = await result.text();
      expect(text).toContain('head:<script type="application/ld+json"');
      expect(text).toContain('body:<noscript data-seo-data>');
      expect(result.headers.get('etag')).toBeNull();
    });

    it('goes out unchanged when the board is slow, fails or is empty', async () => {
      vi.stubGlobal('HTMLRewriter', rewriter);
      const log = vi.fn();
      const slow = page();
      expect(
        await enrichSeoPage(request(), slow, {
          loadBoard: () => new Promise<null>(() => undefined),
          timeoutMs: 20,
          log,
        }),
      ).toBe(slow);
      expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'seo_data_skipped' }));
      const failing = page();
      expect(
        await enrichSeoPage(request(), failing, { loadBoard: () => Promise.reject(new Error('x')), log }),
      ).toBe(failing);
      const empty = page();
      expect(
        await enrichSeoPage(request(), empty, {
          loadBoard: () => Promise.resolve({ items: [], meta: { generatedAt: '' } }),
          log,
        }),
      ).toBe(empty);
    });

    it('ignores other paths, methods, statuses and content types', async () => {
      vi.stubGlobal('HTMLRewriter', rewriter);
      const loadBoard = vi.fn(() => Promise.resolve(board()));
      for (const [req, res] of [
        [request('/about/'), page()],
        [request('/leaderboard/', 'HEAD'), page()],
        [request(), new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } })],
        [request(), new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })],
      ] as const) {
        expect(await enrichSeoPage(req, res, { loadBoard })).toBe(res);
      }
      expect(loadBoard).not.toHaveBeenCalled();
    });
  });

  it('injectSeoData returns the page itself for an empty board', () => {
    const original = page();
    expect(injectSeoData(original, 'models', { items: [], meta: { generatedAt: '' } }, ORIGIN)).toBe(
      original,
    );
  });
});
