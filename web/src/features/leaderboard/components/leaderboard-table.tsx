import { ChevronRight } from 'lucide-react';
import { useRef } from 'react';

import { ModelMark } from '@/components/ui/model-mark';
import { cn } from '@/lib/utils/cn';

import { type RangeDomain, ratingRange } from '../lib/confidence';
import { formatCount, formatElo, formatPercent } from '../lib/format';
import type { Movement } from '../lib/movement';
import type { LeaderboardEntry, SortKey, SortState } from '../types';
import { RangeBar } from './range-bar';
import { RankMovement } from './rank-movement';
import { RankNumber } from './rank-number';
import { RecordBar } from './record-bar';
import { SortHeader } from './sort-header';

export interface LeaderboardTableProps {
  /** Filtered and sorted. */
  entries: readonly LeaderboardEntry[];
  sort: SortState;
  onSort: (column: SortKey) => void;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  /** The leader's id: its bar is drawn at full strength. */
  leaderId?: string | undefined;
  /** False for the "Not yet rated" group: no rank column, those models have no rank. */
  showRank?: boolean;
  /** The scale the range bars share. */
  domain?: RangeDomain | undefined;
  movement?: ReadonlyMap<string, Movement> | undefined;
  /** Names the table for screen readers when it is not the main ranking. */
  caption?: string;
  className?: string;
}

const FALLBACK_DOMAIN: RangeDomain = { min: 0, max: 1 };

function Row({
  entry,
  onOpen,
  leader,
  showRank,
  domain,
  movement,
}: {
  entry: LeaderboardEntry;
  onOpen: LeaderboardTableProps['onOpen'];
  leader: boolean;
  showRank: boolean;
  domain: RangeDomain;
  movement: Movement | undefined;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const range = ratingRange(entry);

  return (
    <tr
      data-model-id={entry.id}
      className="group/row relative border-b border-line transition-colors duration-(--dur-fast) last:border-b-0 hover:bg-hover"
    >
      {showRank ? (
        <td className="relative w-24 py-3.5 pr-2 pl-4 align-middle">
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-y-2.5 left-0 w-0.5 origin-center scale-y-0 rounded-full transition-transform duration-(--dur-fast) ease-snap group-hover/row:scale-y-100',
              leader ? 'bg-mind-a' : 'bg-line-strong',
            )}
          />
          <span className="flex items-center gap-2">
            {entry.rank === null ? null : (
              <RankNumber
                rank={entry.rank}
                className={cn('text-ui font-medium', leader ? 'text-mind-a' : 'text-fg-soft')}
              />
            )}
            <RankMovement movement={movement} />
          </span>
        </td>
      ) : null}
      <th
        scope="row"
        className={cn(
          'min-w-0 py-3.5 pr-3 text-left align-middle font-normal',
          showRank ? 'pl-3' : 'pl-4',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <ModelMark name={entry.providerLabel} size="md" className="hidden sm:inline-grid" />
          <div className="grid min-w-0 gap-0.5">
            <button
              ref={buttonRef}
              type="button"
              aria-haspopup="dialog"
              onClick={() => onOpen(entry.id, buttonRef.current)}
              title={entry.modelName}
              className="min-w-0 cursor-pointer text-left text-ui font-medium break-words text-fg outline-none after:absolute after:inset-0 after:z-[1] after:rounded-md focus-visible:after:outline-(length:--focus-width) focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid"
            >
              {entry.name}
            </button>
            <span className="text-caption text-muted lg:hidden">
              {entry.providerLabel}
              {entry.servedBy ? ` · ${entry.servedBy}` : ''}
            </span>
          </div>
        </div>
      </th>
      <td className="hidden py-3.5 pr-3 pl-3 align-middle text-ui-sm text-fg-soft lg:table-cell">
        {entry.providerLabel}
        {entry.servedBy ? (
          <span className="block text-caption text-muted">{entry.servedBy}</span>
        ) : null}
      </td>
      <td className="py-3.5 pr-3 pl-3 align-middle">
        <span className="flex items-center gap-3">
          <span className="grid w-14 justify-items-end text-right">
            <span className="numeric text-ui text-fg">{formatElo(entry.elo)}</span>
            <span
              className="numeric text-label text-muted"
              title="Estimated 95% range, from this model's record"
            >
              <span aria-hidden="true">±{formatElo(range.margin)}</span>
              <span className="sr-only">
                , estimated range {formatElo(range.low)} to {formatElo(range.high)}
              </span>
            </span>
          </span>
          <RangeBar
            elo={range.elo}
            low={range.low}
            high={range.high}
            domain={domain}
            tone={leader ? 'lead' : 'default'}
            className="w-16 lg:w-24 xl:w-32"
          />
        </span>
      </td>
      <td className="hidden py-3.5 pr-3 pl-3 text-right align-middle whitespace-nowrap lg:table-cell">
        <span className="grid justify-items-end gap-1.5">
          <RecordBar
            compact
            wins={entry.wins}
            ties={entry.ties}
            losses={entry.losses}
            className="w-24"
          />
          <span aria-hidden="true" className="numeric text-label text-muted">
            {formatCount(entry.wins)}
            <span className="px-1 text-line-strong">/</span>
            {formatCount(entry.losses)}
            <span className="px-1 text-line-strong">/</span>
            {formatCount(entry.ties)}
          </span>
          <span className="sr-only">
            {formatCount(entry.wins)} wins, {formatCount(entry.losses)} losses,{' '}
            {formatCount(entry.ties)} ties
          </span>
        </span>
      </td>
      <td className="py-3.5 pr-3 pl-3 text-right align-middle">
        <span className="numeric text-ui text-fg">{formatPercent(entry.winRate)}</span>
      </td>
      <td className="py-3.5 pr-2 pl-3 text-right align-middle">
        <span className="numeric text-ui text-fg-soft">{formatCount(entry.battles)}</span>
      </td>
      <td aria-hidden="true" className="w-8 py-3.5 pr-3 align-middle">
        <ChevronRight
          strokeWidth={1.75}
          className="size-4 text-muted transition-[transform,color] duration-(--dur-fast) ease-snap group-hover/row:translate-x-0.5 group-hover/row:text-fg"
        />
      </td>
    </tr>
  );
}

/**
 * The full board from `md` up (phones get BoardCardList). Every column but the record sorts;
 * the model name is the row's button, stretched over the whole row, so a click anywhere or Enter
 * on the focused name opens the details sheet. Ratings carry an estimated range on a shared
 * scale; rank movement shows once this browser has seen the board before.
 */
export function LeaderboardTable({
  entries,
  sort,
  onSort,
  onOpen,
  leaderId,
  showRank = true,
  domain = FALLBACK_DOMAIN,
  movement,
  caption = 'Models ranked by Elo rating. Column buttons sort the table; a model name opens its details.',
  className,
}: LeaderboardTableProps) {
  return (
    <div className={cn('surface-duel overflow-hidden', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-surface-3">
          <tr>
            {showRank ? (
              <SortHeader column="rank" sort={sort} onSort={onSort} className="w-24 pl-1" />
            ) : null}
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
            <th scope="col" className="w-8">
              <span className="sr-only">Open details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <Row
              key={entry.id}
              entry={entry}
              onOpen={onOpen}
              leader={entry.id === leaderId}
              showRank={showRank}
              domain={domain}
              movement={movement?.get(entry.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
