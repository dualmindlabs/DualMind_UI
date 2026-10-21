import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

import { PODIUM_SIZE } from '../lib/constants';
import type { LeaderboardEntry } from '../types';
import { PodiumCard } from './podium-card';

export interface PodiumProps {
  /** The board in rank order; undefined while it loads. */
  entries: readonly LeaderboardEntry[] | undefined;
  /** Ratings count up from here once the board arrives (the board's lowest round hundred). */
  eloStart: number;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  className?: string;
}

const GRID = 'grid gap-4 md:grid-cols-[1.2fr_1fr_1fr] md:gap-5';

function PodiumSkeleton() {
  return (
    <ul aria-hidden="true" className={GRID}>
      {Array.from({ length: PODIUM_SIZE }, (_, index) => (
        <li
          key={index}
          className="grid h-72 content-between rounded-lg border border-line bg-surface p-6 shadow-raise"
        >
          <div className="flex justify-between">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-10 w-full" />
        </li>
      ))}
    </ul>
  );
}

/** The top three, leader first (and widest). Reading order and visual order are the same. */
export function Podium({ entries, eloStart, onOpen, className }: PodiumProps) {
  if (entries === undefined) {
    return (
      <div className={className}>
        <PodiumSkeleton />
      </div>
    );
  }
  const top = entries.slice(0, PODIUM_SIZE);
  if (top.length === 0) return null;

  return (
    <div className={className}>
      <ol aria-label="Top three models" className={cn(GRID)}>
        {top.map((entry, place) => (
          <PodiumCard
            key={entry.id}
            entry={entry}
            place={place}
            eloStart={eloStart}
            onOpen={onOpen}
          />
        ))}
      </ol>
    </div>
  );
}
