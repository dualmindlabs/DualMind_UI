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
 * next steps, and the live stats strip. Everything but the numbers is in the prerendered HTML.
 */
export function LeaderboardHero({ summary, updatedAt, refreshing, stale }: LeaderboardHeroProps) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line bg-bg-deep">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 dot-grid [mask-image:radial-gradient(ellipse_70%_80%_at_70%_0%,black,transparent)] opacity-60"
      />
      <PageContainer className="grid gap-10 pt-14 pb-12 md:pt-20 md:pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-14">
        <div className="grid max-w-3xl gap-6">
          <p className="flex items-center gap-3">
            <span className="eyebrow text-muted">Leaderboard</span>
            <span aria-hidden="true" className="h-px w-8 bg-line-strong" />
            <span className="eyebrow text-muted">Elo from blind votes</span>
          </p>
          <h1 className="text-h1 font-medium text-fg">
            Every model, ranked by <span className="human-voice text-human">blind votes.</span>
          </h1>
          <p className="max-w-reading text-body text-fg-soft">
            Two anonymous models answer the same prompt. People vote for the better answer before
            they see any names, and each vote moves an Elo rating. Models with fewer than{' '}
            {PROVISIONAL_BATTLES} battles are marked provisional.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={ARENA_HREF} className={cn(buttonVariants({ variant: 'primary' }))}>
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
