import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError, type RequestEvent, type ResponseEvent } from '@/lib/api';
import { createTransport, type TransportOptions } from '@/lib/api/http/transport';

import {
  hangingFetch,
  jsonResponse,
  rejectionOf,
  scriptedFetch,
  UUID_V4,
} from './helpers';

const anything = z.unknown();
const fast = { baseDelayMs: 1, maxDelayMs: 2 };

function transportWith(fetch: TransportOptions['fetch'], options: TransportOptions = {}) {
  return createTransport({ fetch, retry: fast, ...options });
}

const get = (path = '/api/models') =>
  ({ method: 'GET', path, auth: 'none', schema: anything }) as const;

afterEach(() => {
  vi.useRealTimers();
});

describe('requests', () => {
  it('sends Accept and a UUID request id, and no Content-Type or token on a public GET', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ ok: true }));
    const getAccessToken = vi.fn(() => 'secret-token');
    const transport = transportWith(fetch, { getAccessToken });

    await expect(transport.json(get())).resolves.toEqual({ ok: true });

    const [call] = calls;
    expect(call?.url).toBe('/api/models');
    expect(call?.init.method).toBe('GET');
    expect(call?.init.redirect).toBe('manual');
    expect(call?.init.credentials).toBe('same-origin');
    expect(call?.headers.get('accept')).toBe('application/json');
    expect(call?.headers.get('x-request-id')).toMatch(UUID_V4);
    expect(call?.headers.has('content-type')).toBe(false);
    expect(call?.headers.has('authorization')).toBe(false);
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('sends the token and a JSON body on an authenticated POST', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ ok: true }));
    const transport = transportWith(fetch, { getAccessToken: async () => '  jwt-123  ' });

    await transport.json({
      method: 'POST',
      path: '/api/threads',
      auth: 'required',
      body: { title: 'Hi' },
      schema: anything,
    });

    expect(calls[0]?.headers.get('authorization')).toBe('Bearer jwt-123');
    expect(calls[0]?.headers.get('content-type')).toBe('application/json');
    expect(calls[0]?.body).toEqual({ title: 'Hi' });
  });

  it('builds URLs from the base URL and skips undefined query values', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse([]));
    const transport = transportWith(fetch, { baseUrl: 'http://localhost:5079/' });
    expect(transport.baseUrl).toBe('http://localhost:5079');

    await transport.json({ ...get('/api/threads'), query: { limit: 20, cursor: undefined, q: 'a b' } });
    expect(calls[0]?.url).toBe('http://localhost:5079/api/threads?limit=20&q=a+b');
  });

  it('rejects a base URL that is not absolute http(s)', () => {
    expect(() => createTransport({ baseUrl: 'api.dualmindlab.tech' })).toThrow(TypeError);
    expect(() => createTransport({ baseUrl: 'ftp://example.dev' })).toThrow(/http or https/);
  });

  it('lets callers add headers but not replace the reserved ones', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({}));
    const transport = transportWith(fetch, { createRequestId: () => 'fixed-id-123' });
    await transport.json(get(), {
      headers: {
        'x-mock-scenario': 'ok',
        Authorization: 'Bearer stolen',
        'X-Request-Id': 'spoofed',
        Accept: 'text/html',
      },
    });
    const headers = calls[0]?.headers;
    expect(headers?.get('x-mock-scenario')).toBe('ok');
    expect(headers?.has('authorization')).toBe(false);
    expect(headers?.get('x-request-id')).toBe('fixed-id-123');
    expect(headers?.get('accept')).toBe('application/json');
  });

  it('uses the global fetch at call time when none is given', async () => {
    const transport = createTransport();
    const stub = vi.fn(async () => jsonResponse({ stubbed: true }));
    vi.stubGlobal('fetch', stub);
    await expect(transport.json(get())).resolves.toEqual({ stubbed: true });
    expect(stub).toHaveBeenCalledOnce();
  });
});

