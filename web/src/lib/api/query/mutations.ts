import { mutationOptions, type QueryClient } from '@tanstack/react-query';

import type { ApiClient } from '../client';
import type { BattleInput, ChatInput, VoteInput } from '../endpoints/arena';
import type { SpeechInput } from '../endpoints/speech';
import type {
  CreateThreadInput,
  RenameThreadInput,
  SetThreadVisibilityInput,
} from '../endpoints/threads';
import type { UserSyncInput } from '../endpoints/users';
import type { Thread } from '../schemas/threads';
import type { VoteQueue } from '../vote-queue';
import { apiKeys } from './keys';

/**
 * Typed mutation option builders: `useMutation(startBattleMutation(api))`. None of them retry
 * (see createQueryClient). Thread mutations keep the cache in step: they write what the
 * response tells for sure and invalidate the rest.
 */

export function startBattleMutation(api: ApiClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.battle(),
    mutationFn: (input: BattleInput) => api.startBattle(input),
  });
}

export function sendChatMutation(api: ApiClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.chat(),
    mutationFn: (input: ChatInput) => api.sendChat(input),
  });
}

/**
 * Votes go through the queue: the result is `{ status: 'sent' }`, or `{ status: 'queued' }` when
 * the vote was kept to send later (offline, timeout, 5xx). Only a permanent failure rejects.
 */
export function voteMutation(queue: VoteQueue) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.vote(),
    mutationFn: (input: VoteInput) => queue.submit(input),
  });
}

export function textToSpeechMutation(api: ApiClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.speech(),
    mutationFn: (input: SpeechInput) => api.textToSpeech(input),
  });
}

export function createThreadMutation(api: ApiClient, queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.createThread(),
    mutationFn: (input: CreateThreadInput) => api.createThread(input),
    onSuccess: async thread => {
      queryClient.setQueryData(apiKeys.threads.detail(thread.threadId), thread);
      await queryClient.invalidateQueries({ queryKey: apiKeys.threads.lists() });
    },
  });
}

export function renameThreadMutation(api: ApiClient, queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.renameThread(),
    mutationFn: (input: RenameThreadInput) => api.renameThread(input),
    onSuccess: async (_result, { threadId, title }) => {
      queryClient.setQueryData<Thread>(apiKeys.threads.detail(threadId), thread =>
        thread === undefined ? thread : { ...thread, title: title.trim() },
      );
      await queryClient.invalidateQueries({ queryKey: apiKeys.threads.lists() });
    },
  });
}

export function deleteThreadMutation(api: ApiClient, queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.deleteThread(),
    mutationFn: (threadId: string) => api.deleteThread(threadId),
    onSuccess: async (_result, threadId) => {
      queryClient.removeQueries({ queryKey: apiKeys.threads.detail(threadId) });
      queryClient.removeQueries({ queryKey: apiKeys.sharedThreads.detail(threadId) });
      await queryClient.invalidateQueries({ queryKey: apiKeys.threads.lists() });
    },
  });
}

export function setThreadVisibilityMutation(api: ApiClient, queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.setThreadVisibility(),
    mutationFn: (input: SetThreadVisibilityInput) => api.setThreadVisibility(input),
    onSuccess: async (result, { threadId, visibility }) => {
      queryClient.setQueryData<Thread>(apiKeys.threads.detail(threadId), thread =>
        thread === undefined ? thread : { ...thread, visibility: result.visibility ?? visibility },
      );
      queryClient.removeQueries({ queryKey: apiKeys.sharedThreads.detail(threadId) });
      await queryClient.invalidateQueries({ queryKey: apiKeys.threads.lists() });
    },
  });
}

export function syncUserMutation(api: ApiClient, queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: apiKeys.mutations.syncUser(),
    mutationFn: (input: UserSyncInput) => api.syncUser(input),
    onSuccess: profile => {
      queryClient.setQueryData(apiKeys.users.me(), profile);
    },
  });
}
