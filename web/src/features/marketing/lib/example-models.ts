import { modelMaker, resolveDisplayName } from '@/lib/models/display-name';

import { MODEL_SNAPSHOT } from '../content/model-snapshot';
import type { LiveStatsState } from '../hooks/use-live-stats';

export interface ExampleModel {
  name: string;
  maker: string;
  /** The live rating, or null while the board has not answered (the snapshot has no numbers). */
  elo: number | null;
}

/**
 * Two real models for the product pictures on the landing page (the reveal step, the fair
 * pairings card). From the live board when it has answered, otherwise from the dated model
 * snapshot, which carries names and makers only: a picture never shows a rating that did not come
 * from the API.
 */
export function exampleModels(stats: LiveStatsState): [ExampleModel, ExampleModel] {
  if (stats.status === 'ready') {
    const [first, second, third, fourth] = stats.stats.top;
    const pick = (entry: typeof first): ExampleModel | null =>
      entry ? { name: entry.name, maker: entry.providerLabel, elo: entry.elo } : null;
    const winner = pick(first);
    const other = pick(fourth) ?? pick(third) ?? pick(second);
    if (winner && other) return [winner, other];
  }
  const fromSnapshot = (index: number): ExampleModel => {
    const model = MODEL_SNAPSHOT[index] ?? MODEL_SNAPSHOT[0];
    return {
      name: resolveDisplayName(model?.name ?? 'model'),
      maker: modelMaker(model?.name ?? 'model', model?.providerId ?? '').label,
      elo: null,
    };
  };
  return [fromSnapshot(0), fromSnapshot(2)];
}
