import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AUDIO_ALIAS,
  DEPRECATION,
  MAX_ALIAS_BODY_BYTES,
  MAX_TTS_TEXT_LENGTH,
  parseAliasBody,
} from '../../../server/audio-alias.js';
import { proxyApi } from '../../../server/api-proxy.js';

// BE-2: the deprecated /api/audio/tts alias of /api/speech/generate.

const ORIGIN = 'https://arena.dualmindlab.tech';
const noLog = () => {};

function post(body: BodyInit | null, headers: Record<string, string> = {}, path: string = AUDIO_ALIAS.from) {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

/** 44 bytes of a WAV header plus a deterministic payload, 1 KiB in all. */
function wavFixture(size = 1024) {
  const bytes = new Uint8Array(size);
  bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
  for (let i = 12; i < size; i += 1) bytes[i] = i % 251;
  return bytes;
}

function fakeUpstream(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit; headers: Headers; body: string }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, headers: new Headers(init.headers), body: String(init.body ?? '') });
    return respond(url, init);
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('parseAliasBody', () => {
  const bad = async (request: Request, status: number, error: string) =>
    expect(await parseAliasBody(request)).toMatchObject({ ok: false, status, error });

  it('accepts text, trims it, passes voice and drops unknown fields', async () => {
    const parsed = await parseAliasBody(
      post(JSON.stringify({ text: '  Paris is the capital.  ', voice: 'alloy', extra: 1 })),
    );
    expect(parsed).toEqual({ ok: true, body: { text: 'Paris is the capital.', voice: 'alloy' } });
    expect(await parseAliasBody(post('{"text":"hi"}'))).toEqual({ ok: true, body: { text: 'hi' } });
  });

  it('accepts a JSON content type with parameters', async () => {
    const request = post('{"text":"hi"}', { 'Content-Type': 'application/json; charset=utf-8' });
    expect(await parseAliasBody(request)).toMatchObject({ ok: true });
  });

  it('rejects an empty, whitespace, missing, non-string or too long text', async () => {
    await bad(post('{"text":""}'), 400, 'invalid_request');
    await bad(post('{"text":"   "}'), 400, 'invalid_request');
    await bad(post('{}'), 400, 'invalid_request');
    await bad(post('{"text":5}'), 400, 'invalid_request');
    await bad(post(JSON.stringify({ text: 'a'.repeat(MAX_TTS_TEXT_LENGTH + 1) })), 400, 'invalid_request');
    expect(
      await parseAliasBody(post(JSON.stringify({ text: 'a'.repeat(MAX_TTS_TEXT_LENGTH) }))),
    ).toMatchObject({ ok: true });
  });

  it('rejects invalid JSON, arrays and a bad voice', async () => {
    await bad(post('{"text":'), 400, 'invalid_request');
    await bad(post('[{"text":"hi"}]'), 400, 'invalid_request');
    await bad(post('"hi"'), 400, 'invalid_request');
    await bad(post('{"text":"hi","voice":"has space"}'), 400, 'invalid_request');
    await bad(post('{"text":"hi","voice":""}'), 400, 'invalid_request');
    await bad(post(`{"text":"hi","voice":"${'v'.repeat(65)}"}`), 400, 'invalid_request');
    await bad(post('{"text":"hi","voice":7}'), 400, 'invalid_request');
  });

  it('rejects a non-JSON content type with 415', async () => {
    await bad(post('{"text":"hi"}', { 'Content-Type': 'text/plain' }), 415, 'unsupported_media_type');
  });

  it('rejects a body over 16 KiB with and without Content-Length', async () => {
    const big = JSON.stringify({ text: 'a'.repeat(MAX_ALIAS_BODY_BYTES) });
    await bad(post(big, { 'Content-Length': String(big.length) }), 413, 'payload_too_large');
    // No Content-Length: a streamed body is counted as it is read.
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const streamed = new Request(`${ORIGIN}${AUDIO_ALIAS.from}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    await bad(streamed, 413, 'payload_too_large');
  });

  it('answers other methods with 405 and Allow: POST', async () => {
    const result = await parseAliasBody(new Request(`${ORIGIN}${AUDIO_ALIAS.from}`));
    expect(result).toMatchObject({ ok: false, status: 405, headers: { Allow: 'POST' } });
  });
});

describe('through the proxy', () => {
  it('forwards exactly { text, voice } to /api/speech/generate and streams the WAV back', async () => {
    const wav = wavFixture();
    const upstream = fakeUpstream(
      () => new Response(wav, { headers: { 'content-type': 'audio/wav', etag: '"x"' } }),
    );
    const response = await proxyApi(
      post(JSON.stringify({ text: 'Hello', voice: 'alloy', admin: true }), {
        Authorization: 'Bearer tok',
        'X-Request-Id': 'tts-request-0001',
        Cookie: 'secret=1',
      }),
      { BACKEND_URL: 'https://b.test' },
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(upstream.calls).toHaveLength(1);
    const call = upstream.calls[0]!;
    expect(call.url).toBe('https://b.test/api/speech/generate');
    expect(call.init.method).toBe('POST');
    expect(call.body).toBe('{"text":"Hello","voice":"alloy"}');
    expect(call.headers.get('authorization')).toBe('Bearer tok');
    expect(call.headers.get('x-request-id')).toBe('tts-request-0001');
    expect(call.headers.get('content-type')).toBe('application/json');
    expect(call.headers.get('accept')).toBe('audio/wav, audio/*;q=0.9, application/json;q=0.5');
    expect(call.headers.has('cookie')).toBe(false);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('deprecation')).toBe(DEPRECATION);
    expect(response.headers.get('link')).toBe('</api/speech/generate>; rel="successor-version"');
    expect(response.headers.get('x-request-id')).toBe('tts-request-0001');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(wav);
  });

  it('repairs application/octet-stream when the body is RIFF/WAVE', async () => {
    const wav = wavFixture();
    const upstream = fakeUpstream(
      () => new Response(wav, { headers: { 'content-type': 'application/octet-stream' } }),
    );
    const response = await proxyApi(post('{"text":"hi"}'), {}, { fetchImpl: upstream.fetchImpl, log: noLog });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(wav);
  });

  it('repairs a missing content type, even when the first chunk is shorter than 12 bytes', async () => {
    const wav = wavFixture(64);
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(wav.subarray(0, 5));
        controller.enqueue(wav.subarray(5, 20));
        controller.enqueue(wav.subarray(20));
        controller.close();
      },
    });
    const upstream = fakeUpstream(() => new Response(body));
    const response = await proxyApi(post('{"text":"hi"}'), {}, { fetchImpl: upstream.fetchImpl, log: noLog });
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(wav);
  });

  it('keeps another audio type (audio/mpeg)', async () => {
    const upstream = fakeUpstream(
      () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }),
    );
    const response = await proxyApi(post('{"text":"hi"}'), {}, { fetchImpl: upstream.fetchImpl, log: noLog });
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
  });

  it('turns an octet-stream body that is not RIFF into a 502', async () => {
    const upstream = fakeUpstream(
      () =>
        new Response(new TextEncoder().encode('not audio at all'), {
          headers: { 'content-type': 'application/octet-stream' },
        }),
    );
    const response = await proxyApi(
      post('{"text":"hi"}'),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog, newId: () => 'alias-502-0001' },
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'bad_gateway', requestId: 'alias-502-0001' });
  });

  it('turns a 2xx JSON answer into a 502', async () => {
    const upstream = fakeUpstream(
      () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }),
    );
    const response = await proxyApi(post('{"text":"hi"}'), {}, { fetchImpl: upstream.fetchImpl, log: noLog });
    expect(response.status).toBe(502);
  });

  it('passes an upstream 401 through untouched (and a problem when opted in)', async () => {
    const upstream = fakeUpstream(
      () => new Response(null, { status: 401, headers: { 'www-authenticate': 'Bearer' } }),
    );
    const plain = await proxyApi(post('{"text":"hi"}'), {}, { fetchImpl: upstream.fetchImpl, log: noLog });
    expect(plain.status).toBe(401);
    expect(await plain.text()).toBe('');
    expect(plain.headers.get('deprecation')).toBeNull();

    const problem = await proxyApi(
      post('{"text":"hi"}', { Accept: 'audio/*, application/problem+json;q=0.9' }),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(problem.status).toBe(401);
    expect(problem.headers.get('content-type')).toContain('application/problem+json');
    expect(await problem.json()).toMatchObject({
      type: 'https://arena.dualmindlab.tech/problems/unauthorized',
      instance: '/api/audio/tts',
    });
  });

  it('validation errors never reach the upstream: legacy bodies, or problems when opted in', async () => {
    const upstream = fakeUpstream(() => new Response('unused'));
    const legacy = await proxyApi(
      post('{"text":""}'),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog, newId: () => 'alias-400-0001' },
    );
    expect(legacy.status).toBe(400);
    expect(await legacy.json()).toEqual({ error: 'invalid_request', requestId: 'alias-400-0001' });

    const wrongType = await proxyApi(
      post('x', { 'Content-Type': 'text/plain', Accept: 'application/problem+json' }),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(wrongType.status).toBe(415);
    expect(await wrongType.json()).toMatchObject({
      type: 'https://arena.dualmindlab.tech/problems/unsupported_media_type',
    });

    const tooBig = await proxyApi(
      post(JSON.stringify({ text: 'a'.repeat(MAX_ALIAS_BODY_BYTES) })),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(tooBig.status).toBe(413);
    expect(upstream.calls).toHaveLength(0);
  });

  it('GET answers 405 with Allow: POST and does not call the upstream', async () => {
    const upstream = fakeUpstream(() => new Response('unused'));
    const response = await proxyApi(
      new Request(`${ORIGIN}${AUDIO_ALIAS.from}`),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(upstream.calls).toHaveLength(0);
  });

  it('504 on a stalled upstream (30 s)', async () => {
    vi.useFakeTimers();
    const upstream = fakeUpstream(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const pending = proxyApi(
      post('{"text":"hi"}'),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog, newId: () => 'alias-504-0001' },
    );
    await vi.advanceTimersByTimeAsync(30_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: 'gateway_timeout', requestId: 'alias-504-0001' });
  });

  it('logs tts_alias_used with lengths only, never the text', async () => {
    const events: object[] = [];
    const upstream = fakeUpstream(
      () => new Response(wavFixture(), { headers: { 'content-type': 'audio/wav' } }),
    );
    await proxyApi(
      post('{"text":"a secret answer","voice":"alloy"}'),
      {},
      { fetchImpl: upstream.fetchImpl, log: event => events.push(event) },
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: 'tts_alias_used', textLength: 15, hasVoice: true, status: 200 });
    expect(JSON.stringify(events)).not.toContain('secret');
  });

  it('does not touch the real route: /api/speech/generate is a plain v1 proxy call', async () => {
    const upstream = fakeUpstream(
      () => new Response(wavFixture(), { headers: { 'content-type': 'audio/wav' } }),
    );
    const response = await proxyApi(
      post('{"text":"hi","extra":1}', {}, '/api/speech/generate'),
      {},
      { fetchImpl: upstream.fetchImpl, log: noLog },
    );
    expect(upstream.calls[0]?.body).toBe('{"text":"hi","extra":1}');
    expect(response.headers.get('deprecation')).toBeNull();
  });
});
