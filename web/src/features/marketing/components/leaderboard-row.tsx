import {
  EloBar,
  formatElo,
  formatPercent,
  formatRank,
  ProviderBadge,
  type RatedEntry,
} from '@/features/leaderboard';

/**
 * One row of the top-five preview, with the leaderboard's own pieces: rank, model, provider, the
 * Elo bar (the rating's place in the board's range), Elo and win rate.
 */
export function LeaderboardRow({ model }: { model: RatedEntry }) {
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_4.5rem]">
      <span className="font-mono text-h3 text-muted tabular-nums">
        <span className="sr-only">Rank </span>
        {formatRank(model.rank)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-ui font-medium text-fg" title={model.modelName}>
          {model.name}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <ProviderBadge label={model.providerLabel} via={model.servedBy} />
        </span>
      </span>
      <EloBar share={model.eloShare} className="hidden sm:block" />
      <span className="text-right font-mono text-ui text-fg tabular-nums">
        {formatElo(model.elo)}
        <span className="sr-only"> Elo, {formatPercent(model.winRate)} win rate</span>
        <span aria-hidden="true" className="block text-caption text-muted">
          {formatPercent(model.winRate)}
        </span>
      </span>
    </li>
  );
}
