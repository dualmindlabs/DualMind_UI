import { describe, expect, it } from 'vitest';

import {
  classifyUpstream,
  PROBLEM_TYPE_BASE,
  rewriteErrorResponse,
  typeForStatus,
  wantsProblemJson,
} from '../../../server/problem-rewrite.js';

// BE-1: opt-in problem+json for v1 errors, one test per row of the design's mapping table.

const ORIGIN = 'https://arena.dualmindlab.tech';
const REQUEST_ID = 'req-test-0001';

const accepting = (accept: string | null) =>
  new Request(`${ORIGIN}/api/arena/dualchat`, accept === null ? {} : { headers: { Accept: accept } });

async function rewrite(
  status: number,
  body: BodyInit | null,
  init: { contentType?: string; headers?: Record<string, string> } = {},
) {
  const headers = new Headers(init.headers);
  if (init.contentType) headers.set('content-type', init.contentType);
  const events: Array<Record<string, unknown>> = [];
  const response = await rewriteErrorResponse({
    response: new Response(body, { status, headers }),
    request: accepting('application/problem+json'),
    requestId: REQUEST_ID,
    log: event => events.push(event as Record<string, unknown>),
  });
  return { response, problem: (await response.json()) as Record<string, unknown>, events };
}

const asJson = (value: unknown) => JSON.stringify(value);

describe('wantsProblemJson', () => {
  it.each([
    ['application/problem+json', true],
    ['application/json, application/problem+json;q=0.9', true],
    ['Application/Problem+JSON; charset=utf-8', true],
    ['text/html, application/problem+json;q=0.1', true],
    ['*/*', false],
    ['application/json', false],
    ['application/problem+json;q=0', false],
    ['application/problem+json; q=0.0', false],
    ['application/problem+jsonx', false],
    [null, false],
  ])('%s -> %s', (accept, expected) => {
    expect(wantsProblemJson(accepting(accept))).toBe(expected);
  });
});

