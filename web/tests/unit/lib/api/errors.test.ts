import { describe, expect, it } from 'vitest';

import {
  API_ERROR_KINDS,
  ApiError,
  type ApiErrorKind,
  getUserMessage,
  isAbortError,
  isAlreadyVotedError,
  isApiError,
  isApiErrorKind,
  isAuthError,
  isConnectivityError,
  isNotFoundError,
  isRateLimitError,
  isRetryableError,
  isUpstreamUnavailableError,
} from '@/lib/api';
import {
  errorFromResponse,
  isAiErrorBody,
  kindFromAiErrorCode,
  kindFromStatus,
  parseErrorBody,
  parseRetryAfter,
  toApiError,
} from '@/lib/api/errors';

import errors from '../../../fixtures/api/errors.json';

const error = (
  kind: ApiErrorKind,
  extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {},
) => new ApiError({ kind, message: `a ${kind} error`, ...extra });

describe('kindFromStatus', () => {
  it.each([
    [400, 'validation'],
    [401, 'auth'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [405, 'validation'],
    [408, 'timeout'],
    [409, 'validation'],
    [410, 'not_found'],
    [422, 'validation'],
    [429, 'rate_limited'],
    [500, 'server'],
    [501, 'server'],
    [502, 'server'],
    [503, 'server'],
    [504, 'timeout'],
    [302, 'bad_response'],
    [0, 'bad_response'],
  ] as const)('maps %i to %s', (status, kind) => {
    expect(kindFromStatus(status)).toBe(kind);
  });
});

describe('parseErrorBody (one test per shape in fixtures/api/errors.json)', () => {
  it('reads an arena ai.error body', () => {
    expect(parseErrorBody(errors.aiErrorValidation)).toEqual({
      message: 'Prompt is required',
      code: 'INVALID_REQUEST',
      details: { timestamp: '2026-10-20T20:43:00Z' },
    });
  });

  it('reads { success: false, error, code }', () => {
    expect(parseErrorBody(errors.successFalse)).toEqual({
      message: 'You do not own this thread',
      code: 'FORBIDDEN',
      details: undefined,
    });
  });

  it('reads the hardened Worker 502 and 504 bodies as codes, not sentences', () => {
    const requestId = '3b0e2f7a-5c1d-4e8b-9a6f-0d2c4b8e1f3a';
    expect(parseErrorBody(errors.workerBadGateway)).toEqual({
      message: undefined,
      code: 'BAD_GATEWAY',
      details: { requestId },
    });
    expect(parseErrorBody(errors.workerGatewayTimeout).code).toBe('GATEWAY_TIMEOUT');
  });

  it('prefers the message over the stack-like error of the legacy Worker 502', () => {
    expect(parseErrorBody(errors.legacyWorkerBadGateway)).toEqual({
      message: 'Backend API Error: fetch failed',
      code: undefined,
      details: undefined,
    });
  });

  it('reads ASP.NET ProblemDetails with field errors', () => {
    expect(parseErrorBody(errors.problemDetails)).toEqual({
      message: 'One or more validation errors occurred.',
      code: undefined,
      details: { fields: { Prompt: ['The Prompt field is required.'] } },
    });
  });

  it('reads problem+json from the proxy: detail, retained code, errors and request id', () => {
    const base = 'https://arena.dualmindlab.tech/problems/';
    expect(
      parseErrorBody({
        type: `${base}validation_error`,
        title: 'Invalid request',
        status: 400,
        detail: 'prompt is required',
        requestId: 'req-12345678',
        code: 'INVALID_REQUEST',
        errors: [{ path: 'prompt', message: 'required' }],
      }),
    ).toEqual({
      message: 'prompt is required',
      code: 'INVALID_REQUEST',
      details: { errors: [{ path: 'prompt', message: 'required' }], requestId: 'req-12345678' },
    });
  });

  it('problem+json without a code falls back to the type slug; the title without a detail', () => {
    expect(
      parseErrorBody({
        type: 'https://arena.dualmindlab.tech/problems/gateway_timeout',
        title: 'Gateway timeout',
        status: 504,
      }),
    ).toEqual({ message: 'Gateway timeout', code: 'GATEWAY_TIMEOUT', details: undefined });
  });

  it('problem+json keeps the kind and retryable flag the status gave', () => {
    const apiError = errorFromResponse({
      status: 429,
      headers: new Headers({ 'retry-after': '3' }),
      body: {
        type: 'https://arena.dualmindlab.tech/problems/rate_limited',
        title: 'Too many requests',
        status: 429,
        detail: 'Too many requests. Try again later.',
      },
    });
    expect(apiError.kind).toBe('rate_limited');
    expect(apiError.retryable).toBe(true);
    expect(apiError.code).toBe('RATE_LIMITED');
    expect(apiError.retryAfterMs).toBe(3000);
    expect(apiError.message).toBe('Too many requests. Try again later.');
  });

  it('reads the proposed nested { error: { code, message, details } }', () => {
    expect(parseErrorBody(errors.nestedError)).toEqual({
      message: 'Daily battle limit reached',
      code: 'QUOTA_EXCEEDED',
      details: { limit: 50 },
    });
  });

  it('returns nothing for empty, non-object and blank bodies', () => {
    for (const body of [null, undefined, '', 'Bad Gateway', 42, [], { message: '  ' }]) {
      const parsed = parseErrorBody(body);
      expect(parsed.message, JSON.stringify(body)).toBeUndefined();
      expect(parsed.code).toBeUndefined();
    }
  });
});

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');

  it('reads delay seconds', () => {
    expect(parseRetryAfter('2', now)).toBe(2000);
    expect(parseRetryAfter(' 0 ', now)).toBe(0);
    expect(parseRetryAfter('1.5', now)).toBe(1500);
  });

  it('reads an HTTP date, never negative', () => {
    expect(parseRetryAfter('Tue, 20 Oct 2026 12:00:30 GMT', now)).toBe(30_000);
    expect(parseRetryAfter('Tue, 20 Oct 2026 11:00:00 GMT', now)).toBe(0);
  });

  it('ignores missing and invalid values', () => {
    for (const value of [null, undefined, '', 'soon', '-5']) {
      expect(parseRetryAfter(value, now)).toBeUndefined();
    }
  });
});

