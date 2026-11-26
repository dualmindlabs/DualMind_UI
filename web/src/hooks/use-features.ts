import { useQuery } from '@tanstack/react-query';

import { buildFlags } from '@/config/features';
import { NO_PUBLIC_CONFIG, publicConfigQuery } from '@/lib/api';

import { useApiClient } from './use-api-client';

export interface Features {
  /** "Try one battle without an account": the build flag AND the backend flag AND a site key. */
  guestBattle: boolean;
  /** The private arena page: the build flag AND the backend flag. */
  privateArena: boolean;
  /** The public Turnstile site key for the guest battle, or null. */
  turnstileSiteKey: string | null;
  /** True while a feature that needs the backend's answer is still waiting for it. */
  loading: boolean;
}

/** Everything off: what the first render (and a prerendered page) shows. */
export const NO_FEATURES: Features = {
  guestBattle: false,
  privateArena: false,
  turnstileSiteKey: null,
  loading: false,
};

/**
 * Which launch features are on right now. A feature needs the build flag (src/config/features.ts)
 * AND the backend's own flag from `GET /api/config/public`. The config is only requested when a
 * build flag is on, so a default build makes no extra call. While loading, and on any failure,
 * everything is off.
 */
export function useFeatures(): Features {
  const api = useApiClient();
  const wanted = buildFlags.guestBattle || buildFlags.privateArena;
  const { data, isPending } = useQuery({ ...publicConfigQuery(api), enabled: wanted });
  if (!wanted) return NO_FEATURES;
  const config = data ?? NO_PUBLIC_CONFIG;
  return {
    guestBattle: buildFlags.guestBattle && config.guestBattle && config.turnstileSiteKey !== null,
    privateArena: buildFlags.privateArena && config.privateArena,
    turnstileSiteKey: config.turnstileSiteKey,
    loading: isPending,
  };
}
