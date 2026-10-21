import type { ApiClient } from './client';

/** Endpoint functions that return an async generator instead of a promise. */
const STREAM_METHODS: ReadonlySet<string> = new Set(['streamChat']);

export interface LazyApiClientOptions {
  /** Loads and creates the real client; called once, on the first request. */
  load: () => Promise<ApiClient>;
  baseUrl: string;
  isMock: boolean;
}

/**
 * An `ApiClient` whose code (transport, endpoints and the zod schemas) is fetched on the first
 * call instead of with the page. Pages that never call the API, and pages whose first request
 * starts after hydration, keep it off the critical path (docs/redesign/ui-audit.md, performance
 * plan). `baseUrl` and `isMock` are answered at once; every endpoint function waits for the real
 * client, then forwards its arguments, so callers see the same promise and stream behaviour.
 */
export function createLazyApiClient({ load, baseUrl, isMock }: LazyApiClientOptions): ApiClient {
  let loading: Promise<ApiClient> | undefined;
  const real = () => (loading ??= load());
  const cache = new Map<string, unknown>();

  return new Proxy({} as ApiClient, {
    get(_target, property) {
      if (property === 'baseUrl') return baseUrl;
      if (property === 'isMock') return isMock;
      if (typeof property !== 'string' || property === 'then') return undefined;
      let method = cache.get(property);
      if (!method) {
        method = STREAM_METHODS.has(property)
          ? async function* (...args: unknown[]) {
              const client = (await real()) as unknown as Record<
                string,
                (...a: unknown[]) => AsyncGenerator
              >;
              yield* client[property]!(...args);
            }
          : async (...args: unknown[]) => {
              const client = (await real()) as unknown as Record<
                string,
                (...a: unknown[]) => unknown
              >;
              return client[property]!(...args);
            };
        cache.set(property, method);
      }
      return method;
    },
  });
}
