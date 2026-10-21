import { describe, expect, it, vi } from 'vitest';

import {
  backendPathFor,
  FORWARDED_REQUEST_HEADERS,
  MODEL_CALL_TIMEOUT_MS,
  proxyApi,
  sanitizeRequestId,
  UPSTREAM_TIMEOUT_MS,
  upstreamTimeoutFor,
} from '../../../server/api-proxy.js';
import worker from '../../../worker.js';
import { DIST, fakeAssets } from './fake-assets';

// The hardened /api proxy (server/api-proxy.js) against a fake upstream.

const ORIGIN = 'https://arena.dualmindlab.tech';

type Upstream = (url: string, init: RequestInit) => Promise<Response>;

function apiRequest(path: string, init: RequestInit = {}) {
  return new Request(`${ORIGIN}${path}`, init);
}

/** A fake backend that records what it received and answers with `respond`. */
function fakeUpstream(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit; headers: Headers }> = [];
  const fetchImpl = vi.fn<Upstream>(async (url, init) => {
    calls.push({ url, init, headers: new Headers(init.headers) });
    return respond(url, init);
  });
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });

describe('request side', () => {
  it('forwards only the allowed headers, plus a request id', async () => {
    const upstream = fakeUpstream(() => json({ ok: true }));
    await proxyApi(
      apiRequest('/api/arena/models', {
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Language': 'en',
          'X-Request-Id': 'req-from-client-1',
          Cookie: 'dm_preview=1; sb-token=secret',
          'User-Agent': 'test',
          'X-Forwarded-For': '1.2.3.4',
          Origin: ORIGIN,
          'X-User-ID': 'spoofed',
        },
      }),
      {},
      { fetchImpl: upstream.fetchImpl },
    );
    const sent = upstream.calls[0]?.headers;
    expect([...(sent?.keys() ?? [])].sort()).toEqual([...FORWARDED_REQUEST_HEADERS].sort());
    expect(sent?.get('authorization')).toBe('Bearer token');
    expect(sent?.get('x-request-id')).toBe('req-from-client-1');
    expect(sent?.get('cookie')).toBeNull();
  });

  it('maps /api/health to /health and keeps the query', async () => {
    const upstream = fakeUpstream(() => json({ status: 'healthy' }));
    await proxyApi(apiRequest('/api/health?deep=1'), {}, { fetchImpl: upstream.fetchImpl });
    await proxyApi(
      apiRequest('/api/threads/7/messages?page=2'),
      { BACKEND_URL: 'https://b.test' },
      { fetchImpl: upstream.fetchImpl },
    );
    expect(upstream.calls.map(call => call.url)).toEqual([
      'https://api.dualmindlab.tech/health?deep=1',
      'https://b.test/api/threads/7/messages?page=2',
    ]);
    expect(backendPathFor('/api/healthz')).toBe('/api/healthz');
  });

  it('passes the method and body through; GET and HEAD send no body', async () => {
    const upstream = fakeUpstream(async (_url, init) =>
      json({ got: await new Response(init.body).text() }),
    );
    const response = await proxyApi(
      apiRequest('/api/arena/vote', {
        method: 'POST',
        body: '{"winner":"a"}',
        headers: { 'Content-Type': 'application/json' },
      }),
      {},
      { fetchImpl: upstream.fetchImpl },
    );
    expect(upstream.calls[0]?.init.method).toBe('POST');
    expect(await response.json()).toEqual({ got: '{"winner":"a"}' });

    await proxyApi(
      apiRequest('/api/models', { method: 'HEAD' }),
      {},
      { fetchImpl: upstream.fetchImpl },
    );
    expect(upstream.calls[1]?.init.body).toBeUndefined();
  });

  it('proxies OPTIONS like any other method (no CORS preflight answer from the Worker)', async () => {
    const upstream = fakeUpstream(() => new Response(null, { status: 204 }));
    const response = await proxyApi(
      apiRequest('/api/models', { method: 'OPTIONS' }),
      {},
      { fetchImpl: upstream.fetchImpl },
    );
    expect(upstream.calls[0]?.init.method).toBe('OPTIONS');
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('request ids', () => {
  it('keeps a sane caller id, replaces anything else', () => {
    expect(sanitizeRequestId('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(
      '0f8fad5b-d9cb-469f-a165-70867728950e',
    );
    expect(sanitizeRequestId('trace:abc.def_123')).toBe('trace:abc.def_123');
    for (const bad of [
      null,
      '',
      'short',
      'has space here',
      'x'.repeat(129),
      'inject\r\nheader:1',
      '<script>',
    ]) {
      expect(sanitizeRequestId(bad), String(bad)).toBeNull();
    }
  });

  it('generates one when missing and echoes it on the response', async () => {
    const upstream = fakeUpstream(() => json({ ok: true }));
    const response = await proxyApi(
      apiRequest('/api/models'),
      {},
      {
        fetchImpl: upstream.fetchImpl,
        newId: () => 'generated-id-0001',
      },
    );
    expect(upstream.calls[0]?.headers.get('x-request-id')).toBe('generated-id-0001');
    expect(response.headers.get('x-request-id')).toBe('generated-id-0001');
  });
});

describe('response side', () => {
  it('passes status, body and headers through, minus CORS and proxy debug headers', async () => {
    const upstream = fakeUpstream(() =>
      json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: {
            'Retry-After': '30',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
            'X-Dualmind-Proxy-Backend': 'https://api.dualmindlab.tech',
          },
        },
      ),
    );
    const response = await proxyApi(
      apiRequest('/api/arena/battle', { method: 'POST', body: '{}' }),
      {},
      { fetchImpl: upstream.fetchImpl },
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'rate_limited' });
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
    expect(response.headers.get('x-dualmind-proxy-backend')).toBeNull();
  });

  it('upstream failure: 502 with a generic body, no error details', async () => {
    const upstream = fakeUpstream(() => {
      throw new TypeError('connect ECONNREFUSED 10.0.0.1:443 (internal detail)');
    });
    const response = await proxyApi(
      apiRequest('/api/models'),
      {},
      {
        fetchImpl: upstream.fetchImpl,
        newId: () => 'failure-id-0001',
      },
    );
    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('x-request-id')).toBe('failure-id-0001');
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: 'bad_gateway', requestId: 'failure-id-0001' });
    expect(text).not.toContain('ECONNREFUSED');
  });

  it('model calls get a longer timeout than other calls', () => {
    expect(upstreamTimeoutFor('/api/arena/dualchat')).toBe(MODEL_CALL_TIMEOUT_MS);
    expect(upstreamTimeoutFor('/api/arena/chat')).toBe(MODEL_CALL_TIMEOUT_MS);
    expect(upstreamTimeoutFor('/api/arena/chat/stream')).toBe(UPSTREAM_TIMEOUT_MS);
    expect(upstreamTimeoutFor('/api/threads')).toBe(UPSTREAM_TIMEOUT_MS);
    expect(upstreamTimeoutFor('/api/health')).toBe(UPSTREAM_TIMEOUT_MS);
    expect(MODEL_CALL_TIMEOUT_MS).toBeGreaterThan(60_000);
  });

  it('no answer within the timeout: 504', async () => {
    const upstream = fakeUpstream(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const response = await proxyApi(
      apiRequest('/api/arena/battle', { method: 'POST', body: '{}' }),
      {},
      {
        fetchImpl: upstream.fetchImpl,
        timeoutMs: 20,
        newId: () => 'timeout-id-0001',
      },
    );
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      error: 'gateway_timeout',
      requestId: 'timeout-id-0001',
    });
  });

  it('a slow ordinary body is cut at the timeout', async () => {
    const upstream = fakeUpstream((_url, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"partial":'));
          init.signal?.addEventListener('abort', () =>
            controller.error(new DOMException('aborted', 'AbortError')),
          );
        },
      });
      return new Response(body, { headers: { 'content-type': 'application/json' } });
    });
    const response = await proxyApi(
      apiRequest('/api/models'),
      {},
      { fetchImpl: upstream.fetchImpl, timeoutMs: 20 },
    );
    expect(response.status).toBe(200);
    await expect(response.text()).rejects.toThrow();
  });

  it('an event stream is never cut by the timeout, and streams untouched', async () => {
    const upstream = fakeUpstream((_url, init) => {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Like a real fetch: an abort would error the body.
          init.signal?.addEventListener('abort', () =>
            controller.error(new DOMException('aborted', 'AbortError')),
          );
          controller.enqueue(encoder.encode('data: {"type":"ai.stream.delta","delta":"Hel"}\n\n'));
          await new Promise(resolve => setTimeout(resolve, 60));
          controller.enqueue(encoder.encode('data: {"type":"ai.stream.done"}\n\n'));
          controller.close();
        },
      });
      return new Response(body, {
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      });
    });
    const response = await proxyApi(
      apiRequest('/api/arena/chat/stream', { method: 'POST', body: '{}' }),
      {},
      {
        fetchImpl: upstream.fetchImpl,
        timeoutMs: 20,
      },
    );
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(await response.text()).toBe(
      'data: {"type":"ai.stream.delta","delta":"Hel"}\n\ndata: {"type":"ai.stream.done"}\n\n',
    );
  });
});

