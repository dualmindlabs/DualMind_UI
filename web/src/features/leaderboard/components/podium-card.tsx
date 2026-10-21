import { ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';

import { ShineBorder } from '@/components/vendor/magicui/shine-border';
import { CountUp } from '@/components/vendor/reactbits/count-up';
import { DecryptedText } from '@/components/vendor/reactbits/decrypted-text';
import { SpotlightCard } from '@/components/vendor/reactbits/spotlight-card';
import { cn } from '@/lib/utils/cn';

import { formatCount, formatPercent, formatRank } from '../lib/format';
import type { RatedEntry } from '../types';
import { EloBar } from './elo-bar';
import { ProviderBadge } from './provider-badge';

export interface PodiumCardProps {
  entry: RatedEntry;
  /** 0 for the leader. */
  place: number;
  /** The rating counts up from here when the card first appears. */
  eloStart: number;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
}

/**
 * One of the top three: a Spotlight Card (the leader also gets a Shine Border) with the rank,
 * the name decoding into place the first time it scrolls into view, and the three numbers that
 * matter. The whole card opens the details sheet through the name's button.
 */
export function PodiumCard({ entry, place, eloStart, onOpen }: PodiumCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const leader = place === 0;

  return (
    <li className="min-w-0">
      <SpotlightCard
        spotlightColor={leader ? '--mind-a' : '--line-strong'}
        className={cn(
          'group/podium h-full p-5 transition-[border-color] duration-(--dur-fast) hover:border-line-strong sm:p-6',
          leader && 'border-mind-a/30 bg-[color-mix(in_oklab,var(--mind-a)_5%,var(--surface))]',
        )}
        data-place={place + 1}
      >
        {leader ? <ShineBorder duration={16} /> : null}
        <div className="flex h-full flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <p className="grid gap-1">
              <span className="eyebrow text-muted">{leader ? 'Leader' : `Place ${place + 1}`}</span>
              <span
                className={cn(
                  'font-mono text-h1 leading-none font-medium tabular-nums',
                  leader ? 'text-mind-a' : 'text-fg',
                )}
              >
                <span className="sr-only">Rank </span>
                {formatRank(entry.rank)}
              </span>
            </p>
            <ProviderBadge label={entry.providerLabel} via={entry.servedBy} />
          </div>

          <div className="grid min-w-0 gap-1.5">
            <h3 className="min-w-0 text-h3 font-semibold break-words text-fg" title={entry.modelName}>
              <button
                ref={buttonRef}
                type="button"
                aria-haspopup="dialog"
                onClick={() => onOpen(entry.id, buttonRef.current)}
                className="cursor-pointer text-left outline-none after:absolute after:inset-0 after:z-[2] after:rounded-lg focus-visible:after:outline-(length:--focus-width) focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid"
              >
                <DecryptedText text={entry.name} animateOn="view" speed={40} maxIterations={14} />
              </button>
            </h3>
            <p className="truncate font-code text-caption text-muted" title={entry.modelName}>
              {entry.modelName}
            </p>
          </div>

          <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-4">
            <div className="grid gap-1">
              <dt className="eyebrow text-muted">Elo</dt>
              <dd className="text-h3 font-medium text-fg tabular-nums">
                <CountUp from={eloStart} to={Math.round(entry.elo)} duration={1.4} trigger="load" />
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="eyebrow text-muted">Win rate</dt>
              <dd className="text-h3 font-medium text-fg tabular-nums">
                {formatPercent(entry.winRate)}
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="eyebrow text-muted">Battles</dt>
              <dd className="text-h3 font-medium text-fg tabular-nums">
                {formatCount(entry.battles)}
              </dd>
            </div>
          </dl>

          <EloBar share={entry.eloShare} tone={leader ? 'lead' : 'default'} />

          <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
            <span />
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1 text-caption text-muted transition-colors duration-(--dur-fast) group-hover/podium:text-fg"
            >
              Details
              <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </SpotlightCard>
    </li>
  );
}
