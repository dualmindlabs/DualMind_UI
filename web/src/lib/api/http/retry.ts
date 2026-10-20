import { isApiError } from '../errors';
import type { HttpMethod, RetryPolicy } from './types';

/**
 * The retry policy, shared by the transport (direct calls) and the QueryClient (queries), so a
 * request is retried by exactly one of them and with the same rules:
 *
 * - only idempotent reads (GET); a POST battle, chat, stream or vote is never retried
 *   automatically, because a retry after a timeout can create a second battle;
 * - only transient failures: network, timeout (incl. 408), 429 and 5xx (not 501);
 *   never another 4xx;
 * - at most `maxRetries` retries, exponential backoff with jitter;
 * - `Retry-After` is honoured: the wait is at least that long, and a longer wait than
 *   `maxRetryAfterMs` is not attempted (the error goes to the caller, which can tell the user).
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  maxRetryAfterMs: 20_000,
});

export function isIdempotent(method: HttpMethod): boolean {
  return method === 'GET';
}

/**
 * Whether to retry after a failure. `retriesSoFar` is 0 after the first attempt failed, the same
 * convention as TanStack Query's `failureCount`.
 */
export function shouldRetry(
  error: unknown,
  retriesSoFar: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): boolean {
  if (retriesSoFar >= policy.maxRetries) return false;
  if (!isApiError(error) || !error.retryable) return false;
  return error.retryAfterMs === undefined || error.retryAfterMs <= policy.maxRetryAfterMs;
}

/**
 * Wait before the next attempt: `base * 2^n`, capped, with "equal jitter" (half fixed, half
 * random) so clients that failed together do not retry together; never less than Retry-After.
 */
export function retryDelay(
  retriesSoFar: number,
  error: unknown,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** retriesSoFar);
  const jittered = Math.round(exponential / 2 + random() * (exponential / 2));
  const retryAfter = isApiError(error) ? (error.retryAfterMs ?? 0) : 0;
  return Math.max(jittered, retryAfter);
}

export function resolveRetryPolicy(overrides: Partial<RetryPolicy> | undefined): RetryPolicy {
  return { ...DEFAULT_RETRY_POLICY, ...overrides };
}
