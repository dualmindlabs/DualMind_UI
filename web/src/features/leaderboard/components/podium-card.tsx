import { ArrowUpRight, Crown } from 'lucide-react';
import { type ReactNode, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { ModelMark } from '@/components/ui/model-mark';
import { ShineBorder } from '@/components/vendor/magicui/shine-border';
import { CountUp } from '@/components/vendor/reactbits/count-up';
import { DecryptedText } from '@/components/vendor/reactbits/decrypted-text';
import { SpotlightCard } from '@/components/vendor/reactbits/spotlight-card';
import { cn } from '@/lib/utils/cn';

import { type RangeDomain, ratingRange } from '../lib/confidence';
import { formatCount, formatElo, formatPercent, formatRank } from '../lib/format';
import type { Movement } from '../lib/movement';
import type { RatedEntry } from '../types';
import { ProviderBadge } from './provider-badge';
import { RangeBar } from './range-bar';
import { RankMovement } from './rank-movement';
import { RecordBar } from './record-bar';

export interface PodiumCardProps {
  entry: RatedEntry;
  /** 0 for the leader. */
  place: number;
  /** The rating counts up from here when the card first appears. */
  eloStart: number;
  domain: RangeDomain;
  movement?: Movement | undefined;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="numeric text-h3 text-fg">{children}</dd>
    </div>
  );
}

/**
 * One of the top three. The leader is staged: a lit Mind A surface with a shine border, a giant
 * rank numeral behind the name, the rating at display size and its estimated range. Second and
 * third are the same facts on a quieter surface. The whole card opens the details sheet through
 * the name's button.
 */
export function PodiumCard({ entry, place, eloStart, domain, movement, onOpen }: PodiumCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const leader = place === 0;
  const range = ratingRange(entry);

  return (
    <li className={cn('min-w-0', leader && 'md:col-span-2')}>
      <div className={cn('h-full', leader ? 'surface-a glow-a' : 'surface-duel hover-rise')}>
        <SpotlightCard
          spotlightColor={leader ? '--mind-a' : '--line-strong'}
          className={cn(
            'group/podium h-full rounded-[inherit] border-0 bg-transparent p-5 shadow-none sm:p-6',
            leader && 'p-6 sm:p-8',
          )}
          data-place={place + 1}
        >
          {leader ? <ShineBorder duration={16} /> : null}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -top-[0.12em] -right-2 -z-10 font-mono leading-none font-semibold tracking-[-0.06em] select-none',
              leader
                ? 'text-[clamp(9rem,22vw,17rem)] text-mind-a/[0.09]'
                : 'text-[clamp(6rem,12vw,8.5rem)] text-fg/[0.045]',
            )}
          >
            {formatRank(entry.rank)}
          </span>

          <div
            className={cn(
              'flex h-full flex-col',
              leader ? 'gap-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-x-14' : 'gap-5',
            )}
          >
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-3',
                leader && 'lg:col-span-2',
              )}
            >
              <div className="flex items-center gap-2.5">
                {leader ? (
                  <Badge variant="solid">
                    <Crown aria-hidden="true" strokeWidth={2} />
                    Leader
                  </Badge>
                ) : (
                  <Badge variant="neutral">Place {entry.rank}</Badge>
                )}
                <RankMovement movement={movement} />
              </div>
              <span
                className={cn(
                  'numeric leading-none',
                  leader ? 'text-h2 text-mind-a' : 'text-h3 text-fg-soft',
                )}
              >
                <span className="sr-only">Rank </span>
                {formatRank(entry.rank)}
              </span>
            </div>

            <div className="grid min-w-0 gap-3">
              <div className="flex items-center gap-3">
                <ModelMark name={entry.providerLabel} size={leader ? 'lg' : 'md'} />
                <ProviderBadge label={entry.providerLabel} via={entry.servedBy} />
              </div>
              <h3
                className={cn(
                  'min-w-0 font-semibold tracking-tight break-words text-fg',
                  leader ? 'max-w-[18ch] text-h2' : 'text-h3',
                )}
                title={entry.modelName}
              >
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

            <div className="mt-auto grid gap-5">
              <div className="grid gap-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="grid gap-1">
                    <span className="eyebrow text-muted">Elo</span>
                    <span
                      className={cn(
                        'numeric leading-none text-fg',
                        leader ? 'text-stat' : 'text-h2',
                      )}
                    >
                      <CountUp
                        from={eloStart}
                        to={Math.round(entry.elo)}
                        duration={1.4}
                        trigger="load"
                      />
                    </span>
                  </p>
                  <p
                    className="pb-1 numeric text-caption text-muted"
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
                  tone={leader ? 'lead' : 'default'}
                  size="md"
                />
              </div>

              <dl
                className={cn(
                  'grid gap-4 border-t border-line pt-4',
                  leader ? 'grid-cols-3' : 'grid-cols-2',
                )}
              >
                <Figure label="Win rate">{formatPercent(entry.winRate)}</Figure>
                <Figure label="Battles">{formatCount(entry.battles)}</Figure>
                {leader ? (
                  <div className="grid content-start gap-2">
                    <dt className="eyebrow text-muted">Record</dt>
                    <dd>
                      <RecordBar
                        compact
                        wins={entry.wins}
                        ties={entry.ties}
                        losses={entry.losses}
                        className="pt-2.5"
                      />
                    </dd>
                  </div>
                ) : null}
              </dl>

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
      </div>
    </li>
  );
}
