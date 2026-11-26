import { queryOptions } from '@tanstack/react-query';

import type { ApiClient } from '../client';
import { DEFAULT_THREAD_LIMIT } from '../endpoints/threads';
import { NO_PUBLIC_CONFIG } from '../schemas/launch';
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

/**
 * The leaderboard page's board: the crowd board when the backend has it on, else the classic one;
 * with a `category`, that category's crowd board (the overall board, without a `category` field,
 * if the backend cannot serve it, so a category tab never leaves the page empty or mislabelled). Its own keys, so it never mixes with
 * `leaderboardQuery` (the classic board, used by the landing page, the models directory and the
 * share page).
 */
export function boardQuery(api: ApiClient, category?: string) {
  return queryOptions({
    queryKey: [
      ...(category === undefined
        ? apiKeys.leaderboard.board()
        : apiKeys.leaderboard.category(category)),
    ] as readonly string[],
    queryFn: ({ signal }) => api.getBoard(viaQuery(signal), category),
    staleTime: STALE_TIMES.leaderboard,
  });
}

/** The categories the crowd board has a per-category board for; null while they are off. */
export function crowdCategoriesQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.leaderboard.categories(),
    queryFn: ({ signal }) => api.getCrowdCategories(viaQuery(signal)),
    staleTime: STALE_TIMES.methodology,
  });
}

/** The method behind the crowd board as plain text; null while it is off. */
export function leaderboardMethodologyQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.leaderboard.methodology(),
    queryFn: ({ signal }) => api.getLeaderboardMethodology(viaQuery(signal)),
    staleTime: STALE_TIMES.methodology,
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

/**
 * The launch features the backend has on (`GET /api/config/public`). Any failure (a backend
 * without the route, a network error) means "nothing extra", so the UI falls back to the
 * standard experience instead of showing an error.
 */
export function publicConfigQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.publicConfig(),
    queryFn: async ({ signal }) => {
      try {
        return await api.getPublicConfig(viaQuery(signal));
      } catch {
        return NO_PUBLIC_CONFIG;
      }
    },
    staleTime: STALE_TIMES.featureFlag,
    retry: false,
  });
}

export function privateArenasQuery(api: ApiClient) {
  return queryOptions({
    queryKey: apiKeys.privateArenas.list(),
    queryFn: ({ signal }) => api.listPrivateArenas(viaQuery(signal)),
  });
}

export function privateBoardQuery(api: ApiClient, id: string) {
  return queryOptions({
    queryKey: apiKeys.privateArenas.board(id),
    queryFn: ({ signal }) => api.getPrivateBoard(id, viaQuery(signal)),
  });
}