describe('typeForStatus (row 9)', () => {
  it.each([
    [400, 'validation_error'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [408, 'gateway_timeout'],
    [409, 'conflict'],
    [413, 'payload_too_large'],
    [422, 'validation_error'],
    [429, 'rate_limited'],
    [418, 'validation_error'],
    [500, 'internal_error'],
    [503, 'internal_error'],
    [502, 'bad_gateway'],
    [504, 'gateway_timeout'],
  ])('%s -> %s', (status, type) => {
    expect(typeForStatus(status)).toBe(type);
  });
});

describe('the mapping table', () => {
  it('row 1: arena ai.error 400 keeps message and code', async () => {
    const { response, problem, events } = await rewrite(
      400,
      asJson({
        object: 'ai.error',
        code: 'INVALID_REQUEST',
        message: 'prompt is required',
        timestamp: '2026-10-21T08:30:00Z',
      }),
      { contentType: 'application/json' },
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/problem+json; charset=utf-8');
    expect(problem).toEqual({
      type: `${PROBLEM_TYPE_BASE}validation_error`,
      title: 'Invalid request',
      status: 400,
      detail: 'prompt is required',
      instance: '/api/arena/dualchat',
      requestId: REQUEST_ID,
      code: 'INVALID_REQUEST',
    });
    expect(events[0]).toMatchObject({ event: 'problem_rewrite', row: 1, upstreamCode: 'INVALID_REQUEST' });
  });

  it.each([
    [500, 'internal_error'],
    [502, 'bad_gateway'],
    [504, 'gateway_timeout'],
    [503, 'internal_error'],
  ])('row 1b: ai.error %s is generic and never shows the provider text (%s)', async (status, type) => {
    const { problem, events } = await rewrite(
      status,
      asJson({ object: 'ai.error', code: 'API_ERROR', message: 'openai key sk-123 rejected' }),
      { contentType: 'application/json' },
    );
    expect(problem.type).toBe(`${PROBLEM_TYPE_BASE}${type}`);
    expect(problem.detail).toBe('The model service failed.');
    expect(problem.code).toBe('API_ERROR');
    expect(JSON.stringify(problem)).not.toContain('sk-123');
    expect(events[0]).toMatchObject({ row: 1, upstreamDetail: 'openai key sk-123 rejected' });
  });

  it.each([
    [400, 'validation_error'],
    [422, 'validation_error'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
  ])('row 2: { success:false, error, code } %s -> %s with the upstream text', async (status, type) => {
    const { problem } = await rewrite(
      status,
      asJson({ success: false, error: 'Thread not found', code: 'THREAD_NOT_FOUND' }),
      { contentType: 'application/json' },
    );
    expect(problem).toMatchObject({
      type: `${PROBLEM_TYPE_BASE}${type}`,
      status,
      detail: 'Thread not found',
      code: 'THREAD_NOT_FOUND',
    });
  });

  it('row 2e: 5xx is generic', async () => {
    const { problem } = await rewrite(
      500,
      asJson({ success: false, error: 'NullReferenceException at Foo.Bar()', code: 'INTERNAL' }),
      { contentType: 'application/json' },
    );
    expect(problem.type).toBe(`${PROBLEM_TYPE_BASE}internal_error`);
    expect(problem.detail).toBe('The service failed.');
    expect(JSON.stringify(problem)).not.toContain('NullReference');
  });

  it('row 3: empty 401 keeps WWW-Authenticate', async () => {
    const { response, problem, events } = await rewrite(401, null, {
      headers: { 'www-authenticate': 'Bearer' },
    });
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
    expect(problem).toMatchObject({
      type: `${PROBLEM_TYPE_BASE}unauthorized`,
      detail: 'Sign in again.',
    });
    expect(events[0]).toMatchObject({ row: 3 });
  });

  it('row 4: empty 404', async () => {
    const { problem, events } = await rewrite(404, null);
    expect(problem).toMatchObject({
      type: `${PROBLEM_TYPE_BASE}not_found`,
      detail: 'No such resource.',
    });
    expect(events[0]).toMatchObject({ row: 4 });
  });

  it('row 7: ASP.NET ProblemDetails turns the field map into errors[]', async () => {
    const { problem } = await rewrite(
      400,
      asJson({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { Prompt: ['The Prompt field is required.', 'Too short.'], Model: 'Unknown' },
        traceId: '00-abc-01',
      }),
      { contentType: 'application/problem+json' },
    );
    expect(problem).toMatchObject({
      type: `${PROBLEM_TYPE_BASE}validation_error`,
      detail: 'One or more validation errors occurred.',
      errors: [
        { path: 'Prompt', message: 'The Prompt field is required.' },
        { path: 'Prompt', message: 'Too short.' },
        { path: 'Model', message: 'Unknown' },
      ],
    });
    expect(problem).not.toHaveProperty('traceId');
  });

  it('row 8: the legacy 502 never forwards the exception text', async () => {
    const { problem, events } = await rewrite(
      502,
      asJson({
        success: false,
        message: 'Backend API Error: connect ECONNREFUSED 10.0.0.1:443',
        error: 'TypeError: fetch failed at node:internal',
      }),
      { contentType: 'application/json' },
    );
    expect(problem).toMatchObject({
      type: `${PROBLEM_TYPE_BASE}bad_gateway`,
      detail: 'The API could not be reached.',
    });
    expect(JSON.stringify(problem)).not.toMatch(/ECONNREFUSED|TypeError|node:internal/);
    expect(events[0]).toMatchObject({ row: 8 });
  });

  it.each([
    ['not JSON', 'upstream exploded', 'text/plain', 500, 'internal_error'],
    ['malformed JSON', '{"oops":', 'application/json', 400, 'validation_error'],
    ['an unknown JSON shape', asJson({ weird: true }), 'application/json', 429, 'rate_limited'],
    ['an array', asJson([1, 2]), 'application/json', 409, 'conflict'],
  ])('row 9: %s falls back to the status', async (_name, body, contentType, status, type) => {
    const { problem, events } = await rewrite(status, body, { contentType });
    expect(problem.type).toBe(`${PROBLEM_TYPE_BASE}${type}`);
    expect(JSON.stringify(problem)).not.toContain('exploded');
    expect(events[0]).toMatchObject({ row: 9 });
  });

  it('row 9: a body over 64 KiB is not read as JSON', async () => {
    const huge = asJson({ success: false, error: 'x'.repeat(400 * 1024), code: 'BIG' });
    const { problem, events } = await rewrite(400, huge, { contentType: 'application/json' });
    expect(problem.type).toBe(`${PROBLEM_TYPE_BASE}validation_error`);
    expect(problem).not.toHaveProperty('code');
    expect(events[0]).toMatchObject({ row: 9 });
  });

  it('a JSON body is parsed without a JSON content type when it starts with {', async () => {
    const { problem } = await rewrite(400, asJson({ success: false, error: 'Bad', code: 'X' }));
    expect(problem).toMatchObject({ detail: 'Bad', code: 'X' });
  });
});

describe('detail rules', () => {
  it('cuts a long 4xx message at 300 characters with an ellipsis', async () => {
    const { problem } = await rewrite(
      400,
      asJson({ success: false, error: 'a'.repeat(900), code: 'LONG' }),
      { contentType: 'application/json' },
    );
    const detail = problem.detail as string;
    expect(detail).toHaveLength(300);
    expect(detail.endsWith('…')).toBe(true);
  });

  it('ignores a 4xx message with control characters', async () => {
    const { problem } = await rewrite(
      400,
      asJson({ success: false, error: 'line one\nat Stack.Trace()', code: 'X' }),
      { contentType: 'application/json' },
    );
    expect(problem.detail).toBe('The request was not accepted.');
  });
});

describe('headers and passthrough', () => {
  it('keeps Retry-After, x-correlation-id and Allow; drops length, encoding and validators', async () => {
    const { response } = await rewrite(429, asJson({ success: false, error: 'Slow down', code: 'RL' }), {
      contentType: 'application/json',
      headers: {
        'retry-after': '12',
        'x-correlation-id': 'corr-1',
        allow: 'GET',
        'content-length': '999',
        etag: '"abc"',
        'last-modified': 'Wed, 21 Oct 2026 07:28:00 GMT',
        'set-cookie': 'a=b',
        'access-control-allow-origin': '*',
      },
    });
    expect(response.headers.get('retry-after')).toBe('12');
    expect(response.headers.get('x-correlation-id')).toBe('corr-1');
    expect(response.headers.get('allow')).toBe('GET');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('vary')).toBe('Accept');
    expect(response.headers.get('x-request-id')).toBe(REQUEST_ID);
    for (const name of ['etag', 'last-modified', 'set-cookie', 'access-control-allow-origin']) {
      expect(response.headers.get(name)).toBeNull();
    }
    expect(response.headers.get('content-length')).not.toBe('999');
  });

  it('an upstream problem+json passes through, with requestId added when missing', async () => {
    const own = { type: `${PROBLEM_TYPE_BASE}conflict`, title: 'Conflict', status: 409, detail: 'Taken' };
    const { problem } = await rewrite(409, asJson(own), { contentType: 'application/problem+json' });
    expect(problem).toEqual({ ...own, requestId: REQUEST_ID });
    const withId = await rewrite(409, asJson({ ...own, requestId: 'theirs-123' }), {
      contentType: 'application/problem+json',
    });
    expect(withId.problem.requestId).toBe('theirs-123');
  });
});

describe('classifyUpstream', () => {
  it('is pure and total: no shape throws', () => {
    for (const body of [null, 1, 'x', [], {}, { error: { a: 1 } }, { title: 5, errors: 1 }]) {
      expect(() => classifyUpstream(400, body)).not.toThrow();
      expect(() => classifyUpstream(502, body)).not.toThrow();
    }
  });
});
