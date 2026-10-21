import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { shareIdFromLocation } from '@/lib/site/share';

import { SHARE_NO_STORE } from '../../../server/caching.js';
import {
  escapeHtml,
  genericShareMeta,
  isShareRoute,
  loadShareFacts,
  oneLine,
  SHARE_META_MISS_TTL_SECONDS,
  SHARE_META_TTL_SECONDS,
  shareFactsFrom,
  shareIdFromUrl,
  shareMetaFor,
  shareMetaTags,
} from '../../../server/share.js';
import { resetWebManifestCache } from '../../../server/web-manifest.js';
import worker from '../../../worker.js';
import { DIST, fakeAssets } from './fake-assets';

// Slice S11: the share page. Every share link form answers 200 with the SPA fallback, never
// cached; the link-preview facts come from the API WITHOUT a token, with a timeout and the edge
// cache. HTMLRewriter only exists in workerd: the tags written into the page are tested in
// tests/api/share.test.ts (Miniflare) and the e2e tests.

const ORIGIN = 'https://arena.dualmindlab.tech';
const ID = '2d1b6f0e-8c3a-4f7e-9b1d-5a6c7e8f9a0b';
const PREVIEW = { Cookie: 'dm_preview=1' };

const thread = (overrides: Record<string, unknown> = {}) => ({
  threadId: ID,
  userId: '00000000-0000-4000-8000-000000000001',
  title: 'Explain recursion to a ten-year-old',
  mode: 'battle',
  visibility: 'public',
  messageCount: 2,
  createdAt: '2026-10-21T10:00:00Z',
  ...overrides,
});

const message = (position: number, prompt: string, voteChoice: string | null) => ({
  messageId: `m${position}`,
  threadId: ID,
  position,
  promptText: prompt,
  model1Name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  model2Name: 'groq/compound-mini',
  model1Response: 'A',
  model2Response: 'B',
  comparisonId: `c${position}`,
  voteChoice,
  hasVoted: voteChoice !== null,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const urlOf = (input: RequestInfo | URL) =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
type Upstream = Mock<FetchFn>;

/** A fake API: the thread and its messages, or a status for both. */
function upstream(
  answer: { thread?: unknown; messages?: unknown; status?: number } = {},
): Upstream {
  return vi.fn<FetchFn>(input => {
    const url = urlOf(input);
    if (answer.status && answer.status !== 200) {
      return Promise.resolve(json({ success: false, code: 'X' }, answer.status));
    }
    return Promise.resolve(
      url.endsWith('/messages')
        ? json({ items: answer.messages ?? [] })
        : json(answer.thread ?? thread()),
    );
  });
}

/** An in-memory stand-in for the Cache API (caches.default). */
function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn((request: Request) => Promise.resolve(store.get(request.url)?.clone())),
    put: vi.fn((request: Request, response: Response) => {
      store.set(request.url, response);
      return Promise.resolve();
    }),
  };
}

const silent = () => undefined;

describe('share ids', () => {
  const cases: Array<[string, string | null]> = [
    [`/share/${ID}`, ID],
    [`/share/${ID}/`, ID],
    [`/share/?id=${ID}`, ID],
    [`/share/?thread=${ID}`, ID],
    [`/share/?threadId=${ID}`, ID],
    [`/share/index.html?id=${ID}`, ID],
    [`/share?threadId=${ID}&id=other`, ID],
    ['/share/t-recursion', 't-recursion'],
    [`/share/index.html`, null],
    ['/share/', null],
    ['/share', null],
    ['/share/%3Cscript%3E', null],
    ['/share/a.b', null],
    ['/share/?id=%20', null],
    [`/share/bad%E0%A4%A?id=${ID}`, ID],
    [`/share/${'x'.repeat(129)}`, null],
  ];

  it.each(cases)('%s -> %s (Worker and web app agree)', (pathAndQuery, expected) => {
    const url = new URL(`${ORIGIN}${pathAndQuery}`);
    expect(shareIdFromUrl(url)).toBe(expected);
    expect(shareIdFromLocation(url.pathname, url.search)).toBe(expected);
  });

  it('knows which paths are the share page', () => {
    expect(isShareRoute('/share')).toBe(true);
    expect(isShareRoute('/share/x')).toBe(true);
    expect(isShareRoute('/shared')).toBe(false);
    expect(isShareRoute('/')).toBe(false);
  });
});

