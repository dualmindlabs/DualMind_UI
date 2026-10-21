import { queryOptions } from '@tanstack/react-query';

import type { ApiClient } from '../client';
import { DEFAULT_THREAD_LIMIT } from '../endpoints/thread-limits';
import { apiKeys } from './keys';
import { STALE_TIMES } from './query-client';

/**
 * Typed query option builders: `useQuery(leaderboardQuery(api))`,
 * `queryClient.prefetchQuery(threadsQuery(api))`, `queryClient.getQueryData(...)`.
 * Each passes TanStack's abort signal to the call (an unmounted screen cancels its request)
 * and turns the transport's retries off, because the QueryClient applies the retry policy.
 */
const viaQuery = (signal: AbortSignal) => ({ signal, retry: false });

export function healthQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.health,
    queryFn: ({ signal }) => api.getHealth(viaQuery(signal)),
    staleTime: STALE_TIMES.health,
    // A health check reports the current state; retrying would only delay "offline".
    retry: false,
  });
}

export function modelsQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.models.list(),
    queryFn: ({ signal }) => api.listModels(viaQuery(signal)),
    staleTime: STALE_TIMES.models,
  });
}

export function modelQuery(api: ApiClient, modelId: string) {
  return queryOptions({
    queryKey: apiKeys.models.detail(modelId),
    queryFn: ({ signal }) => api.getModel(modelId, viaQuery(signal)),
    staleTime: STALE_TIMES.models,
  });
}

export function leaderboardQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.leaderboard.list(),
    queryFn: ({ signal }) => api.getLeaderboard(viaQuery(signal)),
    staleTime: STALE_TIMES.leaderboard,
  });
}

export function threadsQuery(api: ApiClient, limit: number = DEFAULT_THREAD_LIMIT) {
  return queryOptions({
    queryKey: apiKeys.threads.list(limit),
    queryFn: ({ signal }) => api.listThreads({ limit }, viaQuery(signal)),
    staleTime: STALE_TIMES.threads,
  });
}

export function threadQuery(api: ApiClient, threadId: string) {
  return queryOptions({
    queryKey: apiKeys.threads.detail(threadId),
    queryFn: ({ signal }) => api.getThread(threadId, viaQuery(signal)),
    staleTime: STALE_TIMES.threads,
  });
}

export function threadMessagesQuery(api: ApiClient, threadId: string) {
  return queryOptions({
    queryKey: apiKeys.threads.messages(threadId),
    queryFn: ({ signal }) => api.listThreadMessages(threadId, viaQuery(signal)),
    staleTime: STALE_TIMES.threadMessages,
  });
}

export function sharedThreadQuery(api: ApiClient, threadId: string) {
  return queryOptions({
    queryKey: apiKeys.sharedThreads.detail(threadId),
    queryFn: ({ signal }) => api.getSharedThread(threadId, viaQuery(signal)),
    staleTime: STALE_TIMES.sharedThread,
  });
}

export function meQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.users.me(),
    queryFn: ({ signal }) => api.getMe(viaQuery(signal)),
    staleTime: STALE_TIMES.me,
  });
}

export function featureFlagQuery(api: ApiClient, key: string) {
  return queryOptions({
    queryKey: apiKeys.featureFlags.detail(key),
    queryFn: ({ signal }) => api.getFeatureFlag(key, viaQuery(signal)),
    staleTime: STALE_TIMES.featureFlag,
  });
}
