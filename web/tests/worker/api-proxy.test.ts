import { describe, expect, it, vi } from 'vitest';

import {
  backendPathFor,
  FORWARDED_REQUEST_HEADERS,
  proxyApi,
  sanitizeRequestId,
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