describe('errorFromResponse', () => {
  it('builds a typed error with ids, code and Retry-After', () => {
    const result = errorFromResponse({
      status: 429,
      body: { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
      headers: new Headers({ 'x-correlation-id': '471afe95', 'retry-after': '3' }),
      requestId: 'req-1',
      method: 'GET',
      path: '/api/threads',
    });
    expect(result).toBeInstanceOf(ApiError);
    expect(result).toMatchObject({
      kind: 'rate_limited',
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      requestId: 'req-1',
      correlationId: '471afe95',
      retryAfterMs: 3000,
      method: 'GET',
      path: '/api/threads',
    });
  });

  it('falls back to a status message and the kind code for an empty 401', () => {
    const result = errorFromResponse({ status: 401, body: null, headers: new Headers() });
    expect(result.kind).toBe('auth');
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.message).toBe('Request failed with status 401');
    expect(result.correlationId).toBeUndefined();
  });

  it('keeps a snippet of a non-JSON body for logs', () => {
    const html = `<html>${'x'.repeat(500)}</html>`;
    const result = errorFromResponse({ status: 503, body: html, headers: new Headers() });
    expect(result.kind).toBe('server');
    expect(result.details).toEqual({ body: html.slice(0, 300) });
  });

  it('maps the Worker 504 to a timeout', () => {
    const result = errorFromResponse({
      status: 504,
      body: errors.workerGatewayTimeout,
      headers: new Headers(),
    });
    expect(result).toMatchObject({ kind: 'timeout', code: 'GATEWAY_TIMEOUT', retryable: true });
  });
});

describe('ApiError', () => {
  it('is an Error with a name, kind and log-safe JSON', () => {
    const cause = new TypeError('Failed to fetch');
    const result = error('network', { requestId: 'r-1', cause });
    expect(result).toBeInstanceOf(Error);
    expect(result.name).toBe('ApiError');
    expect(result.status).toBe(0);
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.cause).toBe(cause);
    expect(result.toJSON()).toMatchObject({ kind: 'network', requestId: 'r-1', status: 0 });
    expect(JSON.stringify(result)).toContain('"kind":"network"');
  });

  it('marks only transient kinds as retryable, never 501', () => {
    const retryable = API_ERROR_KINDS.filter(kind => error(kind).retryable);
    expect(retryable).toEqual(['network', 'timeout', 'rate_limited', 'server']);
    expect(error('server', { status: 501 }).retryable).toBe(false);
    expect(error('server', { status: 503 }).retryable).toBe(true);
  });
});

describe('type guards', () => {
  it('narrow by kind', () => {
    expect(isApiError(error('auth'))).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiErrorKind(error('forbidden'), 'auth', 'forbidden')).toBe(true);
    expect(isApiErrorKind(error('server'), 'auth', 'forbidden')).toBe(false);
    expect(isAuthError(error('auth'))).toBe(true);
    expect(isConnectivityError(error('timeout'))).toBe(true);
    expect(isConnectivityError(error('network'))).toBe(true);
    expect(isConnectivityError(error('server'))).toBe(false);
    expect(isAbortError(error('aborted'))).toBe(true);
    expect(isRateLimitError(error('rate_limited'))).toBe(true);
    expect(isNotFoundError(error('not_found'))).toBe(true);
    expect(isRetryableError(error('server'))).toBe(true);
    expect(isRetryableError(new Error('plain'))).toBe(false);
  });
});