describe('problem+json opt-in (BE-1)', () => {
  const PROBLEM = 'application/problem+json';
  const legacyBody = {
    object: 'ai.error',
    code: 'INVALID_REQUEST',
    message: 'prompt is required',
    timestamp: '2026-10-21T08:30:00Z',
  };
  const noLog = () => {};

  it.each([
    [null, 'no Accept'],
    ['*/*', '*/*'],
    ['application/json', 'application/json'],
    ['application/json, text/plain, */*', 'the legacy app (axios) Accept'],
    ['application/problem+json;q=0', 'q=0'],
  ] as Array<[string | null, string]>)('without the opt-in (%s: %s) the v1 error is unchanged', async accept => {
    const bodies = [
      [400, JSON.stringify(legacyBody), 'application/json'],
      [401, '', null],
      [404, '', null],
      [500, JSON.stringify({ success: false, error: 'NullReferenceException', code: 'X' }), 'application/json'],
      [502, JSON.stringify({ success: false, message: 'Backend API Error: boom', error: 'TypeError: x' }), 'application/json'],
    ] as const;
    for (const [status, text, contentType] of bodies) {
      const upstream = fakeUpstream(
        () =>
          new Response(text === '' ? null : text, {
            status,
            headers: {
              ...(contentType ? { 'content-type': contentType } : {}),
              'x-correlation-id': 'corr-9',
              'www-authenticate': 'Bearer',
            },
          }),
      );
      const response = await proxyApi(
        apiRequest('/api/arena/dualchat', accept === null ? {} : { headers: { Accept: accept } }),
        {},
        { fetchImpl: upstream.fetchImpl, log: noLog, newId: () => 'plain-id-0001' },
      );
      expect(response.status).toBe(status);
      expect(await response.text()).toBe(text);
      expect(response.headers.get('content-type')).toBe(contentType);
      expect(response.headers.get('x-correlation-id')).toBe('corr-9');
      expect(response.headers.get('www-authenticate')).toBe('Bearer');
      // The only addition on an error status is Vary: Accept.
      expect(response.headers.get('vary')).toBe('Accept');
    }
  });

  it('with the opt-in, keeps the status and request id and sets the problem headers', async () => {
    const upstream = fakeUpstream(() => json(legacyBody, { status: 400 }));
    const response = await proxyApi(
      apiRequest('/api/arena/dualchat', {
        method: 'POST',
        body: '{}',
        headers: { Accept: `application/json, ${PROBLEM}`, 'X-Request-Id': 'problem-id-0001' },
      }),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/problem+json; charset=utf-8');
    expect(response.headers.get('vary')).toBe('Accept');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('problem-id-0001');
    expect(await response.json()).toEqual({
      type: 'https://arena.dualmindlab.tech/problems/validation_error',
      title: 'Invalid request',
      status: 400,
      detail: 'prompt is required',
      instance: '/api/arena/dualchat',
      requestId: 'problem-id-0001',
      code: 'INVALID_REQUEST',
    });
  });

  it('leaves 2xx JSON and event streams alone, even when opted in', async () => {
    const ok = await proxyApi(
      apiRequest('/api/models', { headers: { Accept: PROBLEM } }),
      {},
      { fetchImpl: fakeUpstream(() => json({ items: [] })).fetchImpl, log: noLog },
    );
    expect(ok.headers.get('content-type')).toBe('application/json');
    expect(await ok.json()).toEqual({ items: [] });

    // An error status on a stream is not rewritten either.
    const stream = await proxyApi(
      apiRequest('/api/arena/chat/stream', { headers: { Accept: PROBLEM } }),
      {},
      {
        fetchImpl: fakeUpstream(
          () =>
            new Response('event: error\ndata: {}\n\n', {
              status: 500,
              headers: { 'content-type': 'text/event-stream' },
            }),
        ).fetchImpl,
        log: noLog,
      },
    );
    expect(stream.headers.get('content-type')).toBe('text/event-stream');
    expect(await stream.text()).toBe('event: error\ndata: {}\n\n');
  });

  it('the Worker 502 and 504 become problems for callers that opted in, v1 bodies otherwise', async () => {
    const failing = fakeUpstream(() => {
      throw new TypeError('connect ECONNREFUSED 10.0.0.1:443');
    });
    const problem = await proxyApi(
      apiRequest('/api/models', { headers: { Accept: PROBLEM } }),
      {},
      { fetchImpl: failing.fetchImpl, newId: () => 'bad-gateway-0001', log: noLog },
    );
    expect(problem.status).toBe(502);
    expect(problem.headers.get('content-type')).toContain(PROBLEM);
    const body = await problem.json();
    expect(body).toMatchObject({
      type: 'https://arena.dualmindlab.tech/problems/bad_gateway',
      detail: 'The API could not be reached.',
      requestId: 'bad-gateway-0001',
    });
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');

    vi.useFakeTimers();
    try {
      const stalled = fakeUpstream(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')));
          }),
      );
      const pending = proxyApi(
        apiRequest('/api/models', { headers: { Accept: PROBLEM } }),
        {},
        { fetchImpl: stalled.fetchImpl, newId: () => 'timeout-id-0001', log: noLog },
      );
      await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);
      const timeout = await pending;
      expect(timeout.status).toBe(504);
      expect(await timeout.json()).toMatchObject({
        type: 'https://arena.dualmindlab.tech/problems/gateway_timeout',
        requestId: 'timeout-id-0001',
      });
    } finally {
      vi.useRealTimers();
    }

    const legacy = await proxyApi(
      apiRequest('/api/models'),
      {},
      { fetchImpl: failing.fetchImpl, newId: () => 'bad-gateway-0002', log: noLog },
    );
    expect(await legacy.json()).toEqual({ error: 'bad_gateway', requestId: 'bad-gateway-0002' });
  });

  it('appends Accept to an existing Vary instead of replacing it', async () => {
    const upstream = fakeUpstream(
      () => new Response('', { status: 404, headers: { Vary: 'Origin' } }),
    );
    const response = await proxyApi(
      apiRequest('/api/users/me'),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(response.headers.get('vary')).toBe('Origin, Accept');
  });
});

describe('through the Worker', () => {
  it('/api/* is proxied with API security headers only', async () => {
    const backend = vi.fn(() =>
      Promise.resolve(
        json({ status: 'healthy' }, { headers: { 'Access-Control-Allow-Origin': '*' } }),
      ),
    );
    vi.stubGlobal('fetch', backend);
    const response = await worker.fetch(
      new Request(`${ORIGIN}/api/health`, {
        headers: { Cookie: 'dm_preview=1', 'X-Request-Id': 'worker-test-0001' },
      }),
      { ASSETS: fakeAssets(DIST) },
    );
    vi.unstubAllGlobals();
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('worker-test-0001');
    expect(response.headers.get('strict-transport-security')).toContain('max-age=63072000');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBeNull();
    expect(response.headers.get('content-security-policy')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('OPTIONS outside /api no longer gets a blanket CORS 204', async () => {
    const response = await worker.fetch(
      new Request(`${ORIGIN}/leaderboard/`, {
        method: 'OPTIONS',
        headers: { Cookie: 'dm_preview=1' },
      }),
      { ASSETS: fakeAssets(DIST) },
    );
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
