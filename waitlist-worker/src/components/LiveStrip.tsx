import { providerLabel, type ArenaStatsState } from '@/lib/arena-stats';
import CountUp from './reactbits/CountUp';

const ITEM = 'inline-flex items-center gap-2';

/**
 * One line of live Arena numbers under the signup form. Everything comes from the public API;
 * while it loads the line holds its height, and if it fails the line falls back to the
 * documented facts (docs.dualmindlab.tech) instead of inventing numbers.
 */
export function LiveStrip({ stats }: { stats: ArenaStatsState }) {
  if (stats.status === 'error') {
    return (
      <p className="eyebrow flex flex-wrap gap-x-5 gap-y-2 text-[10.5px] tracking-[0.2em]" data-testid="live-strip">
        <span>50+ models</span>
        <span>3 providers</span>
        <span>3 arena modes</span>
      </p>
    );
  }

  if (stats.status === 'loading') {
    return (
      <p className="eyebrow flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] tracking-[0.2em]" data-testid="live-strip">
        <span className={ITEM}>
          <span className="live-dot opacity-50" aria-hidden="true" />
          Reading the live leaderboard…
        </span>
      </p>
    );
  }

  const { models, providers } = stats.data;
  const leader = models[0];
  return (
    <p
      className="eyebrow flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] tracking-[0.2em]"
      data-testid="live-strip"
    >
      <span className={`${ITEM} text-fg-soft`}>
        <span className="live-dot" aria-hidden="true" />
        Live
      </span>
      <span className={ITEM}>
        <CountUp to={models.length} duration={1.4} className="tabular-nums text-fg" /> models
      </span>
      <span className={ITEM}>
        <CountUp to={providers.length} duration={1} className="tabular-nums text-fg" /> providers
      </span>
      <span className="basis-full normal-case tracking-[0.04em] sm:basis-auto">
        <span className="mr-2 uppercase tracking-[0.2em]">#1</span>
        <span className="text-fg [overflow-wrap:anywhere]">{leader.name}</span>
        <span className="text-muted">
          {' '}
          · {Math.round(leader.elo)} ELO · {providerLabel(leader.provider)}
        </span>
      </span>
    </p>
  );
}
