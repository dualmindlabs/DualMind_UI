import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useLeaderboard } from '@/features/leaderboard';
import { useApiClient } from '@/hooks/use-api-client';
import { modelsQuery } from '@/lib/api';
import { modelMaker } from '@/lib/models/display-name';

/** A model as the pickers show it: the catalogue entry, with its rank and Elo when known. */
export interface ModelOption {
  /** `modelId`, what the API takes. */
  modelId: string;
  /** `modelName`, what the legacy app stores (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`). */
  modelName: string;
  /** What people read. */
  displayName: string;
  /** Who made it ("Meta", "Alibaba Qwen"), as the leaderboard says it. */
  provider: string;
  elo: number | null;
  /** The leaderboard's rank; null while the model is not yet rated (or not on the board). */
  rank: number | null;
}

/**
 * The models for Side by side and Direct: the catalogue (`GET /api/models`, needs the session)
 * joined with the public leaderboard for rank and Elo, best ranked first, then the models not yet
 * rated (lib/model-groups.ts splits them for the picker). The leaderboard is optional: when it
 * fails, the pickers still work, without numbers.
 */
export function useModelOptions() {
  const api = useApiClient();
  const models = useQuery(modelsQuery(api));
  const board = useLeaderboard();

  const options = useMemo<ModelOption[] | undefined>(() => {
    if (!models.data) return undefined;
    const byId = new Map(board.data?.entries.map(entry => [entry.id, entry]));
    return models.data
      .map(model => {
        const entry = byId.get(model.modelId);
        return {
          modelId: model.modelId,
          modelName: model.modelName,
          displayName: model.displayName,
          provider: modelMaker(model.modelName, model.providerName).label,
          elo: entry?.elo ?? null,
          rank: entry?.rank ?? null,
        };
      })
      .sort(
        (a, b) =>
          (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY) ||
          a.displayName.localeCompare(b.displayName),
      );
  }, [models.data, board.data]);

  return {
    options,
    isPending: models.isPending,
    isError: models.isError,
    refetch: models.refetch,
  };
}
