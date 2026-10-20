import { apiConfig } from '@/config/api';

import { type ArenaEndpoints, createArenaEndpoints } from './endpoints/arena';
import { createFlagEndpoints, type FlagEndpoints } from './endpoints/flags';
import { createHealthEndpoints, type HealthEndpoints } from './endpoints/health';
import { createLeaderboardEndpoints, type LeaderboardEndpoints } from './endpoints/leaderboard';
import { createModelEndpoints, type ModelEndpoints } from './endpoints/models';
import { createSpeechEndpoints, type SpeechEndpoints } from './endpoints/speech';
import { createThreadEndpoints, type ThreadEndpoints } from './endpoints/threads';
import { createUserEndpoints, type UserEndpoints } from './endpoints/users';
import { createTransport, type TransportOptions } from './http/transport';
import type { FetchLike } from './http/types';
import type { MockOptions } from './mock/mock-fetch';

export interface ApiClientOptions extends TransportOptions {
  /**
   * Answer every call from the in-memory mock adapter instead of the network (demo and offline
   * mode, e2e tests). The adapter is loaded on first use with a dynamic import, so it is not part
   * of the main bundle. Takes precedence over `fetch`. Without `getAccessToken`, a demo token is
   * used so signed-in calls work.
   */
  mock?: boolean | MockOptions | undefined;
}

/** The whole DualMind API, one function per endpoint (see docs/api/endpoints.md, "Client mapping"). */
export interface ApiClient
  extends
    HealthEndpoints,
    ModelEndpoints,
    ArenaEndpoints,
    LeaderboardEndpoints,
    ThreadEndpoints,
    UserEndpoints,
    SpeechEndpoints,
    FlagEndpoints {
  /** '' for same-origin, otherwise the absolute base URL. */
  readonly baseUrl: string;
  /** True when answers come from the mock adapter. The UI must label such content as a demo. */
  readonly isMock: boolean;
}

/** Bearer token used in mock mode when the app has no session; the mock accepts any token. */
export const MOCK_ACCESS_TOKEN = 'mock-access-token';

function lazyMockFetch(options: MockOptions): FetchLike {
  let loading: Promise<FetchLike> | undefined;
  return async (input, init) => {
    loading ??= import('./mock/mock-fetch').then(module => module.createMockFetch(options));
    const mockFetch = await loading;
    return mockFetch(input, init);
  };
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const { mock, ...transportOptions } = options;
  const mockOptions: MockOptions | null =
    mock === undefined || mock === false ? null : mock === true ? {} : mock;
  const isMock = mockOptions !== null;
  const transport = createTransport({
    ...transportOptions,
    fetch: mockOptions === null ? transportOptions.fetch : lazyMockFetch(mockOptions),
    getAccessToken:
      transportOptions.getAccessToken ?? (isMock ? () => MOCK_ACCESS_TOKEN : undefined),
  });

  return Object.freeze({
    baseUrl: transport.baseUrl,
    isMock,
    ...createHealthEndpoints(transport),
    ...createModelEndpoints(transport),
    ...createArenaEndpoints(transport),
    ...createLeaderboardEndpoints(transport),
    ...createThreadEndpoints(transport),
    ...createUserEndpoints(transport),
    ...createSpeechEndpoints(transport),
    ...createFlagEndpoints(transport),
  });
}

/**
 * The app's client: base URL and mock mode from `VITE_API_BASE_URL` and `VITE_API_MOCK`
 * (src/config/api.ts). Mock mode adds a small latency so loading states are visible in demos.
 */
export function createApiClientFromEnv(
  options: Omit<ApiClientOptions, 'baseUrl' | 'mock'> = {},
): ApiClient {
  return createApiClient({
    ...options,
    baseUrl: apiConfig.baseUrl,
    mock: apiConfig.mock ? { latencyMs: 350, streamChunkDelayMs: 40 } : false,
  });
}
