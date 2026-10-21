import { ChevronRight } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '@/lib/utils/cn';

import { formatCount, formatElo, formatPercent, formatRank } from '../lib/format';
import type { LeaderboardEntry } from '../types';
import { EloBar } from './elo-bar';

export interface BoardCardListProps {
  /** Filtered and sorted. */
  entries: readonly LeaderboardEntry[];
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  leaderId?: string | undefined;
  /** False for the "Not yet rated" group: no rank number, those models have no rank. */
  showRank?: boolean;
  /** The list's accessible name. */
  label?: string;
  className?: string;
}

function BoardCard({
  entry,
  onOpen,
  leader,
  showRank,
}: {
  entry: LeaderboardEntry;
  onOpen: BoardCardListProps['onOpen'];
  leader: boolean;
  showRank: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <li
      data-model-id={entry.id}
      className={cn(
        'relative grid gap-x-3 gap-y-2.5 px-4 py-4 transition-colors duration-(--dur-fast) active:bg-pressed',
        showRank ? 'grid-cols-[2.75rem_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]',
      )}
    >
      {showRank && entry.rank !== null ? (
        <span
          className={cn(
            'row-span-2 pt-0.5 font-mono text-h3 leading-none font-medium tabular-nums',
            leader ? 'text-mind-a' : 'text-fg-soft',
          )}
        >
          <span className="sr-only">Rank </span>
          {formatRank(entry.rank)}
        </span>
      ) : null}
      <div className="grid min-w-0 gap-1">
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
      <span className="grid justify-items-end gap-0.5 text-right">
        <span className="font-mono text-ui font-medium text-fg tabular-nums">
          {formatElo(entry.elo)}
        </span>
        <span className="eyebrow text-muted">Elo</span>
      </span>
      <div className="col-span-2 grid gap-2.5">
        <EloBar share={entry.eloShare} tone={leader ? 'lead' : 'default'} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-fg-soft">
          <span className="font-mono tabular-nums">
            {formatPercent(entry.winRate)}
            <span className="text-muted"> win rate</span>
          </span>
          <span className="font-mono tabular-nums">
            {formatCount(entry.battles)}
            <span className="text-muted"> {entry.battles === 1 ? 'battle' : 'battles'}</span>
          </span>
          <ChevronRight
            aria-hidden="true"
            strokeWidth={1.75}
            className="ml-auto size-4 text-muted"
          />
        </div>
      </div>
    </li>
  );
}

/**
 * The board on phones: one card per model with the rank, name, provider, Elo and its bar, win
 * rate and battles. The whole card opens the details drawer.
 */
export function BoardCardList({
  entries,
  onOpen,
  leaderId,
  showRank = true,
  label = 'Models ranked by Elo',
  className,
}: BoardCardListProps) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-raise',
        className,
      )}
    >
      {entries.map(entry => (
        <BoardCard
          key={entry.id}
          entry={entry}
          onOpen={onOpen}
          leader={entry.id === leaderId}
          showRank={showRank}
        />
      ))}
    </ul>
  );
}
