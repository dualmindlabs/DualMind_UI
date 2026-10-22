import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { ModelMark } from '@/components/ui/model-mark';
import { CountUp } from '@/components/vendor/reactbits/count-up';
import { formatElo } from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

import { LEADERBOARD_HREF } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { LiveDot } from './live-dot';
import { LiveStat } from './live-stat';

const numberClass = 'numeric text-[1.625rem] leading-none text-fg sm:text-stat';
const pendingClass = 'block h-8 w-20 max-w-full animate-pulse rounded-sm bg-surface-3 sm:h-11';

/**
 * Live numbers docked under the hero, from the public leaderboard: battles, votes, models and the
 * current #1, on one lit panel. Loading, ready and failed states share one frame, so nothing
 * shifts when the data arrives. If the request fails, the strip says so and links to the
 * leaderboard; it never shows a number that did not come from the API.
 */
export function LiveStrip({ stats }: { stats: LiveStatsState }) {
  const ready = stats.status === 'ready' ? stats.stats : null;
  const failed = stats.status === 'error';
  const leader = ready?.top[0];

  const value = (render: (data: NonNullable<typeof ready>) => ReactNode, width?: string) => {
    if (ready) return render(ready);
    if (failed) {
      return (
        <span className="numeric text-[1.625rem] leading-none text-muted sm:text-stat">
          <span aria-hidden="true">—</span>
          <span className="sr-only">Unavailable</span>
        </span>
      );
    }
    return <span className={cn(pendingClass, width)} />;
  };

  return (
    <div
      data-testid="live-strip"
      data-state={stats.status}
      className="mx-auto max-w-page px-4 pb-14 sm:px-6 md:pb-20"
    >
      <h2 className="sr-only">Live numbers from the public leaderboard</h2>
      <div className="overflow-hidden surface-float">
        <dl
          aria-busy={stats.status === 'loading' ? true : undefined}
          className="grid grid-cols-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.7fr)]"
        >
          <LiveStat label="Battles" className="border-r border-line">
            {value(data => (
              <CountUp to={data.battles} separator="," duration={1.6} className={numberClass} />
            ))}
          </LiveStat>
          <LiveStat label="Votes" className="border-r border-line">
            {value(data => (
              <CountUp to={data.votes} separator="," duration={1.6} className={numberClass} />
            ))}
          </LiveStat>
          <LiveStat label="Models" className="md:border-r md:border-line">
            {value(data => (
              <CountUp to={data.models} duration={1.2} className={numberClass} />
            ))}
          </LiveStat>
          <LiveStat
            label="#1 right now"
            className="col-span-3 border-t border-line bg-surface/60 md:col-span-1 md:border-t-0"
          >
            {value(
              () =>
                leader ? (
                  <span className="flex min-w-0 items-center gap-3">
                    <ModelMark name={leader.name} who="human" size="md" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-body leading-tight font-semibold text-fg">
                        {leader.name}
                      </span>
                      <span className="numeric text-caption text-muted">
                        {formatElo(leader.elo)} Elo · {leader.providerLabel}
                      </span>
                    </span>
                  </span>
                ) : null,
              'w-56',
            )}
          </LiveStat>
        </dl>
        <p
          className={cn(
            'flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-line bg-bg-deep/60 px-4 py-2.5 font-mono text-caption sm:px-6',
            failed ? 'text-fg-soft' : 'text-muted',
          )}
        >
          <span className="inline-flex items-center gap-2.5">
            <LiveDot tone={ready ? 'live' : failed ? 'off' : 'idle'} />
            {ready ? 'Live from the public leaderboard' : null}
            {stats.status === 'loading' ? 'Reading the public leaderboard' : null}
            {failed ? 'Live numbers are unavailable right now.' : null}
          </span>
          {ready ? <span className="hidden sm:inline">· {ready.providers.join(', ')}</span> : null}
          {failed ? (
            <a
              href={LEADERBOARD_HREF}
              className="inline-flex items-center gap-1 text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
            >
              See the leaderboard
              <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
            </a>
          ) : null}
        </p>
      </div>
    </div>
  );
}
