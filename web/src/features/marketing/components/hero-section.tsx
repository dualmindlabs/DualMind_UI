import { ArrowRight } from 'lucide-react';

import { BlurText } from '@/components/vendor/reactbits/blur-text';

import { HERO, LEADERBOARD_HREF } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { HeroBackdrop } from './hero-backdrop';
import { HeroComposer } from './hero-composer';
import { LiveDot } from './live-dot';
import { LiveStrip } from './live-strip';

interface HeroSectionProps {
  onAsk: (prompt: string) => void;
  stats: LiveStatsState;
}

/**
 * The landing page's one signature moment (design-direction.md section 6, rule 1): two beams of
 * light, the first headline line painted at once (it is the LCP element), the Playfair line resolving out of
 * a blur, then the composer. Everything is in the prerendered HTML: the entrance is CSS, so it
 * plays and stays readable without JavaScript.
 */
export function HeroSection({ onAsk, stats }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-bg-deep">
      <HeroBackdrop />
      <div className="mx-auto flex min-h-[min(46rem,calc(100svh-9rem))] max-w-page flex-col items-center justify-center px-4 pt-28 pb-14 text-center sm:px-6 md:pt-36 md:pb-20">
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

        <h1 id="hero-title" className="mt-8 text-display text-fg sm:mt-10">
          <BlurText as="span" className="block" text={HERO.headline} instant />
          <BlurText
            as="span"
            className="block pb-[0.08em]"
            text={[{ text: HERO.human, className: 'human-voice text-human' }]}
            delay={120}
            startDelay={150}
            blur={10}
          />
        </h1>

        <p className="mt-7 max-w-[36rem] animate-rise text-h3 font-normal text-fg-soft [animation-delay:620ms] sm:mt-8">
          {HERO.subhead}
        </p>

        <HeroComposer
          onAsk={onAsk}
          className="mt-9 animate-rise [animation-delay:760ms] sm:mt-11"
        />
      </div>
      <LiveStrip stats={stats} />
    </section>
  );
}
