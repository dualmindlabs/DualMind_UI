import { useEffect, useMemo, useSyncExternalStore } from 'react';

import {
  getBaseline,
  loadPageBaseline,
  type Movement,
  movementOf,
  subscribeBaseline,
} from '../lib/movement';
import type { RatedEntry } from '../types';

const serverBaseline = () => null;

/**
 * Rank movement per model id, against the ranks this browser showed at the last visit. Empty on a
 * first visit and on the server: the board then shows no movement, rather than an invented one.
 * The baseline is read once, when the board first arrives, so a background refresh that moves a
 * model shows up against it.
 */
export function useRankMovement(
  rated: readonly RatedEntry[] | undefined,
): ReadonlyMap<string, Movement> {
  const baseline = useSyncExternalStore(subscribeBaseline, getBaseline, serverBaseline);

  useEffect(() => {
    if (rated === undefined || rated.length === 0) return;
    const ranks: Record<string, number> = {};
    for (const entry of rated) ranks[entry.id] = entry.rank;
    loadPageBaseline(ranks);
  }, [rated]);

  return useMemo(() => {
    const map = new Map<string, Movement>();
    if (baseline === null || rated === undefined) return map;
    for (const entry of rated) map.set(entry.id, movementOf(entry.id, entry.rank, baseline));
    return map;
  }, [baseline, rated]);
}
