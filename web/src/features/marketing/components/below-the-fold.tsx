import { useEffect, useRef } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

import { useDemoBattle } from '../hooks/use-demo-battle';
import { type LiveStatsState, useLiveStats } from '../hooks/use-live-stats';
import { onDemoRequest, takeDemoRequest } from '../lib/demo-request';
import { BattleSection } from './battle-section';
import { ClosingCta } from './closing-cta';
import { FeaturesSection } from './features-section';
import { LeaderboardPreview } from './leaderboard-preview';
import { ModelStrip } from './model-strip';
import { StepsSection } from './steps-section';

const LOADING: LiveStatsState = { status: 'loading' };

/**
 * The landing sections under the hero: one lazy chunk (see landing-page.tsx). It takes no props
 * and reads everything itself, so the page above can re-render without touching it: a Suspense
 * boundary whose props change before it has hydrated is client-rendered, which throws its
 * prerendered HTML away.
 */
export function BelowTheFold() {
  const hydrated = useHydrated();
  const live = useLiveStats();
  // Hydration must match the prerendered HTML, which shows the loading state.
  const stats = hydrated ? live : LOADING;
  const demoRef = useRef<HTMLDivElement>(null);
  const demo = useDemoBattle(demoRef);
  const reduce = useShouldReduceMotion();
  const latest = useRef({ demo, reduce });

  useEffect(() => {
    latest.current = { demo, reduce };
  });

  // A prompt from the hero: a recorded battle plays here (the matching one when the prompt is a
  // demo prompt), and focus follows the scroll so keyboard and screen reader users land here too.
  useEffect(() => {
    const play = () => {
      const request = takeDemoRequest();
      if (!request) return;
      const { demo: controls, reduce: reduced } = latest.current;
      controls.play(request.index === undefined ? { asked: request.asked } : request);
      const target = demoRef.current;
      if (!target) return;
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    };
    play();
    return onDemoRequest(play);
  }, []);

  return (
    <>
      <ModelStrip stats={stats} />
      <BattleSection demo={demo} demoRef={demoRef} />
      <FeaturesSection />
      <StepsSection />
      <LeaderboardPreview stats={stats} />
      <ClosingCta />
    </>
  );
}
