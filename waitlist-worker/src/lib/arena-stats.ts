import { useEffect, useState } from 'react';

/**
 * The Arena's public leaderboard (no account or token needed; see
 * https://docs.dualmindlab.tech/concepts/leaderboard). The page reads it straight from the API,
 * which allows any origin, so every number shown here is live, never typed in by hand.
 */
export const STATS_URL = 'https://api.dualmindlab.tech/api/arena/model-stats';

export interface ArenaModel {
  id: string;
  name: string;
  provider: string;
  rank: number;
  elo: number;
  winRate: number;
}

export interface ArenaStats {
  models: ArenaModel[];
  providers: string[];
}

export type ArenaStatsState =
  | { status: 'loading' }
  | { status: 'ready'; data: ArenaStats }
  | { status: 'error' };

const PROVIDER_LABELS: Record<string, string> = {
  cloudflare: 'Workers AI',
  groq: 'Groq',
  google: 'Google',
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function toModel(raw: unknown): ArenaModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const name = item.displayName ?? item.display_name;
  const provider = item.providerName ?? item.provider_name;
  const elo = Number(item.eloScore ?? item.elo);
  const rank = Number(item.eloRank);
  const winRate = Number(item.winRate ?? item.win_rate);
  if (typeof name !== 'string' || !name || typeof provider !== 'string' || !Number.isFinite(elo)) return null;
  return {
    id: String(item.modelId ?? item.model_id ?? name),
    name,
    provider: provider.toLowerCase(),
    rank: Number.isFinite(rank) ? rank : 0,
    elo,
    winRate: Number.isFinite(winRate) ? winRate : 0,
  };
}

export function parseArenaStats(body: unknown): ArenaStats {
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) throw new Error('Unexpected model-stats response');
  const models = items
    .map(toModel)
    .filter((model): model is ArenaModel => model !== null)
    .sort((a, b) => b.elo - a.elo || a.rank - b.rank);
  if (!models.length) throw new Error('No models in model-stats response');
  return { models, providers: [...new Set(models.map(model => model.provider))] };
}

let request: Promise<ArenaStats> | null = null;

function loadArenaStats(): Promise<ArenaStats> {
  request ??= fetch(STATS_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    .then(response => {
      if (!response.ok) throw new Error(`model-stats answered ${response.status}`);
      return response.json();
    })
    .then(parseArenaStats);
  return request;
}

/** One request per page load, shared by every component that shows Arena numbers. */
export function useArenaStats(): ArenaStatsState {
  const [state, setState] = useState<ArenaStatsState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    loadArenaStats().then(
      data => alive && setState({ status: 'ready', data }),
      () => alive && setState({ status: 'error' }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
