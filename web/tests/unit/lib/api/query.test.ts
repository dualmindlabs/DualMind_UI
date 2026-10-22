import {
  MutationObserver,
  type MutationObserverOptions,
  type QueryClient,
} from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type ApiClient,
  ApiError,
  apiKeys,
  createApiClient,
  createQueryClient,
  createThreadMutation,
  createVoteQueue,
  deleteThreadMutation,
  featureFlagQuery,
  healthQuery,
  leaderboardQuery,
  meQuery,
  modelQuery,
  modelsQuery,
  queryRetry,
  queryRetryDelay,
  renameThreadMutation,
  sendChatMutation,
  setThreadVisibilityMutation,
  sharedThreadQuery,
  STALE_TIMES,
  startBattleMutation,
  syncUserMutation,
  textToSpeechMutation,
  type Thread,
  threadMessagesQuery,
  threadQuery,
  threadsQuery,
  voteMutation,
} from '@/lib/api';

let client: QueryClient | undefined;

function setup() {
  client = createQueryClient();
  const api = createApiClient({ mock: true });
  return { client, api };
}

afterEach(() => {
  client?.clear();
});

/** Runs a mutation outside React, with its whole lifecycle (onSuccess included). */
function mutate<TData, TVariables>(
  queryClient: QueryClient,
  options: MutationObserverOptions<TData, Error, TVariables>,
  variables: TVariables,
): Promise<TData> {
  return new MutationObserver(queryClient, options).mutate(variables);
}

describe('query keys', () => {
  it('nest under one root so a group can be invalidated at once', () => {
    expect(apiKeys.all).toEqual(['dualmind-api']);
    expect(apiKeys.threads.list(20).slice(0, 2)).toEqual([...apiKeys.threads.all]);
    expect(apiKeys.threads.messages('t-1').slice(0, 4)).toEqual([...apiKeys.threads.detail('t-1')]);
    expect(apiKeys.threads.list(20)).toEqual(['dualmind-api', 'threads', 'list', { limit: 20 }]);
    expect(apiKeys.sharedThreads.detail('t-1')).not.toEqual(apiKeys.threads.detail('t-1'));
    expect(apiKeys.mutations.vote()).toEqual(['dualmind-api', 'arena', 'vote']);
  });
});

describe('QueryClient defaults', () => {
  it('retries queries by the shared policy and never retries mutations', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.retry).toBe(queryRetry);
    expect(defaults.queries?.retryDelay).toBe(queryRetryDelay);
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it('lets callers override defaults', () => {
    const defaults = createQueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 1 }, mutations: { retry: 1 } },
    }).getDefaultOptions();
    expect(defaults.queries).toMatchObject({ retry: false, staleTime: 1, gcTime: 300_000 });
    expect(defaults.mutations?.retry).toBe(1);
  });

  it('queryRetry follows the error model', () => {
    const transient = new ApiError({ kind: 'server', status: 503, message: 'x' });
    const permanent = new ApiError({ kind: 'not_found', status: 404, message: 'x' });
    expect(queryRetry(0, transient)).toBe(true);
    expect(queryRetry(2, transient)).toBe(false);
    expect(queryRetry(0, permanent)).toBe(false);
    const limited = new ApiError({ kind: 'rate_limited', message: 'x', retryAfterMs: 5_000 });
    expect(queryRetryDelay(0, limited)).toBeGreaterThanOrEqual(5_000);
  });
});

describe('query builders (against the mock)', () => {
  it('fetch through the client with the query signal and no transport retry', async () => {
    const { client: queryClient, api: real } = setup();
    // The client object is frozen, so wrap a copy instead of spying on it.
    const getLeaderboard = vi.fn(real.getLeaderboard);
    const api: ApiClient = { ...real, getLeaderboard };
    const rows = await queryClient.fetchQuery(leaderboardQuery(api));
    expect(rows.items).toHaveLength(7);
    expect(getLeaderboard).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal) as unknown,
      retry: false,
    });
    expect(leaderboardQuery(api).staleTime).toBe(STALE_TIMES.leaderboard);
  });

  it('cover every read endpoint', async () => {
    const { client: queryClient, api } = setup();
    const [first] = await queryClient.fetchQuery(threadsQuery(api));
    const threadId = first?.threadId ?? '';
    const results = await Promise.all([
      queryClient.fetchQuery(healthQuery(api)),
      queryClient.fetchQuery(modelsQuery(api)),
      queryClient.fetchQuery(modelQuery(api, '69a22e49-21bf-4388-88e3-46794e7cbac2')),
      queryClient.fetchQuery(threadQuery(api, threadId)),
      queryClient.fetchQuery(threadMessagesQuery(api, threadId)),
      queryClient.fetchQuery(meQuery(api)),
      queryClient.fetchQuery(featureFlagQuery(api, 'public_sharing')),
    ]);
    expect(results.every(result => result !== undefined)).toBe(true);
    expect(healthQuery(api).retry).toBe(false);
  });

  it('caches the share view apart from the owner view', async () => {
    const { client: queryClient, api } = setup();
    const threads = await queryClient.fetchQuery(threadsQuery(api));
    const shared = threads.find(thread => thread.visibility === 'public');
    expect(shared).toBeDefined();
    const view = await queryClient.fetchQuery(sharedThreadQuery(api, shared?.threadId ?? ''));
    expect(view.thread.threadId).toBe(shared?.threadId);
    expect(
      queryClient.getQueryData(apiKeys.threads.detail(shared?.threadId ?? '')),
    ).toBeUndefined();
  });
});

