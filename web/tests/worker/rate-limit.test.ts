import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  BINDING_TIMEOUT_MS,
  checkRateLimit,
  classify,
  limiterKey,
  policyHeader,
  RATE_LIMIT_GROUPS,
} from '../../../server/rate-limit.js';

// BE-3: route groups, counter keys, headers and the fail-open rules, against fake bindings.

const ORIGIN = 'https://arena.dualmindlab.tech';
const USER = '3f6c7f0e-5d2b-4f0a-9f3e-0b9a6a1d2c11';
const noLog = () => {};

function request(method: string, path: string, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${path}`, { method, headers });
}

function fakeBinding(success: boolean) {
  const keys: string[] = [];
  return {
    keys,
    binding: {
      limit: vi.fn(({ key }: { key: string }) => {
        keys.push(key);
        return Promise.resolve({ success });
      }),
    },
  };
}

describe('classify', () => {
  it.each([
    ['POST', '/api/arena/dualchat', 'battle'],
    ['POST', '/api/arena/chat', 'battle'],
    ['POST', '/api/arena/chat/stream', 'battle'],
    ['POST', '/api/arena/model-vote', 'vote'],
    ['POST', '/api/speech/generate', 'speech'],
    ['POST', '/api/audio/tts', 'speech'],
    ['POST', '/api/users/sync', 'write'],
    ['PATCH', '/api/arena/threads/1', 'write'],
    ['DELETE', '/api/arena/threads/1', 'write'],
    ['POST', '/api/v2/threads', 'write'],
    ['GET', '/api/arena/models', 'read'],
    ['HEAD', '/api/arena/models', 'read'],
    ['GET', '/api/v2/leaderboard', 'read'],
    ['GET', '/api/v2/openapi.json', 'read'],
    ['GET', '/api/arena/dualchat', 'read'],
    ['POST', '/api/arena/chat/', 'battle'],
  ])('%s %s is %s', (method, path, group) => {
    expect(classify(method, path)).toBe(group);
  });

  it.each([
    ['GET', '/api/health'],
    ['HEAD', '/api/health'],
    ['GET', '/api/v2/health'],
    ['OPTIONS', '/api/arena/dualchat'],
    ['GET', '/'],
    ['GET', '/leaderboard/'],
    ['POST', '/share/abc'],
  ])('%s %s is not limited', (method, path) => {
    expect(classify(method, path)).toBeNull();
  });
});

describe('limiterKey', () => {
  const ip = (value?: string) =>
    request('GET', '/api/arena/models', value ? { 'CF-Connecting-IP': value } : {});

  it('uses the verified user id', async () => {
    expect((await limiterKey(ip('203.0.113.7'), {}, USER)).key).toBe(`u:${USER}`);
  });

  it('hashes the address with the salt and never keeps it', async () => {
    const a = await limiterKey(ip('203.0.113.7'), { PRIVACY_SALT: 'salt-a' }, null);
    const again = await limiterKey(ip('203.0.113.7'), { PRIVACY_SALT: 'salt-a' }, null);
    const other = await limiterKey(ip('203.0.113.7'), { PRIVACY_SALT: 'salt-b' }, null);
    const neighbour = await limiterKey(ip('203.0.113.8'), { PRIVACY_SALT: 'salt-a' }, null);
    expect(a.key).toMatch(/^ip:[0-9a-f]{32}$/);
    expect(a.key).toBe(again.key);
    expect(a.key).not.toBe(other.key);
    expect(a.key).not.toBe(neighbour.key);
    expect(JSON.stringify(a)).not.toContain('203.0.113.7');
    expect(a.hash8).toMatch(/^[0-9a-f]{8}$/);
  });

  it('without the salt: the raw address is the key, but there is nothing to log', async () => {
    const key = await limiterKey(ip('203.0.113.7'), {}, null);
    expect(key).toEqual({ key: 'ip:203.0.113.7', kind: 'ip', hash8: null });
  });

  it('uses ip:unknown without CF-Connecting-IP', async () => {
    expect((await limiterKey(ip(), { PRIVACY_SALT: 's' }, null)).kind).toBe('ip');
    expect((await limiterKey(ip(), {}, null)).key).toBe('ip:unknown');
  });
});

describe('checkRateLimit', () => {
  it('does nothing for exempt requests', async () => {
    const { binding } = fakeBinding(false);
    const gate = await checkRateLimit(
      request('GET', '/api/health'),
      { RL_READ: binding },
      { log: noLog },
    );
    expect(gate.group).toBeNull();
    expect(gate.response).toBeNull();
    expect(binding.limit).not.toHaveBeenCalled();
  });

  it('allows and adds RateLimit-Policy', async () => {
    const { binding } = fakeBinding(true);
    const gate = await checkRateLimit(
      request('POST', '/api/arena/dualchat'),
      { RL_BATTLE: binding },
      { log: noLog },
    );
    expect(gate.response).toBeNull();
    const response = gate.decorate(new Response('ok'));
    expect(response.headers.get('ratelimit-policy')).toBe('"battle";q=6;w=60');
    expect(response.headers.get('x-ratelimit-status')).toBeNull();
    expect(response.headers.get('ratelimit')).toBeNull();
  });

  it('answers 429 in the legacy shape', async () => {
    const { binding } = fakeBinding(false);
    const gate = await checkRateLimit(
      request('POST', '/api/arena/dualchat', { 'x-request-id': 'req-12345678' }),
      { RL_BATTLE: binding },
      { log: noLog },
    );
    const response = gate.response!;
    expect(response.status).toBe(429);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.get('ratelimit')).toBe('"battle";r=0;t=60');
    expect(response.headers.get('ratelimit-policy')).toBe('"battle";q=6;w=60');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('req-12345678');
    expect(await response.json()).toEqual({
      error: 'rate_limited',
      requestId: 'req-12345678',
      retryAfter: 60,
    });
  });

  it('answers 429 as problem+json for opted-in callers and on /api/v2', async () => {
    const { binding } = fakeBinding(false);
    const opted = await checkRateLimit(
      request('POST', '/api/arena/dualchat', { accept: 'application/problem+json' }),
      { RL_BATTLE: binding },
      { log: noLog },
    );
    const v2 = await checkRateLimit(
      request('GET', '/api/v2/models'),
      { RL_READ: binding },
      { log: noLog },
    );
    for (const gate of [opted, v2]) {
      expect(gate.response!.headers.get('content-type')).toBe(
        'application/problem+json; charset=utf-8',
      );
    }
    expect(await opted.response!.json()).toMatchObject({
      type: 'https://arena.dualmindlab.tech/problems/rate_limited',
      title: 'Too many requests',
      status: 429,
      detail: 'Too many battles. Try again in 60 seconds.',
      instance: '/api/arena/dualchat',
      retryAfter: 60,
    });
    expect(v2.response!.headers.get('retry-after')).toBe('10');
  });

  it('counts per verified user and ignores an unverified token', async () => {
    const { binding, keys } = fakeBinding(true);
    const verifyUser = vi.fn((_request: Request, _env: object) =>
      Promise.resolve(USER as string | null),
    );
    await checkRateLimit(
      request('POST', '/api/arena/chat', { authorization: 'Bearer good' }),
      { RL_BATTLE: binding },
      { log: noLog, verifyUser },
    );
    verifyUser.mockResolvedValueOnce(null);
    await checkRateLimit(
      request('POST', '/api/arena/chat', {
        authorization: 'Bearer forged',
        'cf-connecting-ip': '198.51.100.1',
      }),
      { RL_BATTLE: binding },
      { log: noLog, verifyUser },
    );
    verifyUser.mockRejectedValueOnce(new Error('jwks down'));
    await checkRateLimit(
      request('POST', '/api/arena/chat', {
        authorization: 'Bearer forged2',
        'cf-connecting-ip': '198.51.100.1',
      }),
      { RL_BATTLE: binding },
      { log: noLog, verifyUser },
    );
    expect(keys).toEqual([`u:${USER}`, 'ip:198.51.100.1', 'ip:198.51.100.1']);
  });

  it('skips the verifier when there is no bearer token', async () => {
    const { binding } = fakeBinding(true);
    const verifyUser = vi.fn(() => Promise.resolve(USER as string | null));
    await checkRateLimit(
      request('GET', '/api/arena/models'),
      { RL_READ: binding },
      { log: noLog, verifyUser },
    );
    expect(verifyUser).not.toHaveBeenCalled();
  });

  it('fails open and says so: missing binding, throwing binding, slow binding', async () => {
    const events: Array<Record<string, unknown>> = [];
    const log = (event: object) => events.push(event as Record<string, unknown>);
    const throwing = { limit: () => Promise.reject(new Error('boom')) };
    const slow = { limit: () => new Promise(() => {}) };
    for (const env of [{}, { RL_BATTLE: throwing }, { RL_BATTLE: slow }]) {
      const gate = await checkRateLimit(request('POST', '/api/arena/dualchat'), env, {
        log,
        timeoutMs: 5,
      });
      expect(gate.response).toBeNull();
      const response = gate.decorate(new Response('ok'));
      expect(response.headers.get('x-ratelimit-status')).toBe('skipped');
      expect(response.headers.get('ratelimit-policy')).toBe('"battle";q=6;w=60');
    }
    expect(events.filter(e => e.event === 'ratelimit_unavailable')).toHaveLength(3);
    expect(BINDING_TIMEOUT_MS).toBe(50);
  });

  it('logs the group and a hash, never the address, the token or the user id', async () => {
    const events: object[] = [];
    const { binding } = fakeBinding(false);
    const env = { RL_BATTLE: binding, PRIVACY_SALT: 'salt' };
    await checkRateLimit(
      request('POST', '/api/arena/dualchat', { 'cf-connecting-ip': '203.0.113.9' }),
      env,
      {
        log: event => events.push(event),
      },
    );
    await checkRateLimit(
      request('POST', '/api/arena/chat', { authorization: 'Bearer abc.def.ghi' }),
      env,
      {
        log: event => events.push(event),
        verifyUser: () => Promise.resolve(USER),
      },
    );
    const text = JSON.stringify(events);
    expect(text).toContain('"event":"rate_limited"');
    expect(text).toContain('"group":"battle"');
    expect(text).not.toContain('203.0.113.9');
    expect(text).not.toContain(USER);
    expect(text).not.toContain('abc.def.ghi');
    // Without the salt there is no hash at all, and still no address.
    events.length = 0;
    await checkRateLimit(
      request('POST', '/api/arena/dualchat', { 'cf-connecting-ip': '203.0.113.9' }),
      { RL_BATTLE: binding },
      {
        log: event => events.push(event),
      },
    );
    expect(JSON.stringify(events)).not.toContain('203.0.113.9');
    expect(events.find(e => (e as { event: string }).event === 'rate_limited')).toMatchObject({
      keyHash8: null,
    });
  });

  it('generates a request id when the caller sent none', async () => {
    const { binding } = fakeBinding(false);
    const gate = await checkRateLimit(
      request('POST', '/api/arena/dualchat'),
      { RL_BATTLE: binding },
      { log: noLog, newId: () => 'generated-id-1' },
    );
    expect(gate.requestId).toBe('generated-id-1');
    expect(gate.response!.headers.get('x-request-id')).toBe('generated-id-1');
  });
});

describe('wrangler.jsonc', () => {
  it('declares exactly the limits of RATE_LIMIT_GROUPS', () => {
    const text = readFileSync(resolve(__dirname, '../../../wrangler.jsonc'), 'utf8');
    const declared = [
      ...text.matchAll(
        /\{ "name": "(RL_\w+)", "namespace_id": "(\d+)", "simple": \{ "limit": (\d+), "period": (\d+) \} \}/g,
      ),
    ].map(([, name, namespaceId, limit, period]) => ({
      name,
      namespaceId,
      limit: Number(limit),
      period: Number(period),
    }));
    const expected = Object.values(RATE_LIMIT_GROUPS).map(group => ({
      name: group.binding,
      namespaceId: group.namespaceId,
      limit: group.limit,
      period: group.period,
    }));
    expect(declared).toEqual(expected);
    expect(new Set(declared.map(item => item.namespaceId)).size).toBe(declared.length);
    for (const item of declared) expect([10, 60]).toContain(item.period);
  });

  it('builds the policy strings from the same constants', () => {
    expect(policyHeader('vote')).toBe('"vote";q=10;w=10');
    expect(policyHeader('read')).toBe('"read";q=30;w=10');
  });
});
