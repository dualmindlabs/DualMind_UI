import { Trophy } from 'lucide-react';

import { ModelMark } from '@/components/ui/model-mark';
import { CountUp } from '@/components/vendor/reactbits/count-up';
import { formatCount, formatPercent, ProviderBadge, type RatedEntry } from '@/features/leaderboard';

/**
 * The current #1, staged: a lit card with the human colour's glow, the model's mark and name large,
 * and its Elo as the one huge number, counting in on first view. Win rate and battles sit under it.
 */
export function LeaderCard({ model }: { model: RatedEntry }) {
  return (
    <div
      data-testid="leader-card"
      className="relative flex h-full flex-col overflow-hidden surface-float p-6 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_0%,color-mix(in_oklab,var(--human)_16%,transparent),transparent_70%),radial-gradient(50%_40%_at_0%_100%,color-mix(in_oklab,var(--mind-a)_12%,transparent),transparent_70%)]"
      />
      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-human/50 bg-human-tint px-3 py-1 eyebrow text-human">
          <Trophy aria-hidden="true" className="size-3.5" strokeWidth={2} />
          #1 right now
        </span>
      </div>
      <div className="relative mt-8 flex items-center gap-4">
        <ModelMark name={model.name} who="human" size="lg" />
        <div className="min-w-0">
          <h3 className="text-h2 [overflow-wrap:anywhere] text-fg">{model.name}</h3>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <ProviderBadge label={model.providerLabel} via={model.servedBy} />
          </p>
        </div>
      </div>
      <div className="relative mt-10 flex-1">
        <p className="eyebrow text-muted">Elo rating</p>
        <p className="mt-2 numeric text-[length:clamp(4rem,2.4rem+7vw,7.5rem)] leading-none text-fg">
          <CountUp to={Math.round(model.elo)} from={1000} duration={1.6} />
        </p>
      </div>
      <dl className="relative mt-8 grid grid-cols-2 gap-4 border-t border-line pt-6">
        <div className="min-w-0">
          <dt className="eyebrow text-muted">Win rate</dt>
          <dd className="mt-2 numeric text-h3 text-fg">{formatPercent(model.winRate)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-muted">Battles</dt>
          <dd className="mt-2 numeric text-h3 text-fg">{formatCount(model.battles)}</dd>
        </div>
      </dl>
    </div>
  );
}
