import { ArrowRight } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils/cn';

import { LEADERBOARD_HREF } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { LeaderCard } from './leader-card';
import { LeaderboardRow } from './leaderboard-row';

const PREVIEW_SIZE = 5;

/**
 * Social proof: the top five rated models right now (models not yet rated are left out, as on the
 * leaderboard), live from the public leaderboard. #1 is staged on its own card with a huge Elo,
 * ranks 2 to 5 sit next to it. Loading keeps the layout; a failure says so and links to the
 * leaderboard page (no numbers that did not come from the API).
 */
export function LeaderboardPreview({ stats }: { stats: LiveStatsState }) {
  const top = stats.status === 'ready' ? stats.stats.top.slice(0, PREVIEW_SIZE) : [];
  const [leader, ...rest] = top;

  return (
    <section
      aria-labelledby="top-title"
      className="relative border-t border-line bg-bg-deep py-20 md:py-28"
    >
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionTitle
            id="top-title"
            kicker="Leaderboard"
            title="The standings,"
            accent="live."
            lead="The top five right now, read from the same public leaderboard every vote updates."
          />
          <a
            href={LEADERBOARD_HREF}
            className={cn(buttonVariants({ variant: 'outline' }), 'w-fit shrink-0 rounded-full')}
          >
            See the full leaderboard
            <ArrowRight aria-hidden="true" strokeWidth={2} />
          </a>
        </div>

        <div
          data-testid="leaderboard-preview"
          data-state={stats.status}
          aria-busy={stats.status === 'loading' ? true : undefined}
          className="mt-12 grid gap-5 md:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
        >
          {leader ? (
            <>
              <LeaderCard model={leader} />
              <div className="surface-duel px-4 sm:px-6">
                <h3 className="sr-only">Ranks 2 to {rest.length + 1}</h3>
                <ol>
                  {rest.map(model => (
                    <LeaderboardRow key={model.id} model={model} />
                  ))}
                </ol>
              </div>
            </>
          ) : stats.status === 'ready' ? (
            <div className="surface-duel p-6 sm:p-8 lg:col-span-2">
              <p className="text-h3 font-semibold text-fg">No model is rated yet.</p>
              <p className="mt-2 text-ui text-fg-soft">
                A model gets a rank once it has enough battles. Open the leaderboard to see how the
                models are doing so far.
              </p>
            </div>
          ) : stats.status === 'error' ? (
            <div className="surface-duel p-6 sm:p-8 lg:col-span-2">
              <p className="text-h3 font-semibold text-fg">
                The live leaderboard is not answering right now.
              </p>
              <p className="mt-2 text-ui text-fg-soft">
                Nothing is shown here instead of real numbers. Open the leaderboard page to try
                again.
              </p>
            </div>
          ) : (
            <>
              <div className="surface-duel min-h-80 animate-pulse" />
              <div className="surface-duel min-h-80 animate-pulse" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
