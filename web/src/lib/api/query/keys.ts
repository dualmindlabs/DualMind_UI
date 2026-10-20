/**
 * Query keys, one factory per endpoint group. Keys are hierarchical, so invalidating
 * `apiKeys.threads.all` also invalidates every list, thread and message query under it.
 */

const ROOT = 'dualmind-api';

const HEALTH = [ROOT, 'health'] as const;
const MODELS = [ROOT, 'models'] as const;
const LEADERBOARD = [ROOT, 'leaderboard'] as const;
const THREADS = [ROOT, 'threads'] as const;
const SHARED = [ROOT, 'shared-threads'] as const;
const USERS = [ROOT, 'users'] as const;
const FLAGS = [ROOT, 'feature-flags'] as const;
const ARENA = [ROOT, 'arena'] as const;

export const apiKeys = {
  all: [ROOT] as const,
  health: HEALTH,
  models: {
    all: MODELS,
    list: () => [...MODELS, 'list'] as const,
    detail: (modelId: string) => [...MODELS, 'detail', modelId] as const,
  },
  leaderboard: {
    all: LEADERBOARD,
    list: () => [...LEADERBOARD, 'list'] as const,
  },
  threads: {
    all: THREADS,
    lists: () => [...THREADS, 'list'] as const,
    list: (limit: number) => [...THREADS, 'list', { limit }] as const,
    detail: (threadId: string) => [...THREADS, 'detail', threadId] as const,
    messages: (threadId: string) => [...THREADS, 'detail', threadId, 'messages'] as const,
  },
  /** The public share view is cached apart from the owner's view of the same thread. */
  sharedThreads: {
    all: SHARED,
    detail: (threadId: string) => [...SHARED, threadId] as const,
  },
  users: {
    all: USERS,
    me: () => [...USERS, 'me'] as const,
  },
  featureFlags: {
    all: FLAGS,
    detail: (key: string) => [...FLAGS, key] as const,
  },
  /** Mutation keys, for `useMutationState` (for example a global "voting..." indicator). */
  mutations: {
    battle: () => [...ARENA, 'battle'] as const,
    chat: () => [...ARENA, 'chat'] as const,
    vote: () => [...ARENA, 'vote'] as const,
    speech: () => [...ARENA, 'speech'] as const,
    createThread: () => [...THREADS, 'create'] as const,
    renameThread: () => [...THREADS, 'rename'] as const,
    deleteThread: () => [...THREADS, 'delete'] as const,
    setThreadVisibility: () => [...THREADS, 'visibility'] as const,
    syncUser: () => [...USERS, 'sync'] as const,
  },
} as const;
