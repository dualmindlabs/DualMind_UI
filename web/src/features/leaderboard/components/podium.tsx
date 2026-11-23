import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

import type { RangeDomain } from '../lib/confidence';
import { PODIUM_SIZE } from '../lib/constants';
import type { Movement } from '../lib/movement';
import type { RatedEntry } from '../types';
import { PodiumCard } from './podium-card';

export interface PodiumProps {
  /** The rated models in rank order (never the ones not yet rated); undefined while it loads. */
  entries: readonly RatedEntry[] | undefined;
  /** Ratings count up from here once the board arrives (the board's lowest round hundred). */
  eloStart: number;
  /** The scale the range bars share. */
  domain?: RangeDomain;
  movement?: ReadonlyMap<string, Movement>;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  className?: string;
}

/** The leader's stage on the left (or on top), second and third beside it (or below). */
const GRID = 'grid gap-4 md:grid-cols-2 md:gap-5';

function PodiumSkeleton() {
  return (
    <ul aria-hidden="true" className={GRID}>
      <li className="grid min-h-96 content-between rounded-lg border border-line bg-surface p-8 shadow-raise md:col-span-2">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-14" />
        </div>
        <div className="grid gap-3">
          <Skeleton className="size-14" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-2 w-full" />
        </div>
      </li>
      {[0, 1].map(index => (
        <li
          key={index}
          className="grid min-h-60 content-between rounded-lg border border-line bg-surface p-6 shadow-raise"
        >
          <div className="flex justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-10" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-2 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The top three, leader first. Reading order and visual order are the same. */
export function Podium({ entries, eloStart, domain, movement, onOpen, className }: PodiumProps) {
  if (entries === undefined) {
    return (
      <div className={className}>
        <PodiumSkeleton />
      </div>
    );
  }
  const top = entries.slice(0, PODIUM_SIZE);
  if (top.length === 0) return null;
  const shared = domain ?? { min: 0, max: 1 };

  return (
    <div className={className}>
      <ol aria-label="Top three models" className={cn(GRID)}>
        {top.map((entry, place) => (
          <PodiumCard
            key={entry.id}
            entry={entry}
            place={place}
            eloStart={eloStart}
            domain={shared}
            movement={movement?.get(entry.id)}
            onOpen={onOpen}
          />
        ))}
      </ol>
    </div>
  );
}
