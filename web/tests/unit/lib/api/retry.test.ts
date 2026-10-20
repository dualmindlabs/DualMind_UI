import { describe, expect, it } from 'vitest';

import { ApiError, type ApiErrorKind, DEFAULT_RETRY_POLICY, retryDelay, shouldRetry } from '@/lib/api';
import { isIdempotent, resolveRetryPolicy } from '@/lib/api/http/retry';

const error = (kind: ApiErrorKind, extra: { status?: number; retryAfterMs?: number } = {}) =>
  new ApiError({ kind, message: kind, ...extra });

describe('retry policy', () => {
  it('defaults to two retries with backoff from 500 ms', () => {
    expect(DEFAULT_RETRY_POLICY).toEqual({
      maxRetries: 2,
      baseDelayMs: 500,
      maxDelayMs: 8_000,
      maxRetryAfterMs: 20_000,
    });
    expect(Object.isFrozen(DEFAULT_RETRY_POLICY)).toBe(true);
    expect(resolveRetryPolicy({ maxRetries: 0 })).toEqual({ ...DEFAULT_RETRY_POLICY, maxRetries: 0 });
  });

  it('only treats GET as idempotent', () => {
    expect(isIdempotent('GET')).toBe(true);
    for (const method of ['POST', 'PATCH', 'DELETE'] as const) expect(isIdempotent(method)).toBe(false);
  });

  it('retries transient errors at most twice', () => {
    for (const kind of ['network', 'timeout', 'rate_limited', 'server'] as const) {
      expect(shouldRetry(error(kind), 0), kind).toBe(true);
      expect(shouldRetry(error(kind), 1), kind).toBe(true);
      expect(shouldRetry(error(kind), 2), kind).toBe(false);
    }
  });

  it('never retries client errors, aborts or unreadable answers', () => {
    for (const kind of ['aborted', 'auth', 'forbidden', 'not_found', 'validation', 'bad_response'] as const) {
      expect(shouldRetry(error(kind), 0), kind).toBe(false);
    }
    expect(shouldRetry(error('server', { status: 501 }), 0)).toBe(false);
    expect(shouldRetry(new Error('not an ApiError'), 0)).toBe(false);
  });

  it('does not wait for a Retry-After longer than the cap', () => {
    expect(shouldRetry(error('rate_limited', { retryAfterMs: 20_000 }), 0)).toBe(true);
    expect(shouldRetry(error('rate_limited', { retryAfterMs: 20_001 }), 0)).toBe(false);
  });

  it('backs off exponentially with equal jitter, capped', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 1000, maxDelayMs: 3000 };
    const min = () => 0;
    const max = () => 1;
    expect(retryDelay(0, error('server'), policy, min)).toBe(500);
    expect(retryDelay(0, error('server'), policy, max)).toBe(1000);
    expect(retryDelay(1, error('server'), policy, min)).toBe(1000);
    expect(retryDelay(1, error('server'), policy, max)).toBe(2000);
    expect(retryDelay(5, error('server'), policy, max)).toBe(3000);
  });

  it('waits at least as long as Retry-After', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 100 };
    expect(retryDelay(0, error('rate_limited', { retryAfterMs: 4000 }), policy, () => 1)).toBe(4000);
    expect(retryDelay(0, error('rate_limited', { retryAfterMs: 10 }), policy, () => 1)).toBe(100);
  });
});
