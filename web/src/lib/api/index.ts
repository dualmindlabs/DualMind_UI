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
  isAlreadyVotedError,
  isApiError,
  isApiErrorKind,
  isAuthError,
  isConnectivityError,
  isNotFoundError,
  isRateLimitError,
  isRetryableError,
  isUpstreamUnavailableError,
} from './errors';

// Endpoint inputs and helpers
export {
  type BattleInput,
  type ChatInput,
  DEFAULT_MAX_TOKENS,
  type StreamChatOptions,
  type VoteInput,
} from './endpoints/arena';
export {
  COMPARE_DEFAULT_MAX_TOKENS,
  COMPARE_MAX_PROMPT_CHARS,
  type CompareInput,
  isCompareShareId,
  MAX_PROMPT_CHARS,
} from './endpoints/compare';
export { type Round2Input } from './endpoints/cross-examine';
export { FEATURE_FLAGS } from './endpoints/flags';
export {
  GUEST_PROMPT_MAX_CHARS,
  type GuestBattleInput,
  PRIVATE_ARENA_MAX_ARENAS,
  PRIVATE_ARENA_MAX_PROMPTS,
  PRIVATE_ARENA_NAME_MAX_CHARS,
  PRIVATE_PROMPT_MAX_CHARS,
  type PrivateArenaInput,
} from './endpoints/launch';
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
  type VoteModels,
  type VoteReceipt,
  type VoteResult,
} from './schemas/arena';
export type { MutationResult, Usage } from './schemas/common';
export type { CompareResult, CompareShareState, CompareSide } from './schemas/compare';
export type {
  CritiqueResult,
  CrossExamineStats,
  Rebuttal,
  Round2Result,
} from './schemas/cross-examine';
export type { CrowdCategory, CrowdStat } from './schemas/crowd';
export type { FeatureFlag } from './schemas/flags';
export type { Health } from './schemas/health';
export {
  NO_PUBLIC_CONFIG,
  PRIVATE_VOTE_CHOICES,
  type PrivateArena,
  type PrivateBattle,
  type PrivateBoardRow,
  type PrivateVoteChoice,
  type PublicConfig,
  type Quota,
  type QuotaPart,
} from './schemas/launch';
export type { LeaderboardData, ModelStat } from './schemas/leaderboard';
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
export type { AnswerKey, AnswerKeySide } from './schemas/truth';
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
  boardQuery,
  crowdCategoriesQuery,
  featureFlagQuery,
  healthQuery,
  leaderboardMethodologyQuery,
  leaderboardQuery,
  meQuery,
  modelQuery,
  modelsQuery,
  privateArenasQuery,
  privateBoardQuery,
  publicConfigQuery,
  quotaQuery,
  sharedThreadQuery,
  threadMessagesQuery,
  threadQuery,
  threadsQuery,
} from './query/queries';
export { createQueryClient, queryRetry, queryRetryDelay, STALE_TIMES } from './query/query-client';
