import { ArrowRight, Swords } from 'lucide-react';

import { PageContainer } from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import { StatTile } from '@/components/ui/stat-tile';
import {
  ARENA_HREF,
  formatCount,
  formatElo,
  type LeaderboardSummary,
  PROVISIONAL_BATTLES,
} from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

const DASH = '–';

/**
 * The directory's masthead: the page title, a short explanation (including the not-yet-rated rule
 * and the compare hint), the two calls to action, and four live numbers from the board.
 */
export function ModelsHero({ summary }: { summary: LeaderboardSummary | undefined }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line mesh-duel">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_75%_90%_at_50%_0%,black,transparent)] opacity-70"
      />
      <PageContainer className="grid max-w-page gap-10 pt-14 pb-12 md:pt-20 md:pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
        <div className="grid gap-7">
          <SectionTitle
            level="h1"
            kicker="Models · live from the Arena"
            title="Every model in"
            accent="the Arena."
            className="[&_h1]:max-w-[14ch]"
          />
          <p className="max-w-[56ch] text-lead text-fg-soft">
            Every model that answers blind battles, with its current Elo, win rate and number of
            battles. Models with fewer than {PROVISIONAL_BATTLES} battles are marked not yet rated
            and have no rank. Pin any two with Compare to see how a matchup should go.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={ARENA_HREF} className={cn(buttonVariants({ variant: 'primary' }))}>
              <Swords aria-hidden="true" strokeWidth={1.75} />
              Start a battle
            </a>
            <a href="/leaderboard/" className={cn(buttonVariants({ variant: 'link' }))}>
              See the leaderboard
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatTile
            tone="a"
            label="Models"
            value={summary ? formatCount(summary.models) : DASH}
            hint={summary ? `${formatCount(summary.rated)} rated` : undefined}
          />
          <StatTile
            label="Makers"
            value={summary ? formatCount(summary.providers) : DASH}
            hint="Different labs"
          />
          <StatTile
            label="Battles judged"
            value={summary ? formatCount(summary.battles) : DASH}
            hint="Blind, by people"
          />
          <StatTile
            tone="b"
            label="Top Elo"
            value={summary ? formatElo(summary.topElo) : DASH}
            hint={summary ? `Lowest ${formatElo(summary.bottomElo)}` : undefined}
          />
        </div>
      </PageContainer>
    </header>
  );
}