describe('tokens', () => {
  const required = { method: 'GET', path: '/api/models', auth: 'required', schema: anything } as const;
  const optional = { ...required, auth: 'optional' } as const;

  it('fails a required call locally when there is no token', async () => {
    for (const getAccessToken of [undefined, () => null, () => '', async () => undefined]) {
      const { fetch } = scriptedFetch(jsonResponse({}));
      const error = await rejectionOf(transportWith(fetch, { getAccessToken }).json(required));
      expect(error).toMatchObject({ kind: 'auth', code: 'NO_ACCESS_TOKEN', path: '/api/models' });
      expect(fetch).not.toHaveBeenCalled();
    }
  });

  it('sends an optional call without a token when signed out', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({}));
    await transportWith(fetch, { getAccessToken: () => null }).json(optional);
    expect(calls[0]?.headers.has('authorization')).toBe(false);
  });

  it('reports a failing token provider as an auth error', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}));
    const transport = transportWith(fetch, {
      getAccessToken: () => Promise.reject(new Error('refresh failed')),
    });
    await expect(transport.json(optional)).rejects.toMatchObject({
      kind: 'auth',
      code: 'TOKEN_UNAVAILABLE',
    });
  });
});

describe('responses', () => {
  it('validates and normalises with the schema', async () => {
    const { fetch } = scriptedFetch(jsonResponse({ n: '5' }));
    const schema = z.object({ n: z.coerce.number() });
    await expect(transportWith(fetch).json({ ...get(), schema })).resolves.toEqual({ n: 5 });
  });

  it('passes an empty 2xx body to the schema as null', async () => {
    const { fetch } = scriptedFetch(new Response(null, { status: 204 }));
    await expect(transportWith(fetch).json({ ...get(), schema: z.null() })).resolves.toBeNull();
  });

  it('turns a body that does not match the schema into bad_response', async () => {
    const { fetch } = scriptedFetch(
      jsonResponse({ items: 'nope' }, { headers: { 'x-correlation-id': 'abc12345' } }),
    );
    const schema = z.object({ items: z.array(z.string()) });
    const error = await rejectionOf(transportWith(fetch).json({ ...get(), schema }));
    expect(error).toMatchObject({
      kind: 'bad_response',
      code: 'SCHEMA_MISMATCH',
      status: 200,
      correlationId: 'abc12345',
      details: { issues: [{ path: 'items', code: 'invalid_type' }] },
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('turns invalid JSON (the waitlist HTML page) into bad_response', async () => {
    const { fetch } = scriptedFetch(
      new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }),
    );
    await expect(transportWith(fetch).json(get())).rejects.toMatchObject({
      kind: 'bad_response',
      code: 'INVALID_JSON',
      details: { contentType: 'text/html', body: '<!doctype html>' },
    });
  });

  it('treats an ai.error body as an error even with status 200', async () => {
    const { fetch } = scriptedFetch(
      jsonResponse({ object: 'ai.error', code: 'INVALID_REQUEST', message: 'Prompt is required' }),
    );
    await expect(transportWith(fetch).json(get())).rejects.toMatchObject({
      kind: 'validation',
      code: 'INVALID_REQUEST',
      message: 'Prompt is required',
    });
  });

  it('reports a redirect instead of following it', async () => {
    const { fetch } = scriptedFetch(
      new Response(null, { status: 302, headers: { location: 'https://early.dualmindlab.tech/' } }),
    );
    await expect(transportWith(fetch).json(get())).rejects.toMatchObject({
      kind: 'bad_response',
      code: 'UNEXPECTED_REDIRECT',
      status: 302,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('normalises error statuses with the request and correlation ids', async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(undefined, {
        status: 401,
        headers: { 'www-authenticate': 'Bearer', 'x-correlation-id': '471afe95' },
      }),
    );
    const transport = transportWith(fetch, { createRequestId: () => 'req-abc-123' });
    const error = await rejectionOf(transport.json(get()));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: 'auth',
      status: 401,
      requestId: 'req-abc-123',
      correlationId: '471afe95',
      method: 'GET',
      path: '/api/models',
    });
  });
});

describe('timeouts and aborts', () => {
  it('times out with kind timeout', async () => {
    const fetch = hangingFetch();
    const transport = transportWith(fetch, { retry: { maxRetries: 0 } });
    const error = await rejectionOf(transport.json(get(), { timeoutMs: 20 }));
    expect(error).toMatchObject({ kind: 'timeout', code: 'TIMEOUT' });
    expect((error as ApiError).message).toContain('20 ms');
  });

  it('uses the endpoint timeout, then the client default', async () => {
    const fetch = hangingFetch();
    const transport = transportWith(fetch, { timeoutMs: 15, retry: { maxRetries: 0 } });
    await expect(transport.json(get())).rejects.toMatchObject({ kind: 'timeout' });
    await expect(transport.json({ ...get(), timeoutMs: 10 })).rejects.toThrow(/10 ms/);
  });

  it('rejects with kind aborted when the caller aborts', async () => {
    const fetch = hangingFetch();
    const controller = new AbortController();
    const pending = transportWith(fetch).json(get(), { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('does not call fetch with an already aborted signal', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}));
    const controller = new AbortController();
    controller.abort();
    await expect(
      transportWith(fetch).json(get(), { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'aborted' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stops waiting between retries when aborted', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}, { status: 503 }));
    const controller = new AbortController();
    const transport = transportWith(fetch, { retry: { baseDelayMs: 10_000, maxDelayMs: 10_000 } });
    const pending = transport.json(get(), { signal: controller.signal });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe('retries', () => {
  const statuses = (status: number) => scriptedFetch(jsonResponse({}, { status }));

  it.each([408, 429, 500, 502, 503, 504])('retries a GET twice on %i', async status => {
    const { fetch } = statuses(status);
    await expect(transportWith(fetch).json(get())).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403, 404, 409, 422, 501])('never retries a GET on %i', async status => {
    const { fetch } = statuses(status);
    await expect(transportWith(fetch).json(get())).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('retries network errors and returns the first success', async () => {
    const { fetch, calls } = scriptedFetch(
      new TypeError('Failed to fetch'),
      jsonResponse({}, { status: 502 }),
      jsonResponse({ ok: 1 }),
    );
    await expect(transportWith(fetch).json(get())).resolves.toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledTimes(3);
    // One id per call: every attempt carries the same x-request-id.
    const ids = new Set(calls.map(call => call.headers.get('x-request-id')));
    expect(ids.size).toBe(1);
  });

  it.each(['POST', 'PATCH', 'DELETE'] as const)('never retries a %s', async method => {
    const { fetch } = statuses(503);
    const error = await rejectionOf(
      transportWith(fetch).json({ method, path: '/api/arena/dualchat', auth: 'none', schema: anything }),
    );
    expect(error).toMatchObject({ kind: 'server', status: 503 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('does not retry a GET when the call opts out (TanStack Query retries instead)', async () => {
    const { fetch } = statuses(503);
    await expect(transportWith(fetch).json(get(), { retry: false })).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('waits for Retry-After before retrying', async () => {
    // Only the timers the transport uses; Response body reading must keep running.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { fetch } = scriptedFetch(
      jsonResponse({}, { status: 429, headers: { 'retry-after': '2' } }),
      jsonResponse({ ok: true }),
    );
    const pending = createTransport({ fetch, random: () => 0 }).json(get());
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up at once when Retry-After is longer than the cap', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}, { status: 429, headers: { 'retry-after': '120' } }));
    const error = await rejectionOf(transportWith(fetch).json(get()));
    expect(error).toMatchObject({ kind: 'rate_limited', retryAfterMs: 120_000 });
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe('hooks', () => {
  it('reports every attempt, never the token, and survives a throwing hook', async () => {
    const requests: RequestEvent[] = [];
    const responses: ResponseEvent[] = [];
    const { fetch } = scriptedFetch(
      jsonResponse({}, { status: 503, headers: { 'x-correlation-id': 'c0ffee00' } }),
      jsonResponse({ ok: true }, { headers: { 'x-correlation-id': 'c0ffee01' } }),
    );
    const transport = transportWith(fetch, {
      getAccessToken: () => 'secret-token',
      onRequest: event => {
        requests.push(event);
        throw new Error('hook bug');
      },
      onResponse: event => responses.push(event),
    });

    await transport.json({ ...get(), auth: 'required' });

    expect(requests.map(event => event.attempt)).toEqual([0, 1]);
    expect(responses.map(event => [event.status, event.correlationId])).toEqual([
      [503, 'c0ffee00'],
      [200, 'c0ffee01'],
    ]);
    expect(responses[0]?.error?.kind).toBe('server');
    expect(responses[1]?.error).toBeNull();
    expect(responses[1]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify([requests, responses])).not.toContain('secret-token');
  });

  it('reports a network failure with status 0', async () => {
    const responses: ResponseEvent[] = [];
    const { fetch } = scriptedFetch(new TypeError('Failed to fetch'));
    const transport = transportWith(fetch, {
      retry: { maxRetries: 0 },
      onResponse: event => responses.push(event),
    });
    await expect(transport.json(get())).rejects.toMatchObject({ kind: 'network' });
    expect(responses[0]).toMatchObject({ status: 0, correlationId: null });
  });
});

describe('binary and streaming calls', () => {
  const speech = {
    method: 'POST',
    path: '/api/speech/generate',
    auth: 'none',
    accept: 'audio/*',
  } as const;

  it('returns an audio blob and sends the Accept header', async () => {
    const { fetch, calls } = scriptedFetch(
      new Response(new Uint8Array([82, 73, 70, 70]), { headers: { 'content-type': 'audio/wav' } }),
    );
    const blob = await transportWith(fetch).blob(speech);
    expect(blob.size).toBe(4);
    expect(calls[0]?.headers.get('accept')).toBe('audio/*');
  });

  it('rejects a non-audio or empty answer', async () => {
    const { fetch } = scriptedFetch(jsonResponse({ ok: true }));
    await expect(transportWith(fetch).blob(speech)).rejects.toMatchObject({
      kind: 'bad_response',
      code: 'UNEXPECTED_CONTENT',
    });
    const empty = scriptedFetch(new Response(new Uint8Array(), { headers: { 'content-type': 'audio/wav' } }));
    await expect(transportWith(empty.fetch).blob(speech)).rejects.toMatchObject({
      code: 'UNEXPECTED_CONTENT',
    });
  });

  it('opens a stream that close() and the caller signal both abort', async () => {
    const { fetch, calls } = scriptedFetch(
      () =>
        new Response('data: x\n\n', {
          headers: { 'content-type': 'text/event-stream', 'x-correlation-id': 'feed0001' },
        }),
    );
    const transport = transportWith(fetch, { createRequestId: () => 'stream-id-1' });

    const first = await transport.openStream({ ...speech, accept: 'text/event-stream' });
    expect(first.requestId).toBe('stream-id-1');
    expect(first.correlationId).toBe('feed0001');
    expect(first.signal.aborted).toBe(false);
    first.close();
    expect(first.signal.aborted).toBe(true);

    const controller = new AbortController();
    const second = await transport.openStream(
      { ...speech, accept: 'text/event-stream' },
      { signal: controller.signal },
    );
    controller.abort();
    expect(second.signal.aborted).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('never retries a stream', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}, { status: 503 }));
    await expect(
      transportWith(fetch).openStream({ ...speech, method: 'GET', accept: 'text/event-stream' }),
    ).rejects.toMatchObject({ kind: 'server' });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
