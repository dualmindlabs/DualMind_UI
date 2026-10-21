import { lazy, Suspense, useCallback, useRef, useState } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

import { useDemoBattle } from '../hooks/use-demo-battle';
import { type LiveStatsState, useLiveStats } from '../hooks/use-live-stats';
import { findBattleIndex } from '../lib/demo-machine';
import { HeroSection } from './hero-section';

// Everything below the hero is its own chunk: the browser paints and hydrates the hero first, and
// the prerendered sections stay in the HTML (the Suspense boundary keeps them until the chunk is
// ready). The chunk is a dynamic import, so it is not modulepreloaded in the document head.
const BelowTheFold = lazy(() =>
  import('./below-the-fold').then(module => ({ default: module.BelowTheFold })),
);

const LOADING: LiveStatsState = { status: 'loading' };

/**
 * The landing page (`/` for signed-out visitors): hero with the composer and live numbers, the
 * model strip, how a battle works with the recorded demo, why blind battles, the four steps, the
 * live top five and the closing call to action. One live leaderboard request feeds every number.
 */
export function LandingPage() {
  const stats = useLiveStats();
  const demoRef = useRef<HTMLDivElement>(null);
  // The lazy sections hydrate after the hero, possibly after the live numbers arrived. Until they
  // have hydrated they get the prerendered state (loading, demo waiting), so they match their HTML.
  const [belowReady, setBelowReady] = useState(false);
  const markBelowReady = useCallback(() => setBelowReady(true), []);
  const demo = useDemoBattle(demoRef, belowReady);
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
        <Suspense fallback={null}>
          <BelowTheFold
            stats={belowReady ? stats : LOADING}
            demo={demo}
            demoRef={demoRef}
            onHydrated={markBelowReady}
          />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