describe('the tags', () => {
  it('uses the first prompt, cut to one line, and never a model name', () => {
    const facts = shareFactsFrom(thread(), {
      items: [message(1, 'Second prompt', null), message(0, '  Explain\n recursion  ', 'right')],
    });
    expect(facts).toEqual({
      mode: 'battle',
      visibility: 'public',
      prompt: '  Explain\n recursion  ',
      voted: true,
    });
    const meta = shareMetaFor(facts!, ORIGIN, ID);
    expect(meta.title).toBe('Explain recursion · DualMind Arena');
    expect(meta.ogTitle).toBe('Explain recursion');
    expect(meta.description).toBe('Two anonymous AI models answered. See which one won.');
    expect(meta.url).toBe(`${ORIGIN}/share/${ID}`);
    expect(meta.image).toBe(`${ORIGIN}/og/share.png`);
    expect(meta.robots).toBe('index, follow');
    const tags = shareMetaTags(meta);
    expect(tags).not.toContain('llama');
    expect(tags).not.toContain('compound');
    expect(tags).not.toContain('00000000-0000-4000-8000-000000000001');
  });

  it('describes each kind of thread, and keeps unlisted threads out of search engines', () => {
    const facts = (mode: string, voted: boolean, visibility = 'unlisted') =>
      shareFactsFrom(thread({ mode, visibility }), {
        items: [message(0, 'Hi', voted ? 'left' : null)],
      })!;
    expect(shareMetaFor(facts('battle', false), ORIGIN, ID).description).toBe(
      'Two anonymous AI models answered. Read both blind, then run your own battle.',
    );
    expect(shareMetaFor(facts('arena', true), ORIGIN, ID).description).toContain('side by side');
    expect(shareMetaFor(facts('direct', false), ORIGIN, ID).description).toContain(
      'One AI model answered',
    );
    expect(shareMetaFor(facts('battle', true), ORIGIN, ID).robots).toBe('noindex, nofollow');
    expect(shareMetaFor(facts('battle', true, 'public'), ORIGIN, ID).robots).toBe(
      'index, follow',
    );
  });

  it('reads snake_case and bare arrays, and falls back to the title', () => {
    expect(
      shareFactsFrom(thread({ mode: 'weird' }), [
        { position: 0, prompt_text: '', has_voted: false },
      ]),
    ).toEqual({
      mode: 'battle',
      visibility: 'public',
      prompt: 'Explain recursion to a ten-year-old',
      voted: false,
    });
  });

  it('refuses anything that is not shared', () => {
    expect(shareFactsFrom(thread({ visibility: 'private' }), { items: [] })).toBeNull();
    expect(shareFactsFrom(thread({ visibility: undefined }), { items: [] })).toBeNull();
    expect(shareFactsFrom(null, { items: [] })).toBeNull();
    expect(shareFactsFrom('nope', { items: [] })).toBeNull();
  });

  it('cuts long prompts at a word and escapes markup', () => {
    const long = `${'word '.repeat(40)}end`;
    const cut = oneLine(long);
    expect(cut.length).toBeLessThanOrEqual(90);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).not.toContain('  ');
    expect(escapeHtml(`"><script>alert('x')</script>&`)).toBe(
      '&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;',
    );
    const meta = shareMetaFor(
      { mode: 'battle', visibility: 'public', prompt: '"><img src=x onerror=alert(1)>', voted: true },
      ORIGIN,
      ID,
    );
    const tags = shareMetaTags(meta);
    expect(tags).not.toContain('<img');
    expect(tags).toContain('content="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
  });

  it('has generic tags for everything else', () => {
    const meta = genericShareMeta(ORIGIN, null);
    expect(meta.url).toBe(`${ORIGIN}/share/`);
    expect(meta.robots).toBe('noindex, nofollow');
    expect(meta.shared).toBe(false);
    const tags = shareMetaTags(meta, { withTitle: false });
    expect(tags).not.toContain('<title>');
    for (const name of [
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'twitter:card',
      'twitter:image',
    ]) {
      expect(tags).toContain(`"${name}"`);
    }
    expect(tags).toContain('content="summary_large_image"');
  });
});

