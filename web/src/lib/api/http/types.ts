import type { ApiError } from '../errors';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * - `required`: the call needs a signed-in user. Without a token it fails locally with an `auth`
 *   error and never reaches the network.
 * - `optional`: a token is sent when there is one (shared threads, which owners can also read).
 * - `none`: never sends a token (health, leaderboard, feature flags, the public share view).
 */
export type AuthMode = 'required' | 'optional' | 'none';

/**
 * Returns the current Supabase access token, or null when signed out. Called once per attempt,
 * so a refreshed session is picked up between retries. Wired to Supabase in slice S6.
 */
export type AccessTokenProvider = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

/** The subset of `fetch` the client uses; the mock adapter implements the same signature. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Options every endpoint function accepts as its last argument. */
export interface CallOptions {
  /** Cancels the call, including a wait between retries. The promise rejects with kind `aborted`. */
  signal?: AbortSignal | undefined;
  /** Overrides the endpoint's default timeout for this call, in milliseconds. */
  timeoutMs?: number | undefined;
  /**
   * GET only. `false` turns the transport's retries off; the TanStack Query builders do that,
   * because the QueryClient applies the same policy itself. Never retries a POST, PATCH or DELETE.
   */
  retry?: boolean | undefined;
  /**
   * Extra request headers, for example `x-mock-scenario` in tests. They cannot replace
   * `Authorization`, `x-request-id`, `Accept` or `Content-Type`.
   */
  headers?: Readonly<Record<string, string>> | undefined;
}

export interface RequestEvent {
  requestId: string;
  method: HttpMethod;
  /** The API path without the base URL and query, e.g. `/api/threads`. */
  path: string;
  url: string;
  /** 0 for the first attempt, 1 and 2 for retries. */
  attempt: number;
}

export interface ResponseEvent extends RequestEvent {
  /** HTTP status, or 0 when no response arrived. */
  status: number;
  /** The API's `x-correlation-id`, when it sent one. */
  correlationId: string | null;
  durationMs: number;
  /** Set when the attempt failed (any kind, including an HTTP error status). */
  error: ApiError | null;
}

export interface RetryPolicy {
  /** Retries after the first attempt (so `2` means at most 3 requests). */
  maxRetries: number;
  /** Delay before the first retry; doubles for each further retry, with jitter. */
  baseDelayMs: number;
  /** Upper bound for the computed backoff. */
  maxDelayMs: number;
  /** A `Retry-After` longer than this is not waited for: the error goes back to the caller. */
  maxRetryAfterMs: number;
}
