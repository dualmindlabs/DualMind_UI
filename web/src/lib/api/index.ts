/**
 * The public API of the API layer. Features import from `@/lib/api` only, never from its
 * folders. See README.md in this folder for the structure, the error model and the policies.
 */

// Client
export {
  type ApiClient,
  type ApiClientOptions,
  createApiClient,
  createApiClientFromEnv,
  MOCK_ACCESS_TOKEN,
} from './client';
export { DEFAULT_RETRY_POLICY, retryDelay, shouldRetry } from './http/retry';
export { TIMEOUTS } from './http/timeouts';
export { DEFAULT_TIMEOUT_MS } from './http/transport';
export type {
  AccessTokenProvider,
  AuthMode,
  CallOptions,
  FetchLike,
  HttpMethod,
  RequestEvent,
  ResponseEvent,
  RetryPolicy,
} from './http/types';

// Errors
export {
  API_ERROR_KINDS,
  ApiError,
  type ApiErrorKind,
  getUserMessage,
  isAbortError,
  isApiError,
  isApiErrorKind,
  isAuthError,
  isConnectivityError,
  isNotFoundError,
  isRateLimitError,
  isRetryableError,
} from './errors';

// Endpoint inputs and helpers
export {
  type BattleInput,
  type ChatInput,
  DEFAULT_MAX_TOKENS,
  type StreamChatOptions,
  type VoteInput,
} from './endpoints/arena';
export { FEATURE_FLAGS } from './endpoints/flags';
export { type SpeechInput } from './endpoints/speech';
export {
  type CreateThreadInput,
  DEFAULT_THREAD_LIMIT,
  type ListThreadsInput,
  type RenameThreadInput,
  type SetThreadVisibilityInput,
  type SharedThread,
  toThreadTitle,
} from './endpoints/threads';
export { type UserSyncInput } from './endpoints/users';

// Response types
export {
  type Answer,
  type AnswerModel,
  type Battle,
  type ChatStreamEvent,
  SELECTION_MODES,
  type SelectionMode,
  VOTE_CHOICES,
  type VoteChoice,
  type VoteResult,
} from './schemas/arena';
export type { MutationResult, Usage } from './schemas/common';
export type { FeatureFlag } from './schemas/flags';
export type { Health } from './schemas/health';
export type { ModelStat } from './schemas/leaderboard';
export { displayNameFromModelName, KNOWN_PROVIDERS, type ModelSummary } from './schemas/models';
export {
  type Thread,
  THREAD_MODES,
  type ThreadMessage,
  type ThreadMode,
  VISIBILITIES,
  type Visibility,
  type VisibilityResult,
} from './schemas/threads';
export type { UserProfile } from './schemas/users';

// Streaming
export { readChatStream, readSseStream, type SseMessage, SseParser } from './sse';

// Vote queue
export {
  createVoteQueue,
  type FlushResult,
  type QueuedVote,
  type StorageLike,
  VOTE_QUEUE_STORAGE_KEY,
  type VoteQueue,
  type VoteQueueOptions,
  type VoteSubmitResult,
} from './vote-queue';

// Mock adapter: reached through `createApiClient({ mock })`, which loads it lazily so it stays
// out of the main bundle. Unit tests import `@/lib/api/mock/mock-fetch` directly.
export type { MockOptions } from './mock/mock-fetch';
export { MOCK_SCENARIO_HEADER, MOCK_SCENARIOS, type MockScenario } from './mock/scenarios';

// TanStack Query
export { apiKeys } from './query/keys';
export {
  createThreadMutation,
  deleteThreadMutation,
  renameThreadMutation,
  sendChatMutation,
  setThreadVisibilityMutation,
  startBattleMutation,
  syncUserMutation,
  textToSpeechMutation,
  voteMutation,
} from './query/mutations';
export {
  featureFlagQuery,
  healthQuery,
  leaderboardQuery,
  meQuery,
  modelQuery,
  modelsQuery,
  sharedThreadQuery,
  threadMessagesQuery,
  threadQuery,
  threadsQuery,
} from './query/queries';
export { createQueryClient, queryRetry, queryRetryDelay, STALE_TIMES } from './query/query-client';
