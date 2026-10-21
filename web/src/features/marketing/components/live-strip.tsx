import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatElo } from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

import { LEADERBOARD_HREF } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { LiveCount } from './live-count';
import { LiveDot } from './live-dot';
import { LiveStat } from './live-stat';

const numberClass = 'text-h2 leading-none font-light tracking-[-0.02em] text-fg tabular-nums';
const pendingClass = 'block h-8 w-24 max-w-full animate-pulse rounded-sm bg-surface-2';

/**
 * Live numbers under the hero, from the public leaderboard: battles, votes, models and the current
 * #1. Loading, ready and failed states share one frame, so nothing shifts when the data arrives.
 * If the request fails, the strip says so and links to the leaderboard; it never shows a number
 * that did not come from the API.
 */
export function LiveStrip({ stats }: { stats: LiveStatsState }) {
  const ready = stats.status === 'ready' ? stats.stats : null;
  const failed = stats.status === 'error';
  const leader = ready?.ranked[0];

  const value = (render: (data: NonNullable<typeof ready>) => ReactNode, width?: string) => {
    if (ready) return render(ready);
    if (failed) {
      return (
        <span className="text-h2 leading-none font-light text-muted">
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
      className="border-t border-line bg-bg-deep"
    >
      <div className="mx-auto max-w-page">
        <h2 className="sr-only">Live numbers from the public leaderboard</h2>
        <dl
          aria-busy={stats.status === 'loading' ? true : undefined}
          className="grid grid-cols-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.7fr)]"
        >
          <LiveStat label="Battles" className="border-r border-line">
            {value(data => (
              <LiveCount to={data.battles} separator="," duration={1.6} className={numberClass} />
            ))}
          </LiveStat>
          <LiveStat label="Votes" className="border-r border-line">
            {value(data => (
              <LiveCount to={data.votes} separator="," duration={1.6} className={numberClass} />
            ))}
          </LiveStat>
          <LiveStat label="Models" className="md:border-r md:border-line">
            {value(data => (
              <LiveCount to={data.models} duration={1.2} className={numberClass} />
            ))}
          </LiveStat>
          <LiveStat
            label="#1 right now"
            className="col-span-3 border-t border-line md:col-span-1 md:border-t-0"
          >
            {value(
              () =>
                leader ? (
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-body leading-tight font-medium text-fg">
                      {leader.name}
                    </span>
                    <span className="font-mono text-caption text-muted tabular-nums">
                      {formatElo(leader.elo)} Elo · {leader.providerLabel}
                    </span>
                  </span>
                ) : null,
              'w-56',
            )}
          </LiveStat>
        </dl>
      </div>
      <div className="border-t border-line">
        <p
          className={cn(
            'mx-auto flex min-h-11 max-w-page flex-wrap items-center gap-x-2.5 gap-y-1 px-4 py-2.5 font-mono text-caption sm:px-6',
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
              Open the leaderboard
              <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
            </a>
          ) : null}
        </p>
      </div>
    </div>
  );
}
