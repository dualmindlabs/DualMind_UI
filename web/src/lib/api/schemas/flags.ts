import { z } from 'zod';

import { flag, withAliases } from './common';

/** `GET /api/settings/feature-flag/{key}`: `{ key, enabled }`. A missing `enabled` means off. */
export const featureFlagSchema = withAliases(
  z.object({
    key: z.string().min(1),
    enabled: flag(false),
  }),
  { enabled: ['isEnabled', 'value'] },
);

export type FeatureFlag = z.output<typeof featureFlagSchema>;
