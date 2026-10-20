import { z } from 'zod';

import { optionalString, withAliases } from './common';

/** `GET /health` (and `/api/health`): `{ status, message, timestamp, version, instanceId }`. */
export const healthSchema = withAliases(
  z.object({
    status: z.string(),
    message: optionalString,
    timestamp: optionalString,
    version: optionalString,
    instanceId: optionalString,
  }),
).transform(health => ({ ...health, healthy: health.status.toLowerCase() === 'healthy' }));

export type Health = z.output<typeof healthSchema>;
