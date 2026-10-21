import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import committed from '../../docs/api/openapi.v2.json';
import { leaderboardResponseSchema } from '../../contract/leaderboard.ts';
import { problemSchema } from '../../contract/common.ts';
import { createLeaderboardService, type ServiceOptions } from '../../server/v2/leaderboard/service.ts';
import { resetLeaderboardState } from '../../server/v2/leaderboard/service.ts';
import { FRESH_SECONDS, HARD_SECONDS, STALE_SECONDS, type CacheStore, type StoredEntry } from '../../server/v2/leaderboard/cache.ts';
import worker from '../../worker.js';
import { baseEnv } from './helpers.ts';
import { board, expectedItems, recordedBody } from './fixtures/model-stats.ts';

// BE-4 through the real worker.js with the real Miniflare Cache API and a faked upstream.
// Each test uses its own host, so cache entries never collide, and a fake clock (Date.now).

const cookie = { Cookie: 'dm_preview=1' };
const workerEnv = () => ({ ...env, ...baseEnv, BACKEND_URL: 'https://backend.test' });
let counter = 0;
let host = '';
let clock = 1_800_000_000_000;

function ctxWithWaits() {
  const waits: Promise<unknown>[] = [];
  return { ctx: { waitUntil: (p: Promise<unknown>) => void waits.push(p), passThroughOnException() {} }, settle: () => Promise.allSettled(waits) };
}

function call(init: RequestInit & { method?: string } = {}, ctx = ctxWithWaits()) {
  const { headers, ...rest } = init;
  return worker
    .fetch(new Request(`https://${host}/api/v2/leaderboard`, { ...rest, headers: { ...cookie, 'CF-Connecting-IP': `203.0.113.${(counter += 1) % 250}`, ...(headers as Record<string, string> | undefined) } }), workerEnv(), ctx.ctx as never)
    .then(async response => {
      await ctx.settle();
      return response;
    });
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function upstream(handler: () => Response | Promise<Response> = () => json(recordedBody)) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => handler());
}

type Operation = { responses: Record<string, { content?: Record<string, unknown> }> };
function expectMatchesOpenApi(response: Response) {
  const operation = (committed as unknown as { paths: Record<string, Record<string, Operation>> }).paths['/api/v2/leaderboard']?.get;
  expect(operation, 'GET /api/v2/leaderboard is in docs/api/openapi.v2.json').toBeDefined();
  const declared = operation!.responses[String(response.status)];
  expect(declared, `status ${response.status} is declared`).toBeDefined();
  if (response.status !== 304) {
    const type = (response.headers.get('content-type') ?? '').split(';')[0]!;
    expect(Object.keys(declared!.content ?? {})).toContain(type);
  }
}

