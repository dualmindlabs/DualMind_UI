import { useRef } from 'react';

import { NumberTicker } from '@/components/vendor/magicui/number-ticker';
import { cn } from '@/lib/utils/cn';

import { formatCount, formatPercent } from '../lib/format';
import type { LeaderboardEntry, SortKey, SortState } from '../types';
import { EloBar } from './elo-bar';
import { ProvisionalBadge } from './provisional-badge';
import { RankNumber } from './rank-number';
import { SortHeader } from './sort-header';

export interface LeaderboardTableProps {
  /** Filtered and sorted. */
  entries: readonly LeaderboardEntry[];
  sort: SortState;
  onSort: (column: SortKey) => void;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  /** Elo values count up from here the first time they appear (the board's lowest hundred). */
  eloStart: number;
  /** The leader's id: its bar is drawn at full strength. */
  leaderId?: string | undefined;
  className?: string;
}

function Row({
  entry,
  onOpen,
  eloStart,
  leader,
}: {
  entry: LeaderboardEntry;
  onOpen: LeaderboardTableProps['onOpen'];
  eloStart: number;
  leader: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <tr
      data-model-id={entry.id}
      className="group/row relative border-b border-line transition-colors duration-(--dur-fast) last:border-b-0 hover:bg-hover"
    >
      <td className="w-16 py-3.5 pr-2 pl-4 align-middle">
        <RankNumber
          rank={entry.rank}
          className={cn('text-ui', leader ? 'text-mind-a' : 'text-fg-soft')}
        />
      </td>
      <th scope="row" className="min-w-0 py-3.5 pr-3 pl-3 text-left align-middle font-normal">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen(entry.id, buttonRef.current)}
            className="min-w-0 cursor-pointer text-left text-ui font-medium break-words text-fg outline-none after:absolute after:inset-0 after:z-[1] after:rounded-md group-hover/row:underline group-hover/row:decoration-line-strong group-hover/row:underline-offset-4 focus-visible:after:outline-(length:--focus-width) focus-visible:after:outline-focus focus-visible:after:outline-solid focus-visible:after:-outline-offset-2"
          >
            {entry.name}
          </button>
          {entry.provisional ? <ProvisionalBadge /> : null}
        </div>
        <span className="mt-0.5 block text-caption text-muted lg:hidden">{entry.providerLabel}</span>
      </th>
      <td className="hidden py-3.5 pr-3 pl-3 align-middle text-ui-sm text-fg-soft lg:table-cell">
        {entry.providerLabel}
      </td>
      <td className="py-3.5 pr-3 pl-3 align-middle">
        <span className="flex items-center gap-3">
          <NumberTicker
            value={entry.elo}
            startValue={eloStart}
            grouping={false}
            className="w-12 text-right font-mono text-ui font-medium text-fg"
          />
          <EloBar
            share={entry.eloShare}
            tone={leader ? 'lead' : 'default'}
            className="w-16 lg:w-24 xl:w-32"
          />
        </span>
      </td>
      <td className="hidden py-3.5 pr-3 pl-3 text-right align-middle font-mono text-ui-sm whitespace-nowrap text-fg-soft tabular-nums lg:table-cell">
        <span aria-hidden="true">
          {formatCount(entry.wins)}
          <span className="px-1 text-muted">/</span>
          {formatCount(entry.losses)}
          <span className="px-1 text-muted">/</span>
          {formatCount(entry.ties)}
        </span>
        <span className="sr-only">
          {formatCount(entry.wins)} wins, {formatCount(entry.losses)} losses,{' '}
          {formatCount(entry.ties)} ties
        </span>
      </td>
      <td className="py-3.5 pr-3 pl-3 text-right align-middle font-mono text-ui text-fg tabular-nums">
        {formatPercent(entry.winRate)}
      </td>
      <td className="py-3.5 pr-4 pl-3 text-right align-middle font-mono text-ui text-fg-soft tabular-nums">
        {formatCount(entry.battles)}
      </td>
    </tr>
  );
}

/**
 * The full board from `md` up (phones get BoardCardList). Every column but the record sorts;
 * the model name is the row's button, stretched over the whole row, so a click anywhere or Enter
 * on the focused name opens the details sheet.
 */
export function LeaderboardTable({
  entries,
  sort,
  onSort,
  onOpen,
  eloStart,
  leaderId,
  className,
}: LeaderboardTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface shadow-raise', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Models ranked by Elo rating. Column buttons sort the table; a model name opens its
          details.
        </caption>
        <thead className="border-b border-line bg-surface-2">
          <tr>
            <SortHeader column="rank" sort={sort} onSort={onSort} className="w-16 pl-1" />
            <SortHeader column="name" sort={sort} onSort={onSort} />
            <SortHeader
              column="provider"
              sort={sort}
              onSort={onSort}
              className="hidden lg:table-cell"
            />
            <SortHeader column="elo" sort={sort} onSort={onSort} />
            <th
              scope="col"
              className="hidden h-10 px-3 text-right font-normal whitespace-nowrap text-muted lg:table-cell"
            >
              <span className="eyebrow" aria-hidden="true">
                W / L / T
              </span>
              <span className="sr-only">Wins, losses and ties</span>
            </th>
            <SortHeader column="winRate" sort={sort} onSort={onSort} align="end" />
            <SortHeader column="battles" sort={sort} onSort={onSort} align="end" className="pr-1" />
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <Row
              key={entry.id}
              entry={entry}
              onOpen={onOpen}
              eloStart={eloStart}
              leader={entry.id === leaderId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
