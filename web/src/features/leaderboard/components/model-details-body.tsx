import { lazy, type ReactNode, Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { PROVISIONAL_BATTLES } from '../lib/constants';
import {
  formatCount,
  formatElo,
  formatEloDelta,
  formatOrdinal,
  formatPercent,
  pluralize,
} from '../lib/format';
import type { Leaderboard, LeaderboardEntry } from '../types';
import { RecordBar } from './record-bar';

// Recharts stays out of the page bundles: it loads when a details sheet first opens.
const WinRateChart = lazy(() =>
  import('./win-rate-chart').then(module => ({ default: module.WinRateChart })),
);

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="grid content-start gap-1 rounded-md border border-line bg-surface px-3.5 py-3">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="text-h3 font-medium text-fg tabular-nums">{value}</dd>
      <dd className="text-caption text-muted">{hint}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="eyebrow text-fg-soft">{title}</h3>
      {children}
    </section>
  );
}

export interface ModelDetailsBodyProps {
  entry: LeaderboardEntry;
  board: Leaderboard;
}

/**
 * What the details sheet (or drawer) shows for one model: the four numbers in context (gap to
 * the leader, the board's average, the provisional rule, shared ranks), the record, and where
 * its win rate sits on the board.
 */
export function ModelDetailsBody({ entry, board }: ModelDetailsBodyProps) {
  const { entries, summary } = board;
  const leader = entries[0];
  const gap = leader ? entry.elo - leader.elo : 0;
  const sharing = entries.filter(other => other.rank === entry.rank).length - 1;
  const winRateRank = 1 + entries.filter(other => other.winRate > entry.winRate).length;
  const recorded = entry.wins + entry.losses + entry.ties;

  return (
    <div className="grid gap-7">
      <dl className="grid grid-cols-2 gap-2.5">
        <Stat
          label="Elo"
          value={formatElo(entry.elo)}
          hint={
            leader === undefined || leader.id === entry.id || gap === 0
              ? 'Top of the board'
              : `${formatEloDelta(gap)} on the leader`
          }
        />
        <Stat
          label="Rank"
          value={`${formatCount(entry.rank)} of ${formatCount(summary.models)}`}
          hint={sharing > 0 ? `Shared with ${pluralize(sharing, 'other model')}` : 'By Elo rating'}
        />
        <Stat
          label="Win rate"
          value={formatPercent(entry.winRate)}
          hint={`Board average ${formatPercent(summary.averageWinRate)}`}
        />
        <Stat
          label="Battles"
          value={formatCount(entry.battles)}
          hint={
            entry.provisional
              ? `Provisional below ${formatCount(PROVISIONAL_BATTLES)}`
              : `Past the ${formatCount(PROVISIONAL_BATTLES)}-battle mark`
          }
        />
      </dl>

      {entry.provisional ? (
        <p className="rounded-md border border-warn/40 bg-surface px-3.5 py-3 text-ui-sm text-fg-soft">
          <span className="font-medium text-fg">Provisional rating.</span> With{' '}
          {pluralize(entry.battles, 'battle')}, a few votes can still move this rating a long way.
          The board marks a rating provisional until it has {formatCount(PROVISIONAL_BATTLES)}{' '}
          battles.
        </p>
      ) : null}

      <Section title="Record">
        <RecordBar wins={entry.wins} ties={entry.ties} losses={entry.losses} />
        {recorded !== entry.battles ? (
          <p className="text-caption text-muted">
            Wins, losses and ties add up to {formatCount(recorded)}, battles to{' '}
            {formatCount(entry.battles)}: the API counts them separately.
          </p>
        ) : null}
      </Section>

      <Section title="Win rate across the board">
        <Suspense fallback={<Skeleton className="h-44 w-full" />}>
          <WinRateChart entries={entries} selectedId={entry.id} average={summary.averageWinRate} />
        </Suspense>
        <p className="text-caption text-muted">
          One column per model, highest win rate first.{' '}
          <span className="text-fg-soft">
            {entry.name} wins {formatPercent(entry.winRate)} of its battles,{' '}
            {formatOrdinal(winRateRank)} of {formatCount(summary.models)} by win rate.
          </span>{' '}
          Ties count as non-wins.
        </p>
      </Section>
    </div>
  );
}
