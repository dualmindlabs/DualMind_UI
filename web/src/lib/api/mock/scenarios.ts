/**
 * Error scenarios the mock adapter can play, chosen per request with the `x-mock-scenario`
 * header, or for every request with `MockOptions.scenario` / `getScenario`. Each one sends the
 * body shape the real API (or the Worker) sends in that case (docs/api/endpoints.md).
 */
export const MOCK_SCENARIOS = [
  /** Normal answers (the default). */
  'ok',
  /** Lists come back empty. */
  'empty',
  /** 401 with an empty body and `www-authenticate: Bearer`, like the live API. */
  'unauthorized',
  /** 403 `{ success: false, error, code }`. */
  'forbidden',
  /** 404 with an empty body. */
  'not-found',
  /** 400: `ai.error` on arena routes, `{ success: false, error, code }` elsewhere. */
  'validation',
  /** 429 with `Retry-After: 2`. */
  'rate-limited',
  /** 500: `ai.error` `API_ERROR` on arena routes, `{ success: false, error, code }` elsewhere. */
  'server-error',
  /** 502 from the Worker proxy: `{ error: "bad_gateway", requestId }`. */
  'bad-gateway',
  /** 504 from the Worker proxy (the API took longer than 30 s): `{ error: "gateway_timeout" }`. */
  'gateway-timeout',
  /** 400 `application/problem+json` as the Worker proxy sends it to callers that opt in (BE-1). */
  'problem',
  /** 200 with an HTML body, as when a gate or a proxy answers instead of the API. */
  'malformed',
  /** fetch rejects with a TypeError, as when offline. */
  'network-error',
  /** No answer until the request is aborted (lets the client's timeout fire). */
  'timeout',
  /** Chat stream: a few deltas, then an `ai.error` event (other routes answer normally). */
  'stream-error',
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const MOCK_SCENARIO_HEADER = 'x-mock-scenario';

export function isMockScenario(value: unknown): value is MockScenario {
  return typeof value === 'string' && (MOCK_SCENARIOS as readonly string[]).includes(value);
}