describe('getUserMessage', () => {
  it('has a plain message for every kind', () => {
    for (const kind of API_ERROR_KINDS) {
      const message = getUserMessage(error(kind));
      expect(message.length, kind).toBeGreaterThan(10);
      expect(message, kind).not.toContain('undefined');
    }
  });

  it('shows a short server message for validation errors only', () => {
    expect(getUserMessage(error('validation', { message: 'Prompt is required' }))).toBe(
      'Prompt is required',
    );
    expect(getUserMessage(error('server', { message: 'Prompt is required' }))).not.toBe(
      'Prompt is required',
    );
  });

  it('hides validation messages that look technical or are status fallbacks', () => {
    for (const message of [
      'System.ArgumentException: value cannot be null',
      'Unexpected token < in JSON at position 0 {}',
      'x'.repeat(200),
      'Request failed with status 400',
    ]) {
      expect(getUserMessage(error('validation', { message }))).toBe(
        'That request was not accepted. Check it and try again.',
      );
    }
  });

  it('says how long to wait when the API sent Retry-After', () => {
    expect(getUserMessage(error('rate_limited', { retryAfterMs: 2500 }))).toBe(
      'Too many requests. Try again in 3 seconds.',
    );
    expect(getUserMessage(error('rate_limited'))).toMatch(/wait a moment/i);
  });

  it('says both models are busy for the 503 upstream_unavailable problem', () => {
    const problem = errorFromResponse({
      status: 503,
      headers: new Headers({ 'retry-after': '5' }),
      body: {
        type: 'https://arena.dualmindlab.tech/problems/upstream_unavailable',
        title: 'Models unavailable',
        status: 503,
        detail: 'No model answered.',
        code: 'MODEL_UNAVAILABLE',
        message: 'No model answered.',
        models: ['a', 'b'],
      },
    });
    expect(problem.kind).toBe('server');
    expect(problem.code).toBe('MODEL_UNAVAILABLE');
    expect(isUpstreamUnavailableError(problem)).toBe(true);
    expect(getUserMessage(problem)).toBe('Both models are busy right now. Try again in a moment.');
    // The slug alone (the code member missing) is enough, through the Worker's problem body.
    const bySlug = errorFromResponse({
      status: 503,
      headers: new Headers(),
      body: {
        type: 'https://arena.dualmindlab.tech/problems/upstream_unavailable',
        title: 'Models unavailable',
        status: 503,
      },
    });
    expect(bySlug.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(getUserMessage(bySlug)).toBe('Both models are busy right now. Try again in a moment.');
  });

  it('keeps the generic server message for any other 5xx, including a plain 503', () => {
    expect(isUpstreamUnavailableError(error('server', { status: 503, code: 'SERVER_ERROR' }))).toBe(
      false,
    );
    expect(
      isUpstreamUnavailableError(error('server', { status: 500, code: 'MODEL_UNAVAILABLE' })),
    ).toBe(false);
    expect(getUserMessage(error('server', { status: 503 }))).toBe(
      'Something went wrong on our side. Please try again.',
    );
  });

  it('recognises a vote the API already counted (409)', () => {
    const duplicate = errorFromResponse({
      status: 409,
      headers: new Headers(),
      body: {
        type: 'https://arena.dualmindlab.tech/problems/conflict',
        title: 'Conflict',
        status: 409,
        code: 'ALREADY_VOTED',
      },
    });
    expect(duplicate.code).toBe('ALREADY_VOTED');
    expect(isAlreadyVotedError(duplicate)).toBe(true);
    expect(isAlreadyVotedError(error('validation', { status: 400 }))).toBe(false);
    expect(isAlreadyVotedError(new Error('x'))).toBe(false);
  });

  it('has a generic message for anything that is not an ApiError', () => {
    expect(getUserMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(getUserMessage('boom')).toBe('Something went wrong. Please try again.');
  });
});

describe('toApiError', () => {
  const context = { requestId: 'r-9', method: 'GET', path: '/api/x' };

  it('passes ApiErrors through', () => {
    const original = error('server');
    expect(toApiError(original, context)).toBe(original);
  });

  it('maps AbortError, TimeoutError, TypeError and anything else', () => {
    expect(toApiError(new DOMException('aborted', 'AbortError'), context)).toMatchObject({
      kind: 'aborted',
      ...context,
    });
    expect(toApiError(new DOMException('slow', 'TimeoutError'), context).kind).toBe('timeout');
    expect(toApiError(new TypeError('Failed to fetch'), context)).toMatchObject({
      kind: 'network',
      message: 'Network error: Failed to fetch',
    });
    expect(toApiError('weird', context)).toMatchObject({ kind: 'network', message: 'weird' });
    expect(toApiError(new RangeError(''), context).message).toBe('Unknown error');
  });
});

describe('ai.error helpers', () => {
  it('recognise the body and map codes to kinds', () => {
    expect(isAiErrorBody(errors.aiErrorProvider)).toBe(true);
    expect(isAiErrorBody(errors.successFalse)).toBe(false);
    expect(kindFromAiErrorCode('INVALID_REQUEST')).toBe('validation');
    expect(kindFromAiErrorCode('UNAUTHORIZED')).toBe('auth');
    expect(kindFromAiErrorCode('RATE_LIMITED')).toBe('rate_limited');
    expect(kindFromAiErrorCode('API_ERROR')).toBe('server');
    expect(kindFromAiErrorCode('STREAM_ERROR')).toBe('server');
    expect(kindFromAiErrorCode(undefined)).toBe('server');
  });
});