describe('loadShareFacts', () => {
  it('reads the thread like any visitor: no token, no cookie, the backend from the env', async () => {
    const fetchImpl = upstream({ messages: [message(0, 'Explain recursion', 'left')] });
    const facts = await loadShareFacts(
      ID,
      { BACKEND_URL: 'https://backend.test' },
      ORIGIN,
      { fetchImpl, cache: null, log: silent },
    );
    expect(facts?.prompt).toBe('Explain recursion');
    const urls = fetchImpl.mock.calls.map(([input]) => urlOf(input)).sort();
    expect(urls).toEqual([
      `https://backend.test/api/threads/${ID}`,
      `https://backend.test/api/threads/${ID}/messages`,
    ]);
    for (const [, init] of fetchImpl.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBeNull();
      expect(headers.get('cookie')).toBeNull();
      expect(headers.get('accept')).toBe('application/json');
    }
  });

  it.each([401, 403, 404])('treats %i as not shared, and caches that briefly', async status => {
    const cache = memoryCache();
    const fetchImpl = upstream({ status });
    expect(await loadShareFacts(ID, {}, ORIGIN, { fetchImpl, cache, log: silent })).toBeNull();
    expect(cache.put).toHaveBeenCalledTimes(1);
    const stored = cache.store.get(`${ORIGIN}/__share-meta/${ID}`);
    expect(stored?.headers.get('cache-control')).toBe(`max-age=${SHARE_META_MISS_TTL_SECONDS}`);
    // The next look-up is answered by the cache.
    expect(await loadShareFacts(ID, {}, ORIGIN, { fetchImpl, cache, log: silent })).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('caches a shared thread, and serves it from the cache next time', async () => {
    const cache = memoryCache();
    const fetchImpl = upstream({ messages: [message(0, 'Cached prompt', null)] });
    const first = await loadShareFacts(ID, {}, ORIGIN, { fetchImpl, cache, log: silent });
    const second = await loadShareFacts(ID, {}, ORIGIN, { fetchImpl, cache, log: silent });
    expect(second).toEqual(first);
    expect(first?.prompt).toBe('Cached prompt');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      cache.store.get(`${ORIGIN}/__share-meta/${ID}`)?.headers.get('cache-control'),
    ).toBe(`max-age=${SHARE_META_TTL_SECONDS}`);
  });

  it('ignores a private thread even when the API sends it', async () => {
    const fetchImpl = upstream({ thread: thread({ visibility: 'private' }) });
    expect(
      await loadShareFacts(ID, {}, ORIGIN, { fetchImpl, cache: null, log: silent }),
    ).toBeNull();
  });

  it('falls back without caching on a server error, a network error or bad JSON', async () => {
    const cache = memoryCache();
    const failing: Upstream[] = [
      upstream({ status: 500 }),
      vi.fn<FetchFn>(() => Promise.reject(new TypeError('fetch failed'))),
      vi.fn<FetchFn>(() => Promise.resolve(new Response('<html>', { status: 200 }))),
    ];
    for (const fetchImpl of failing) {
      expect(await loadShareFacts(ID, {}, ORIGIN, { fetchImpl, cache, log: silent })).toBeNull();
    }
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('gives up after the timeout and logs it without the thread id', async () => {
    const log = vi.fn();
    const fetchImpl = vi.fn<FetchFn>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const started = Date.now();
    const facts = await loadShareFacts(ID, {}, ORIGIN, {
      fetchImpl,
      cache: null,
      timeoutMs: 30,
      log,
    });
    expect(facts).toBeNull();
    expect(Date.now() - started).toBeLessThan(2000);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'timeout' }));
    expect(JSON.stringify(log.mock.calls)).not.toContain(ID);
  });
});

describe('the share page through the Worker', () => {
  let backend: Upstream;

  beforeEach(() => {
    resetWebManifestCache();
    backend = upstream({ status: 404 });
    vi.stubGlobal('fetch', backend);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const get = (pathAndQuery: string, method = 'GET') =>
    worker.fetch(new Request(`${ORIGIN}${pathAndQuery}`, { method, headers: PREVIEW }), {
      ASSETS: fakeAssets(DIST),
      BACKEND_URL: 'https://backend.test',
    });

  it.each([
    `/share/${ID}`,
    `/share/${ID}/`,
    `/share/?id=${ID}`,
    `/share/?thread=${ID}`,
    `/share/?threadId=${ID}`,
    `/share/index.html?id=${ID}`,
    '/share/',
    '/share',
  ])('%s answers the SPA fallback with 200, never cached, never redirected', async path => {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('cache-control')).toBe(SHARE_NO_STORE);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('etag')).toBeNull();
    expect(await response.text()).toContain('<title>Loading</title>');
    // A web page: the enforced CSP, not the legacy report-only one.
    expect(response.headers.get('content-security-policy')).toContain("script-src 'self'");
    expect(response.headers.get('content-security-policy-report-only')).toBeNull();
    // Not shared (the fake API answers 404): kept out of search engines.
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('asks the API once per look-up, without the visitor credentials', async () => {
    await worker.fetch(
      new Request(`${ORIGIN}/share/${ID}`, {
        headers: { ...PREVIEW, Authorization: 'Bearer secret-token' },
      }),
      { ASSETS: fakeAssets(DIST), BACKEND_URL: 'https://backend.test' },
    );
    expect(backend).toHaveBeenCalledTimes(2);
    for (const [input, init] of backend.mock.calls) {
      expect(urlOf(input)).toMatch(/^https:\/\/backend\.test\/api\/threads\//);
      expect(new Headers(init?.headers).get('authorization')).toBeNull();
    }
  });

  it('does not call the API when the link has no id', async () => {
    await get('/share/');
    expect(backend).not.toHaveBeenCalled();
  });

  it('lets a public thread be indexed', async () => {
    vi.stubGlobal('fetch', upstream({ messages: [message(0, 'Public prompt', 'left')] }));
    const response = await get(`/share/${ID}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBeNull();
  });

  it('HEAD works too, and POST is not the share page', async () => {
    const head = await get(`/share/${ID}`, 'HEAD');
    expect(head.status).toBe(200);
    expect(head.headers.get('cache-control')).toBe(SHARE_NO_STORE);
    const post = await get(`/share/${ID}`, 'POST');
    expect(post.status).toBe(404);
  });

  it('no longer serves the legacy share page, which used to drop the id with a 307', async () => {
    const assets = fakeAssets({ ...DIST, '/share/index.html': '<!doctype html><title>Old</title>' });
    const response = await worker.fetch(
      new Request(`${ORIGIN}/share/${ID}`, { headers: PREVIEW }),
      { ASSETS: assets, BACKEND_URL: 'https://backend.test' },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('Old');
    expect(assets.requested).not.toContain('/share/index.html');
  });
});
