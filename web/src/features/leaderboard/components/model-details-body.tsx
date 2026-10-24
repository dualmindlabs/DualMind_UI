import { type ReactNode, Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { cn } from '@/lib/utils/cn';

import { rangeDomain, ratingRange } from '../lib/confidence';
import { PROVISIONAL_BATTLES } from '../lib/constants';
import {
  formatCount,
  formatElo,
  formatEloDelta,
  formatOrdinal,
  formatPercent,
  pluralize,
} from '../lib/format';
import { describeMovement, type Movement } from '../lib/movement';
import type { Leaderboard, LeaderboardEntry } from '../types';
import { RangeBar } from './range-bar';
import { RankMovement } from './rank-movement';
import { RecordBar } from './record-bar';

// Recharts stays out of the page bundles: it loads when a details sheet first opens.
const WinRateChart = lazyWithRetry(
  () => import('./win-rate-chart').then(module => ({ default: module.WinRateChart })),
  { silent: true },
);

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="surface-duel grid content-start gap-1.5 px-3.5 py-3.5 [&>dd]:min-w-0">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="numeric text-h3 text-fg">{value}</dd>
      <dd className="text-caption text-muted">{hint}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="border-b border-line pb-2 eyebrow text-fg-soft">{title}</h3>
      {children}
    </section>
  );
}

export interface ModelDetailsBodyProps {
  entry: LeaderboardEntry;
  board: Leaderboard;
  /** How the rank moved since the visitor's last visit, when this browser has seen the board. */
  movement?: Movement | undefined;
}

/** The rated models just above and below this one, for "closest rivals". */
function neighbours(entry: LeaderboardEntry, board: Leaderboard) {
  if (entry.rank === null) return [];
  const index = board.rated.findIndex(other => other.id === entry.id);
  if (index < 0) return [];
  return board.rated
    .slice(Math.max(0, index - 2), index + 3)
    .filter(other => other.id !== entry.id);
}

/**
 * What the details sheet (or drawer) shows for one model: the rating with its estimated range,
 * the other numbers in context (gap to the leader, the board's average, the provisional rule,
 * shared ranks), the record, the closest rivals, and where its win rate sits on the board.
 */
export function ModelDetailsBody({ entry, board, movement }: ModelDetailsBodyProps) {
  const { entries, rated, summary } = board;
  const leader = rated[0];
  const gap = leader ? entry.elo - leader.elo : 0;
  const sharing =
    entry.rank === null ? 0 : rated.filter(other => other.rank === entry.rank).length - 1;
  const winRateRank = 1 + entries.filter(other => other.winRate > entry.winRate).length;
  const recorded = entry.wins + entry.losses + entry.ties;
  const range = ratingRange(entry);
  const domain = rangeDomain(entry.rank === null ? [entry, ...rated] : rated);
  const rivals = neighbours(entry, board);
  const isLeader = leader !== undefined && leader.id === entry.id;

  return (
    <div className="grid gap-7">
      <div className={cn('grid gap-5 p-5', entry.rank === 1 ? 'surface-a glow-a' : 'surface-duel')}>
        <div className="flex items-end justify-between gap-4">
          <div className="grid gap-2">
            <span className="eyebrow text-muted">Elo</span>
            <span className="numeric text-stat leading-none text-fg">{formatElo(entry.elo)}</span>
          </div>
          <p
            className="pb-1 numeric text-ui text-fg-soft"
            title="Estimated 95% range, from this model's record"
          >
            <span aria-hidden="true">±{formatElo(range.margin)}</span>
            <span className="sr-only">
              Estimated range {formatElo(range.low)} to {formatElo(range.high)}
            </span>
          </p>
        </div>
        <RangeBar
          elo={range.elo}
          low={range.low}
          high={range.high}
          domain={domain}
          tone={entry.rank === 1 ? 'lead' : 'default'}
          size="md"
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-caption text-muted">
          <span>
            {entry.provisional
              ? 'Can still move a lot'
              : leader === undefined || isLeader || gap === 0
                ? 'Top of the board'
                : `${formatEloDelta(gap)} on the leader`}
          </span>
          <span className="numeric">
            Range {formatElo(range.low)} to {formatElo(range.high)}, estimated
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2.5">
        <Stat
          label="Rank"
          value={
            entry.rank === null
              ? 'Not yet rated'
              : `${formatCount(entry.rank)} of ${formatCount(summary.rated)}`
          }
          hint={
            entry.rank === null
              ? `From ${formatCount(PROVISIONAL_BATTLES)} battles`
              : sharing > 0
                ? `Shared with ${pluralize(sharing, 'other model')}`
                : 'Among rated models'
          }
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
              ? `${formatCount(Math.max(0, PROVISIONAL_BATTLES - entry.battles))} more to be rated`
              : `Past the ${formatCount(PROVISIONAL_BATTLES)}-battle mark`
          }
        />
      </dl>

      {movement !== undefined && entry.rank !== null ? (
        <p className="flex items-center gap-2.5 text-ui-sm text-fg-soft">
          <RankMovement movement={movement} />
          {describeMovement(movement)}.
        </p>
      ) : null}

      {entry.provisional ? (
        <p className="surface-duel border-warn/50 px-3.5 py-3 text-ui-sm text-fg-soft">
          <span className="font-medium text-fg">Not yet rated.</span> With{' '}
          {pluralize(entry.battles, 'battle')}, a few votes can still move this rating a long way.
          The board gives a model a rank once it has {formatCount(PROVISIONAL_BATTLES)} battles.
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

      {rivals.length > 0 ? (
        <Section title="Closest rivals">
          <ol className="divide-y divide-line overflow-hidden rounded-md border border-line">
            {rivals.map(rival => {
              const diff = rival.elo - entry.elo;
              return (
                <li
                  key={rival.id}
                  className="flex items-center justify-between gap-3 bg-surface px-3.5 py-2.5 text-ui-sm"
                >
                  <span className="min-w-0 truncate text-fg">
                    <span className="mr-2.5 numeric text-caption text-muted">
                      <span className="sr-only">Rank </span>
                      {rival.rank}
                    </span>
                    {rival.name}
                  </span>
                  <span className="shrink-0 numeric text-fg-soft">
                    {formatElo(rival.elo)}
                    <span className="ml-2 text-caption text-muted">
                      {diff === 0 ? 'level' : `${formatEloDelta(diff)} Elo`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>
      ) : null}

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
