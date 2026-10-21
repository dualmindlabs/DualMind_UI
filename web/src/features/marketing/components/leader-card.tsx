import { Trophy } from 'lucide-react';

import { ShineBorder } from '@/components/vendor/magicui/shine-border';
import { CountUp } from '@/components/vendor/reactbits/count-up';
import { SpotlightCard } from '@/components/vendor/reactbits/spotlight-card';
import {
  formatCount,
  formatPercent,
  type LeaderboardEntry,
  ProviderBadge,
  ProvisionalBadge,
} from '@/features/leaderboard';

/** The current #1 on a Spotlight Card with a Shine Border, its Elo counting in on first view. */
export function LeaderCard({ model }: { model: LeaderboardEntry }) {
  return (
    <SpotlightCard
      data-testid="leader-card"
      spotlightColor="--human"
      className="relative flex h-full flex-col p-6 sm:p-8"
    >
      <ShineBorder borderWidth={1} duration={14} shineColor={['--human', '--mind-a']} />
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow text-human">#1 right now</span>
        <Trophy aria-hidden="true" className="size-5 text-human" strokeWidth={1.75} />
      </div>
      <h3 className="mt-6 text-h2 font-light [overflow-wrap:anywhere] text-fg sm:mt-8">
        {model.name}
      </h3>
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <ProviderBadge label={model.providerLabel} />
        {model.provisional ? <ProvisionalBadge /> : null}
      </p>
      <div aria-hidden="true" className="min-h-10 flex-1" />
      <dl className="grid grid-cols-3 gap-4 border-t border-line pt-6">
        <div className="min-w-0">
          <dt className="eyebrow text-muted">Elo</dt>
          <dd className="mt-2 text-h2 leading-none font-light text-fg tabular-nums">
            <CountUp to={Math.round(model.elo)} from={1000} duration={1.6} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-muted">Win rate</dt>
          <dd className="mt-2 text-h2 leading-none font-light text-fg tabular-nums">
            {formatPercent(model.winRate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-muted">Battles</dt>
          <dd className="mt-2 text-h2 leading-none font-light text-fg tabular-nums">
            {formatCount(model.battles)}
          </dd>
        </div>
      </dl>
    </SpotlightCard>
  );
}
