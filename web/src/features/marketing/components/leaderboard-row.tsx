import { ModelMark } from '@/components/ui/model-mark';
import {
  EloBar,
  formatElo,
  formatPercent,
  formatRank,
  ProviderBadge,
  type RatedEntry,
} from '@/features/leaderboard';

/**
 * One row of the top-five preview, with the leaderboard's own pieces: rank, mark, model (the star
 * of the row), provider, the Elo bar (the rating's place in the board's range), Elo and win rate.
 */
export function LeaderboardRow({ model }: { model: RatedEntry }) {
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[2.75rem_minmax(0,1fr)_8rem_4.5rem] sm:py-5">
      <span className="numeric text-h3 text-muted">
        <span className="sr-only">Rank </span>
        {formatRank(model.rank)}
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <ModelMark name={model.name} size="md" className="hidden sm:inline-grid" />
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold text-fg" title={model.modelName}>
            {model.name}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ProviderBadge label={model.providerLabel} via={model.servedBy} />
          </span>
        </span>
      </span>
      <EloBar share={model.eloShare} className="hidden sm:block" />
      <span className="text-right numeric text-body text-fg">
        {formatElo(model.elo)}
        <span className="sr-only"> Elo, {formatPercent(model.winRate)} win rate</span>
        <span aria-hidden="true" className="block text-caption text-muted">
          {formatPercent(model.winRate)}
        </span>
      </span>
    </li>
  );
}
