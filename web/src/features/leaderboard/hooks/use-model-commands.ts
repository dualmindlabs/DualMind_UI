import { ChartNoAxesColumn } from 'lucide-react';
import { useMemo } from 'react';

import { type CommandGroupDefinition, useCommandPaletteGroup } from '@/hooks/use-command-palette';

import { formatRank } from '../lib/format';
import type { LeaderboardEntry } from '../types';

/**
 * Adds every model on the board to the command palette (Ctrl+K or Cmd+K) while the page is open:
 * "Open llama-3.3-70b…" opens its details sheet. Matches names, model ids and providers.
 */
export function useModelCommands(
  entries: readonly LeaderboardEntry[] | undefined,
  openModel: (id: string) => void,
): void {
  const group = useMemo<CommandGroupDefinition | null>(
    () =>
      entries === undefined || entries.length === 0
        ? null
        : {
            id: 'leaderboard-models',
            heading: 'Models',
            actions: entries.map(entry => ({
              id: `model-${entry.id}`,
              label: `Open ${entry.name}`,
              keywords: [
                entry.modelName,
                entry.providerLabel,
                entry.platformLabel,
                'model',
                'details',
              ],
              icon: ChartNoAxesColumn,
              hint: entry.rank === null ? 'Not yet rated' : `#${formatRank(entry.rank)}`,
              perform: () => openModel(entry.id),
            })),
          },
    [entries, openModel],
  );
  useCommandPaletteGroup(group);
}
