import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

import { DEFAULT_RETRY_POLICY, retryDelay, shouldRetry } from '../http/retry';

/**
 * How long each resource counts as fresh, in milliseconds. A fresh query is served from the
 * cache without a request; a stale one is shown and refetched in the background.
 */
export const STALE_TIMES = Object.freeze({
  health: 15_000,
  models: 5 * 60_000,
  leaderboard: 60_000,
  threads: 30_000,
  threadMessages: 30_000,
  sharedThread: 60_000,
  me: 5 * 60_000,
  featureFlag: 5 * 60_000,
});

/**
 * Query retries use the same policy as the transport (src/lib/api/http/retry.ts): only
 * transient errors (network, timeout, 429, 5xx), at most twice, with backoff and Retry-After.
 * The query builders turn the transport's own retries off, so a request is never retried by
 * both layers. `failureCount` is 0 after the first failure, like `retriesSoFar`.
 */
export function queryRetry(failureCount: number, error: unknown): boolean {
  return shouldRetry(error, failureCount, DEFAULT_RETRY_POLICY);
}

export function queryRetryDelay(failureCount: number, error: unknown): number {
  return retryDelay(failureCount, error, DEFAULT_RETRY_POLICY);
}

/**
 * The app's QueryClient. Mutations never retry: battles, chats, votes and thread changes are
 * POST, PATCH or DELETE calls (votes have their own queue). Create one per app (and one per
 * test) and pass it to `<QueryClientProvider>`.
 */
export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: queryRetry,
        retryDelay: queryRetryDelay,
        refetchOnWindowFocus: true,
        ...config.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...config.defaultOptions?.mutations,
      },
    },
  });
}