describe('mutation builders (against the mock)', () => {
  it('battle, chat, speech and vote', async () => {
    const { client: queryClient, api } = setup();
    const battle = await mutate(queryClient, startBattleMutation(api), { prompt: 'Hi' });
    expect(battle.comparisonId).toBeTruthy();
    await expect(
      mutate(queryClient, sendChatMutation(api), { prompt: 'Hi' }),
    ).resolves.toMatchObject({
      text: expect.stringContaining('Demo mode') as unknown,
    });
    await expect(
      mutate(queryClient, textToSpeechMutation(api), { text: 'Hi' }),
    ).resolves.toHaveProperty('size', 844);
    const queue = createVoteQueue({ send: vote => api.vote(vote), storage: null });
    await expect(
      mutate(queryClient, voteMutation(queue), {
        comparisonId: battle.comparisonId,
        voteChoice: 'left',
      }),
    ).resolves.toEqual({ status: 'sent' });
  });

  it('thread mutations keep the cache in step', async () => {
    const { client: queryClient, api } = setup();
    await queryClient.fetchQuery(threadsQuery(api));
    const listKey = apiKeys.threads.list(20);

    const created = await mutate(queryClient, createThreadMutation(api, queryClient), {
      title: 'New',
    });
    expect(queryClient.getQueryData<Thread>(apiKeys.threads.detail(created.threadId))).toEqual(
      created,
    );
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);

    await queryClient.fetchQuery(threadsQuery(api));
    await mutate(queryClient, renameThreadMutation(api, queryClient), {
      threadId: created.threadId,
      title: ' Renamed ',
    });
    expect(queryClient.getQueryData<Thread>(apiKeys.threads.detail(created.threadId))?.title).toBe(
      'Renamed',
    );
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);

    await mutate(queryClient, setThreadVisibilityMutation(api, queryClient), {
      threadId: created.threadId,
      visibility: 'public',
    });
    expect(
      queryClient.getQueryData<Thread>(apiKeys.threads.detail(created.threadId))?.visibility,
    ).toBe('public');

    await mutate(queryClient, deleteThreadMutation(api, queryClient), created.threadId);
    expect(queryClient.getQueryData(apiKeys.threads.detail(created.threadId))).toBeUndefined();
  });

  it('leaves the cache alone for a thread that was never loaded', async () => {
    const { client: queryClient, api } = setup();
    const [thread] = await api.listThreads();
    const threadId = thread?.threadId ?? '';
    await mutate(queryClient, renameThreadMutation(api, queryClient), { threadId, title: 'x' });
    await mutate(queryClient, setThreadVisibilityMutation(api, queryClient), {
      threadId,
      visibility: 'unlisted',
    });
    expect(queryClient.getQueryData(apiKeys.threads.detail(threadId))).toBeUndefined();
  });

  it('syncUser stores the profile as the me query', async () => {
    const { client: queryClient, api } = setup();
    const profile = await mutate(queryClient, syncUserMutation(api, queryClient), {
      id: 'u-9',
      email: 'u@example.com',
      name: 'U',
      provider: 'email',
    });
    expect(queryClient.getQueryData(apiKeys.users.me())).toEqual(profile);
  });

  it('does not retry a failed mutation', async () => {
    const queryClient = createQueryClient();
    const startBattle = vi.fn(() => Promise.reject(new ApiError({ kind: 'server', message: 'x' })));
    const api = { startBattle } as unknown as ApiClient;
    await expect(
      mutate(queryClient, startBattleMutation(api), { prompt: 'Hi' }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(startBattle).toHaveBeenCalledOnce();
  });
});
