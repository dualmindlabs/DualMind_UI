import { lazy, type ReactNode, Suspense, use, useCallback, useEffect, useRef, useState } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { useHydrated } from '@/hooks/use-hydrated';
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

// The sections stay prerendered HTML (dehydrated) until the visitor gets near them or interacts:
// their code and their hydration cost nothing while the hero is the only thing on screen. The
// gate is a promise the boundary waits on; it only exists in the browser, for the first render of
// a page that was prerendered (a client-side visit renders the sections at once).
let openGate: () => void = () => undefined;
const gate: Promise<void> | null =
  typeof window === 'undefined' ? null : new Promise<void>(resolve => (openGate = resolve));

function releaseBelowTheFold(): void {
  void import('./below-the-fold');
  openGate();
}

function WaitForGate({ gated, children }: { gated: boolean; children: ReactNode }) {
  if (gated && gate) use(gate);
  return children;
}

/** Events that mean someone is using the page: the sections are needed now. */
const WAKE_EVENTS = [
  'pointerdown',
  'keydown',
  'focusin',
  'touchstart',
  'wheel',
  'scroll',
  'hashchange',
];

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
  // Gated when this first render is the hydration of the prerendered page.
  const hydrated = useHydrated();
  const [gated] = useState(!hydrated);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollWhenReady = useRef(false);

  useEffect(() => {
    if (!gated) return undefined;
    if (window.location.hash) releaseBelowTheFold();
    const wake = () => releaseBelowTheFold();
    for (const name of WAKE_EVENTS) window.addEventListener(name, wake, { passive: true });
    const sentinel = sentinelRef.current;
    const observer =
      sentinel && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            entries => {
              if (entries.some(entry => entry.isIntersecting)) releaseBelowTheFold();
            },
            { rootMargin: '0px' },
          )
        : null;
    if (sentinel && observer) observer.observe(sentinel);
    else releaseBelowTheFold();
    return () => {
      for (const name of WAKE_EVENTS) window.removeEventListener(name, wake);
      observer?.disconnect();
    };
  }, [gated]);

  // A prompt from the hero: a recorded battle plays below (the matching one when the prompt is a
  // demo prompt), and focus follows the scroll so keyboard and screen reader users land there too.
  const ask = (prompt: string) => {
    const index = findBattleIndex(prompt);
    demo.play(index === null ? { asked: prompt } : { index, asked: null });
    scrollToDemo();
  };

  function scrollToDemo() {
    const target = demoRef.current;
    if (!target || !belowReady) {
      // The sections are still prerendered HTML: wake them, and scroll once they are live.
      scrollWhenReady.current = true;
      releaseBelowTheFold();
      return;
    }
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!belowReady || !scrollWhenReady.current) return;
    scrollWhenReady.current = false;
    const target = demoRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }, [belowReady, reduce]);

  return (
    <>
      <SkipLink />
      <SiteHeader variant="marketing" overlay />
      <main id="main" tabIndex={-1} className="outline-none">
        <HeroSection onAsk={ask} stats={stats} />
        <div ref={sentinelRef} aria-hidden="true" />
        <Suspense fallback={null}>
          <WaitForGate gated={gated}>
            <BelowTheFold
              stats={belowReady ? stats : LOADING}
              demo={demo}
              demoRef={demoRef}
              onHydrated={markBelowReady}
            />
          </WaitForGate>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
