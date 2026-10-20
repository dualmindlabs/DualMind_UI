import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { pathSegment } from '../http/url';
import { type FeatureFlag, featureFlagSchema } from '../schemas/flags';

/** Flags the UI reads today. */
export const FEATURE_FLAGS = Object.freeze({
  /** When off, shared threads cannot be read without a token, so the share modal hides links. */
  publicSharing: 'public_sharing',
});

export interface FlagEndpoints {
  /** `GET /api/settings/feature-flag/{key}`: `{ key, enabled }`. Public. */
  getFeatureFlag: (key: string, options?: CallOptions) => Promise<FeatureFlag>;
}

export function createFlagEndpoints(transport: Transport): FlagEndpoints {
  return {
    getFeatureFlag: async (key, options) =>
      await transport.json(
        {
          method: 'GET',
          path: `/api/settings/feature-flag/${pathSegment(key, 'key')}`,
          auth: 'none',
          schema: featureFlagSchema,
        },
        options,
      ),
  };
}
