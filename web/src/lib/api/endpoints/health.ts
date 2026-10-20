import { TIMEOUTS } from '../http/timeouts';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { type Health, healthSchema } from '../schemas/health';

export interface HealthEndpoints {
  /**
   * `GET /api/health`. Same-origin, the Worker maps it to the API's `/health`; a direct base URL
   * works too (the API answers `/api/health` itself). Public, 5 s timeout, not retried: the
   * caller decides what "down" means. `healthy` is true when `status` is "healthy".
   */
  getHealth: (options?: CallOptions) => Promise<Health>;
}

export function createHealthEndpoints(transport: Transport): HealthEndpoints {
  return {
    getHealth: (options = {}) =>
      transport.json(
        {
          method: 'GET',
          path: '/api/health',
          auth: 'none',
          timeoutMs: TIMEOUTS.health,
          schema: healthSchema,
        },
        { retry: false, ...options },
      ),
  };
}
