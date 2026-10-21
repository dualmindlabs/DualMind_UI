import { useRef } from 'react';

import { SpotlightCard } from '@/components/vendor/reactbits/spotlight-card';
import {
  EloBar,
  formatCount,
  formatElo,
  formatPercent,
  formatRank,
  type LeaderboardEntry,
  ProviderBadge,
  ProvisionalBadge,
} from '@/features/leaderboard';

export interface ModelCardProps {
  entry: LeaderboardEntry;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
}

/**
 * One model in the directory: provider and rank, the name (the card's button), the full model id,
 * and its Elo, win rate and battles. A quiet Spotlight Card: the light follows the pointer and
 * keyboard focus, nothing moves at rest.
 */
export function ModelCard({ entry, onOpen }: ModelCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <li className="min-w-0" data-model-id={entry.id}>
      <SpotlightCard
        spotlightColor="--mind-a"
        intensity={0.08}
        borderGlow={0.45}
        className="group/model flex h-full flex-col gap-4 p-5 transition-[border-color] duration-(--dur-fast) hover:border-line-strong"
      >
        <div className="flex items-center justify-between gap-3">
          <ProviderBadge label={entry.providerLabel} />
          <span className="font-mono text-ui-sm text-muted tabular-nums">
            <span className="sr-only">Rank </span>#{formatRank(entry.rank)}
          </span>
        </div>

        <div className="grid min-w-0 gap-1">
          <h3 className="min-w-0 text-h3 font-semibold break-words text-fg">
            <button
              ref={buttonRef}
              type="button"
              aria-haspopup="dialog"
              onClick={() => onOpen(entry.id, buttonRef.current)}
              className="cursor-pointer text-left outline-none group-hover/model:underline group-hover/model:decoration-line-strong group-hover/model:underline-offset-4 after:absolute after:inset-0 after:z-[2] after:rounded-lg focus-visible:after:outline-(length:--focus-width) focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid"
            >
              {entry.name}
            </button>
          </h3>
          <p className="truncate font-code text-caption text-muted" title={entry.modelName}>
            {entry.modelName}
          </p>
        </div>

        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4">
          <div className="grid gap-0.5">
            <dt className="eyebrow tracking-[0.12em] text-muted">Elo</dt>
            <dd className="font-mono text-ui font-medium text-fg tabular-nums">
              {formatElo(entry.elo)}
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="eyebrow tracking-[0.12em] text-muted">Win rate</dt>
            <dd className="font-mono text-ui font-medium text-fg tabular-nums">
              {formatPercent(entry.winRate)}
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="eyebrow tracking-[0.12em] text-muted">Battles</dt>
            <dd className="font-mono text-ui font-medium text-fg tabular-nums">
              {formatCount(entry.battles)}
            </dd>
          </div>
        </dl>
        <EloBar share={entry.eloShare} />
        {entry.provisional ? <ProvisionalBadge /> : null}
      </SpotlightCard>
    </li>
  );
}
