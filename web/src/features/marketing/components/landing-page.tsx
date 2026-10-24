import { useRef } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

import { useDemoBattle } from '../hooks/use-demo-battle';
import { useLiveStats } from '../hooks/use-live-stats';
import { findBattleIndex } from '../lib/demo-machine';
import { BattleSection } from './battle-section';
import { ClosingCta } from './closing-cta';
import { FeaturesSection } from './features-section';
import { HeroSection } from './hero-section';
import { LeaderboardPreview } from './leaderboard-preview';
import { ModelStrip } from './model-strip';
import { StepsSection } from './steps-section';

/**
 * The landing page (`/` for signed-out visitors): hero with the composer, a live duel and the live
 * numbers, the model strip, the playable recorded battle, the four steps with product visuals,
 * why blind battles, the live top five and the closing call to action. One live leaderboard
 * request feeds every number.
 */
export function LandingPage() {
  const stats = useLiveStats();
  const demoRef = useRef<HTMLDivElement>(null);
  const demo = useDemoBattle(demoRef);
  const reduce = useShouldReduceMotion();

  // A prompt from the hero: a recorded battle plays below (the matching one when the prompt is a
  // demo prompt), and focus follows the scroll so keyboard and screen reader users land there too.
  const ask = (prompt: string) => {
    const index = findBattleIndex(prompt);
    demo.play(index === null ? { asked: prompt } : { index, asked: null });
    const target = demoRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  };

  return (
    <>
      <SkipLink />
      <SiteHeader variant="marketing" overlay />
      <main id="main" tabIndex={-1} className="outline-none">
        <HeroSection onAsk={ask} stats={stats} />
        <ModelStrip stats={stats} />
        <BattleSection demo={demo} demoRef={demoRef} />
        <StepsSection stats={stats} />
        <FeaturesSection stats={stats} />
        <LeaderboardPreview stats={stats} />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
