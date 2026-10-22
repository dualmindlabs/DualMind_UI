import { ChevronRight } from 'lucide-react';
import { useRef } from 'react';

import { ModelMark } from '@/components/ui/model-mark';
import { cn } from '@/lib/utils/cn';

import { type RangeDomain, ratingRange } from '../lib/confidence';
import { formatCount, formatElo, formatPercent, formatRank } from '../lib/format';
import type { Movement } from '../lib/movement';
import type { LeaderboardEntry } from '../types';
import { RangeBar } from './range-bar';
import { RankMovement } from './rank-movement';
import { RecordBar } from './record-bar';

export interface BoardCardListProps {
  /** Filtered and sorted. */
  entries: readonly LeaderboardEntry[];
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  leaderId?: string | undefined;
  /** False for the "Not yet rated" group: no rank number, those models have no rank. */
  showRank?: boolean;
  /** The scale the range bars share. */
  domain?: RangeDomain | undefined;
  movement?: ReadonlyMap<string, Movement> | undefined;
  /** The list's accessible name. */
  label?: string;
  className?: string;
}

const FALLBACK_DOMAIN: RangeDomain = { min: 0, max: 1 };

function BoardCard({
  entry,
  onOpen,
  leader,
  showRank,
  domain,
  movement,
}: {
  entry: LeaderboardEntry;
  onOpen: BoardCardListProps['onOpen'];
  leader: boolean;
  showRank: boolean;
  domain: RangeDomain;
  movement: Movement | undefined;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const range = ratingRange(entry);

  return (
    <li
      data-model-id={entry.id}
      className={cn(
        'relative grid gap-x-3 gap-y-3.5 px-4 py-4 transition-colors duration-(--dur-fast) active:bg-pressed',
        showRank ? 'grid-cols-[2.5rem_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]',
        leader && 'bg-mind-a-wash',
      )}
    >
      {showRank && entry.rank !== null ? (
        <span className="row-span-2 grid content-start justify-items-start gap-1.5 pt-0.5">
          <span
            className={cn('numeric text-h3 leading-none', leader ? 'text-mind-a' : 'text-fg-soft')}
          >
            <span className="sr-only">Rank </span>
            {formatRank(entry.rank)}
          </span>
          <RankMovement movement={movement} />
        </span>
      ) : null}
      <div className="flex min-w-0 items-center gap-2.5">
        <ModelMark name={entry.providerLabel} size="md" />
        <div className="grid min-w-0 gap-0.5">
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen(entry.id, buttonRef.current)}
            title={entry.modelName}
            className="min-w-0 cursor-pointer text-left text-ui font-medium break-words text-fg outline-none after:absolute after:inset-0 after:z-[1] focus-visible:after:outline-(length:--focus-width) focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid"
          >
            {entry.name}
          </button>
          <span className="text-caption text-muted">
            {entry.providerLabel}
            {entry.servedBy ? ` · ${entry.servedBy}` : ''}
          </span>
        </div>
      </div>
      <span className="grid justify-items-end gap-0.5 text-right">
        <span className="numeric text-h3 leading-none text-fg">{formatElo(entry.elo)}</span>
        <span className="eyebrow text-muted">Elo</span>
      </span>
      <div className="col-span-2 grid gap-3">
        <div className="grid gap-1.5">
          <RangeBar
            elo={range.elo}
            low={range.low}
            high={range.high}
            domain={domain}
            tone={leader ? 'lead' : 'default'}
          />
          <p className="numeric text-label text-muted">
            <span aria-hidden="true">
              Range {formatElo(range.low)} to {formatElo(range.high)}
            </span>
            <span className="sr-only">
              Estimated rating range {formatElo(range.low)} to {formatElo(range.high)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-x-4 text-caption text-fg-soft">
          <span className="numeric">
            {formatPercent(entry.winRate)}
            <span className="font-sans font-normal text-muted"> win rate</span>
          </span>
          <span className="numeric">
            {formatCount(entry.battles)}
            <span className="font-sans font-normal text-muted">
              {' '}
              {entry.battles === 1 ? 'battle' : 'battles'}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            strokeWidth={1.75}
            className="ml-auto size-4 text-muted"
          />
        </div>
        <RecordBar compact wins={entry.wins} ties={entry.ties} losses={entry.losses} />
        <p className="sr-only">
          {formatCount(entry.wins)} wins, {formatCount(entry.losses)} losses,{' '}
          {formatCount(entry.ties)} ties
        </p>
      </div>
    </li>
  );
}

/**
 * The board on phones: one card per model with the rank and its movement, the maker's mark, name,
 * Elo, the estimated range, win rate, battles and the record. The whole card opens the details
 * drawer.
 */
export function BoardCardList({
  entries,
  onOpen,
  leaderId,
  showRank = true,
  domain = FALLBACK_DOMAIN,
  movement,
  label = 'Models ranked by Elo',
  className,
}: BoardCardListProps) {
  return (
    <ul
      aria-label={label}
      className={cn('surface-duel divide-y divide-line overflow-hidden', className)}
    >
      {entries.map(entry => (
        <BoardCard
          key={entry.id}
          entry={entry}
          onOpen={onOpen}
          leader={entry.id === leaderId}
          showRank={showRank}
          domain={domain}
          movement={movement?.get(entry.id)}
        />
      ))}
    </ul>
  );
}
