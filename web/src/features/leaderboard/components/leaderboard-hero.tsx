import { ArrowRight, Swords } from 'lucide-react';

import { PageContainer } from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

import { ARENA_HREF, PROVISIONAL_BATTLES, RATINGS_HELP_HREF } from '../lib/constants';
import type { LeaderboardSummary } from '../types';
import { StatsStrip } from './stats-strip';

export interface LeaderboardHeroProps {
  summary: LeaderboardSummary | undefined;
  updatedAt: number;
  refreshing: boolean;
  stale: boolean;
}

/**
 * The page header: the title with its one human-voice phrase, what the board measures, the two
 * next steps, and the live stats strip, on the duel mesh with a fading grid. Everything but the
 * numbers is in the prerendered HTML.
 */
export function LeaderboardHero({ summary, updatedAt, refreshing, stale }: LeaderboardHeroProps) {
  return (
    <header className="grain relative isolate overflow-hidden border-b border-line mesh-duel">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-70" />
      <PageContainer className="grid gap-12 pt-14 pb-12 md:pt-24 md:pb-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
        <div className="grid max-w-3xl gap-7">
          <p className="kicker">Leaderboard · Elo from blind votes</p>
          <h1 className="max-w-[14ch] text-h1 text-fg">
            Every model, ranked by <span className="human-voice text-human">blind votes.</span>
          </h1>
          <p className="max-w-[52ch] text-lead text-fg-soft">
            Two anonymous models answer the same prompt. People vote for the better answer before
            they see any names, and each vote moves an Elo rating. Models with fewer than{' '}
            {PROVISIONAL_BATTLES} battles are listed as not yet rated, without a rank.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={ARENA_HREF} className={cn(buttonVariants({ variant: 'primary' }), 'press')}>
              <Swords aria-hidden="true" strokeWidth={1.75} />
              Start a battle
            </a>
            <a href={RATINGS_HELP_HREF} className={cn(buttonVariants({ variant: 'link' }))}>
              How ratings work
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </a>
          </div>
        </div>
        <StatsStrip summary={summary} updatedAt={updatedAt} refreshing={refreshing} stale={stale} />
      </PageContainer>
    </header>
  );
}