beforeEach(() => {
  counter += 1;
  host = `lb${counter}.arena-test.dualmindlab.tech`;
  clock = 1_800_000_000_000 + counter * 10_000_000;
  resetLeaderboardState();
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(() => vi.restoreAllMocks());

describe('GET /api/v2/leaderboard', () => {
  it('misses, fetches once, normalises and serves with the documented headers', async () => {
    const fetchSpy = upstream();
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=30, stale-while-revalidate=60, stale-if-error=86400');
    expect(response.headers.get('etag')).toMatch(/^"lb-[0-9a-f]{16}"$/);
    expect(response.headers.get('cache-status')).toBe('DualMind; fwd=miss');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    const body = leaderboardResponseSchema.parse(await response.json());
    expect(body.items).toEqual(expectedItems);
    expect(body.meta).toEqual({ generatedAt: new Date(clock).toISOString(), count: 2, provisionalBelow: 5, source: 'dualmind-api:model-stats' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('https://backend.test/api/arena/model-stats');
    expect(new Headers((init as RequestInit).headers).get('authorization')).toBeNull();
    expectMatchesOpenApi(response);
  });

  it('serves 10 requests from one upstream call', async () => {
    const fetchSpy = upstream();
    for (let i = 0; i < 10; i += 1) {
      const response = await call();
      expect(response.status).toBe(200);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const hit = await call();
    expect(hit.headers.get('cache-status')).toMatch(/^DualMind; hit; ttl=\d+$/);
  });

  it('reads the Cache API when the isolate copy is gone (another isolate stored it)', async () => {
    const fetchSpy = upstream();
    await call();
    resetLeaderboardState();
    clock += 20_000;
    const response = await call();
    expect(response.headers.get('cache-status')).toBe('DualMind; hit; ttl=40');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('answers 304 for a matching If-None-Match, with no body, and 200 for another tag', async () => {
    upstream();
    const first = await call();
    const etag = first.headers.get('etag')!;
    const notModified = await call({ headers: { 'If-None-Match': etag } });
    expect(notModified.status).toBe(304);
    expect(await notModified.text()).toBe('');
    expect(notModified.headers.get('etag')).toBe(etag);
    expect(notModified.headers.get('cache-control')).toContain('max-age=30');
    expect(notModified.headers.get('cache-status')).toContain('hit');
    expect(notModified.headers.get('x-request-id')).toBeTruthy();
    expectMatchesOpenApi(notModified);
    expect((await call({ headers: { 'If-None-Match': `W/${etag}` } })).status).toBe(304);
    expect((await call({ headers: { 'If-None-Match': '*' } })).status).toBe(304);
    expect((await call({ headers: { 'If-None-Match': '"nope"' } })).status).toBe(200);
  });

  it('supports HEAD with the same headers and no body', async () => {
    upstream();
    const get = await call();
    const head = await call({ method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect(head.headers.get('etag')).toBe(get.headers.get('etag'));
    expect(head.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('answers other methods with a 405 problem that allows GET and HEAD', async () => {
    const response = await call({ method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
    expect(problemSchema.parse(await response.json()).status).toBe(405);
  });

  it('serves stale and revalidates once in the background through waitUntil', async () => {
    const fetchSpy = upstream();
    await call();
    clock += (FRESH_SECONDS + 5) * 1000;
    const changed = { success: true, items: [{ ...recordedBody.items[0]!, totalWins: 63, wins: 63 }, recordedBody.items[1]!] };
    fetchSpy.mockImplementation(async () => json(changed));
    const { ctx, settle } = ctxWithWaits();
    const [a, b] = await Promise.all([call({}, { ctx, settle }), call({}, { ctx, settle })]);
    expect(a.headers.get('cache-status')).toBe('DualMind; hit; stale; detail=revalidating');
    expect(b.headers.get('cache-status')).toBe('DualMind; hit; stale; detail=revalidating');
    await settle();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const after = await call();
    expect(after.headers.get('cache-status')).toMatch(/^DualMind; hit; ttl=/);
    const body = leaderboardResponseSchema.parse(await after.json());
    expect(body.items[0]!.totalWins).toBe(63);
  });

  it('keeps ETag and generatedAt when a refresh brings the same data', async () => {
    const fetchSpy = upstream();
    const first = await call();
    const firstBody = leaderboardResponseSchema.parse(await first.clone().json());
    clock += (FRESH_SECONDS + 5) * 1000;
    await call();
    const second = await call();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(second.headers.get('etag')).toBe(first.headers.get('etag'));
    expect(leaderboardResponseSchema.parse(await second.json()).meta.generatedAt).toBe(firstBody.meta.generatedAt);
  });

  it('refreshes in the foreground once past the stale window', async () => {
    const fetchSpy = upstream();
    await call();
    clock += (STALE_SECONDS + 5) * 1000;
    const response = await call();
    expect(response.headers.get('cache-status')).toBe('DualMind; fwd=miss');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('serves the stored copy when the upstream fails after the stale window', async () => {
    const fetchSpy = upstream();
    await call();
    clock += (STALE_SECONDS + 5) * 1000;
    fetchSpy.mockImplementation(async () => json({ error: 'down' }, 500));
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-status')).toBe('DualMind; hit; stale; detail=upstream-error');
    expectMatchesOpenApi(response);
  });

  it('ignores a copy older than 24 hours and answers 502 when the upstream is down', async () => {
    const fetchSpy = upstream();
    await call();
    clock += (HARD_SECONDS + 5) * 1000;
    fetchSpy.mockImplementation(async () => json({ error: 'down' }, 500));
    const response = await call();
    expect(response.status).toBe(502);
  });

  it('answers 502 problem+json with Retry-After and never caches it when there is no copy', async () => {
    upstream(() => json({ error: 'down' }, 500));
    const response = await call();
    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toBe('application/problem+json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('5');
    const problem = problemSchema.parse(await response.json());
    expect(problem).toMatchObject({ status: 502, instance: '/api/v2/leaderboard', type: expect.stringContaining('/problems/bad_gateway') });
    expectMatchesOpenApi(response);
  });

  it('answers 504 when the upstream times out and there is no copy', async () => {
    upstream(() => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    });
    const response = await call();
    expect(response.status).toBe(504);
    expect(response.headers.get('retry-after')).toBe('5');
    expectMatchesOpenApi(response);
  });

  it('does not call the upstream again for 10 seconds after a failure', async () => {
    const fetchSpy = upstream(() => json({ error: 'down' }, 500));
    expect((await call()).status).toBe(502);
    expect((await call()).status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    clock += 11_000;
    fetchSpy.mockImplementation(async () => json(recordedBody));
    expect((await call()).status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('never caches an empty list, an unparsable body or a body of invalid rows', async () => {
    for (const body of [{ success: true, items: [] }, { success: true, items: [{ nope: 1 }] }, 'not json']) {
      resetLeaderboardState();
      host = `lb${(counter += 1)}.arena-test.dualmindlab.tech`;
      upstream(() => (typeof body === 'string' ? new Response(body, { status: 200 }) : json(body)));
      expect((await call()).status).toBe(502);
    }
  });

  it('keeps the good copy when the upstream starts returning an empty list', async () => {
    const fetchSpy = upstream();
    const first = await call();
    clock += (STALE_SECONDS + 5) * 1000;
    fetchSpy.mockImplementation(async () => json({ success: true, items: [] }));
    const second = await call();
    expect(second.status).toBe(200);
    expect(second.headers.get('etag')).toBe(first.headers.get('etag'));
    expect(second.headers.get('cache-status')).toContain('upstream-error');
  });

  it('normalises a mixed-casing 53-row board', async () => {
    upstream(() => json({ success: true, items: board(53) }));
    const response = await call();
    const body = leaderboardResponseSchema.parse(await response.json());
    expect(body.meta.count).toBe(53);
    expect(body.items[0]!.eloRank).toBe(1);
    expect(JSON.stringify(body)).not.toContain('model_id');
  });

  it('sends only Accept and the request id upstream and ignores query parameters', async () => {
    const fetchSpy = upstream();
    await worker.fetch(
      new Request(`https://${host}/api/v2/leaderboard?x=1&y=2`, { headers: { ...cookie, 'CF-Connecting-IP': '203.0.113.9' } }),
      workerEnv(),
      undefined,
    );
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(Object.fromEntries(new Headers(init.headers))).toEqual({ accept: 'application/json', 'x-request-id': expect.any(String) });
    const again = await call();
    expect(again.headers.get('cache-status')).toMatch(/hit/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('the state machine with an in-memory store', () => {
  function memoryStore() {
    let entry: StoredEntry | undefined;
    const store: CacheStore = { read: async () => entry, write: async next => void (entry = next) };
    return { store, get entry() { return entry; } };
  }
  const options = (extra: Partial<ServiceOptions> = {}): ServiceOptions => ({ now: () => clock, ...extra });

  it('works without any Cache API (L1 only)', async () => {
    const dead: CacheStore = { read: async () => { throw new Error('no cache'); }, write: async () => { throw new Error('no cache'); } };
    const service = createLeaderboardService(options({ store: () => dead }));
    const fetchSpy = upstream();
    const first = await service.getLeaderboard(workerEnv(), undefined, 'req-1', 'https://x.test/');
    const second = await service.getLeaderboard(workerEnv(), undefined, 'req-2', 'https://x.test/');
    expect(first.state).toBe('miss');
    expect(second.state).toBe('hit-l1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('skips the background refresh without a waitUntil and serves the stale copy', async () => {
    const memory = memoryStore();
    const service = createLeaderboardService(options({ store: () => memory.store }));
    const fetchSpy = upstream();
    await service.getLeaderboard(workerEnv(), undefined, 'r1', 'https://x.test/');
    clock += (FRESH_SECONDS + 1) * 1000;
    const stale = await service.getLeaderboard(workerEnv(), undefined, 'r2', 'https://x.test/');
    expect(stale.state).toBe('stale');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent cold requests into one upstream call', async () => {
    const memory = memoryStore();
    const service = createLeaderboardService(options({ store: () => memory.store }));
    const fetchSpy = upstream();
    const results = await Promise.all([1, 2, 3].map(n => service.getLeaderboard(workerEnv(), undefined, `r${n}`, 'https://x.test/')));
    expect(results.every(result => result.etag === results[0]!.etag)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
