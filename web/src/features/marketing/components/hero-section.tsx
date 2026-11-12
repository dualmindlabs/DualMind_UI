import { ArrowRight } from 'lucide-react';

import { HERO, LEADERBOARD_HREF } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { DuelPreview } from './duel-preview';
import { HeroBackdrop } from './hero-backdrop';
import { HeroComposer } from './hero-composer';
import { LiveDot } from './live-dot';
import { LiveStrip } from './live-strip';

interface HeroSectionProps {
  onAsk: (prompt: string) => void;
  stats: LiveStatsState;
}

const lineClass = 'block animate-rise';

/**
 * The landing page's first screen: the promise in three heavy lines, the composer, and next to
 * them a live duel (the product, not a picture of an idea), with the live numbers docked under
 * both. Everything is in the prerendered HTML: the headline enters with a CSS animation, so it
 * plays and stays readable without JavaScript.
 */
export function HeroSection({ onAsk, stats }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip">
      <HeroBackdrop />
      <div className="mx-auto grid max-w-page grid-cols-1 items-center gap-14 px-4 pt-28 pb-12 sm:px-6 md:pt-36 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-10 lg:pb-16 xl:gap-16">
        <div className="flex min-w-0 flex-col items-start">
          <a
            href={LEADERBOARD_HREF}
            className="group inline-flex animate-rise items-center gap-2.5 rounded-full border border-line bg-glass py-1.5 pr-3 pl-3.5 text-caption whitespace-nowrap text-fg-soft shadow-raise transition-[border-color,color] duration-(--dur-fast) ease-out-expo hover:border-line-strong hover:text-fg"
          >
            <LiveDot />
            <span className="eyebrow text-fg">{HERO.eyebrow}</span>
            <span aria-hidden="true" className="h-3.5 w-px bg-line-strong" />
            <span className="sm:hidden">{HERO.eyebrowShort}</span>
            <span className="hidden sm:inline">{HERO.eyebrowDetail}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 transition-transform duration-(--dur-fast) ease-out-expo group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </a>

          <h1
            id="hero-title"
            className="mt-7 font-display text-[length:clamp(3rem,1.5rem+4.7vw,5.75rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-fg"
          >
            <span data-hero-line="" className={lineClass}>
              Two models.
            </span>{' '}
            <span data-hero-line="" className={lineClass} style={{ animationDelay: '90ms' }}>
              One prompt.
            </span>{' '}
            <span
              data-hero-line=""
              className={`${lineClass} pb-[0.06em] text-human`}
              style={{ animationDelay: '180ms' }}
            >
              <span className="human-voice">You decide.</span>
            </span>
          </h1>

          <p className="mt-6 max-w-[34rem] animate-rise text-lead text-fg-soft [animation-delay:300ms]">
            {HERO.subhead}
          </p>

          <HeroComposer
            onAsk={onAsk}
            className="mt-8 animate-rise [animation-delay:420ms] sm:mt-9"
          />
        </div>

        <DuelPreview className="min-w-0 animate-rise [animation-delay:520ms] lg:justify-self-end" />
      </div>
      <LiveStrip stats={stats} />
    </section>
  );
}
