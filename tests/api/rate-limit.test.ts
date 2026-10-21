import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker.js';
import { baseEnv } from './helpers.ts';

// BE-3 with the real Miniflare Rate Limiting bindings from tests/api/wrangler.test.jsonc, through
// the real worker.js. Every test uses its own client address, so counters never collide.

const PROD = 'https://arena.dualmindlab.tech';
const cookie = { Cookie: 'dm_preview=1' };
const workerEnv = () => ({ ...env, ...baseEnv, BACKEND_URL: 'https://backend.test' });
let counter = 0;
const freshIp = () => `198.51.100.${(counter += 1)}`;

function call(path: string, init: RequestInit & { ip?: string } = {}) {
  const { ip = freshIp(), headers, ...rest } = init;
  return worker.fetch(
    new Request(`${PROD}${path}`, { ...rest, headers: { ...cookie, 'CF-Connecting-IP': ip, ...(headers as Record<string, string> | undefined) } }),
    workerEnv(),
    undefined,
  );
}

function mockUpstream() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }));
}

afterEach(() => vi.restoreAllMocks());

describe('real rate limit bindings', () => {
  it('lets 6 battles through and answers the 7th with 429, without calling the upstream', async () => {
    const upstream = mockUpstream();
    const ip = freshIp();
    for (let i = 0; i < 6; i += 1) {
      const response = await call('/api/arena/dualchat', { method: 'POST', ip, body: '{}', headers: { 'content-type': 'application/json' } });
      expect(response.status).toBe(200);
      expect(response.headers.get('ratelimit-policy')).toBe('"battle";q=6;w=60');
      expect(response.headers.get('x-ratelimit-status')).toBeNull();
    }
    expect(upstream).toHaveBeenCalledTimes(6);
    const limited = await call('/api/arena/dualchat', { method: 'POST', ip, body: '{}', headers: { 'content-type': 'application/json', 'x-request-id': 'limit-test-0001' } });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(limited.headers.get('ratelimit')).toBe('"battle";r=0;t=60');
    expect(limited.headers.get('x-request-id')).toBe('limit-test-0001');
    expect(limited.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await limited.json()).toEqual({ error: 'rate_limited', requestId: 'limit-test-0001', retryAfter: 60 });
    expect(upstream).toHaveBeenCalledTimes(6);
  });

  it('keeps separate counters per client and per group', async () => {
    mockUpstream();
    const a = freshIp();
    const b = freshIp();
    for (let i = 0; i < 6; i += 1) await call('/api/arena/chat', { method: 'POST', ip: a, body: '{}' });
    expect((await call('/api/arena/chat', { method: 'POST', ip: a, body: '{}' })).status).toBe(429);
    expect((await call('/api/arena/chat', { method: 'POST', ip: b, body: '{}' })).status).toBe(200);
    expect((await call('/api/arena/model-vote', { method: 'POST', ip: a, body: '{}' })).status).toBe(200);
  });

  it('limits votes at 10 per 10 seconds and answers problem+json on request', async () => {
    mockUpstream();
    const ip = freshIp();
    for (let i = 0; i < 10; i += 1) expect((await call('/api/arena/model-vote', { method: 'POST', ip, body: '{}' })).status).toBe(200);
    const limited = await call('/api/arena/model-vote', { method: 'POST', ip, body: '{}', headers: { accept: 'application/problem+json' } });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('content-type')).toBe('application/problem+json; charset=utf-8');
    expect(limited.headers.get('retry-after')).toBe('10');
    expect(await limited.json()).toMatchObject({ status: 429, retryAfter: 10, instance: '/api/arena/model-vote', type: expect.stringContaining('/problems/rate_limited') });
  });

  it('puts RateLimit-Policy on /api/v2 reads and leaves /api/v2/health and /api/health exempt', async () => {
    const read = await call('/api/v2/openapi.json');
    expect(read.status).toBe(200);
    expect(read.headers.get('ratelimit-policy')).toBe('"read";q=30;w=10');
    const health = await call('/api/v2/health');
    expect(health.status).toBe(200);
    expect(health.headers.get('ratelimit-policy')).toBeNull();
    mockUpstream();
    expect((await call('/api/health')).headers.get('ratelimit-policy')).toBeNull();
  });

  it('skips limiting and says so when a binding is missing', async () => {
    mockUpstream();
    const without = workerEnv() as Record<string, unknown>;
    delete without.RL_BATTLE;
    const response = await worker.fetch(
      new Request(`${PROD}/api/arena/dualchat`, { method: 'POST', body: '{}', headers: { ...cookie, 'CF-Connecting-IP': freshIp() } }),
      without as never,
      undefined,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-ratelimit-status')).toBe('skipped');
  });
});
