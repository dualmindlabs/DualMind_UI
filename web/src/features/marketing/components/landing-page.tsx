import { lazy, memo, type ReactNode, Suspense, use, useEffect, useState } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { useHydrated } from '@/hooks/use-hydrated';

import { useLiveStats } from '../hooks/use-live-stats';
import { findBattleIndex } from '../lib/demo-machine';
import { requestDemo } from '../lib/demo-request';
import { HeroSection } from './hero-section';

// Everything below the hero is its own chunk: the browser paints and hydrates the hero first, and
// the prerendered sections stay in the HTML (the Suspense boundary keeps them until the chunk is
// ready). The chunk is a dynamic import, so it is not modulepreloaded in the document head.
const BelowTheFold = lazy(() =>
  import('./below-the-fold').then(module => ({ default: module.BelowTheFold })),
);

// The sections stay prerendered HTML (dehydrated) until the visitor scrolls or interacts: their
// code and their hydration cost nothing while the hero is the only thing on screen. The gate is a
// promise the boundary waits on; it only exists in the browser, and only applies to the first
// render of a prerendered page (a client-side visit renders the sections at once).
let openGate: () => void = () => undefined;
const gate: Promise<void> | null =
  typeof window === 'undefined' ? null : new Promise<void>(resolve => (openGate = resolve));

function wakeBelowTheFold(): void {
  void import('./below-the-fold');
  openGate();
}

function WaitForGate({ gated, children }: { gated: boolean; children: ReactNode }) {
  if (gated && gate) use(gate);
  return children;
}

/**
 * The boundary lives in its own memoized component: React client-renders (and so discards the
 * prerendered HTML of) a Suspense boundary that gets new props before it has hydrated, and the
 * page re-renders whenever the live numbers arrive.
 */
const BelowTheFoldSlot = memo(function BelowTheFoldSlot({ gated }: { gated: boolean }) {
  return (
    <Suspense fallback={null}>
      <WaitForGate gated={gated}>
        <BelowTheFold />
      </WaitForGate>
    </Suspense>
  );
});

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

/**
 * The landing page (`/` for signed-out visitors): hero with the composer and live numbers, the
 * model strip, how a battle works with the recorded demo, why blind battles, the four steps, the
 * live top five and the closing call to action. One live leaderboard request feeds every number.
 */
export function LandingPage() {
  const stats = useLiveStats();
  const hydrated = useHydrated();
  // Gated when this first render is the hydration of the prerendered page.
  const [gated] = useState(!hydrated);

  useEffect(() => {
    if (!gated) return undefined;
    if (window.location.hash) wakeBelowTheFold();
    for (const name of WAKE_EVENTS) window.addEventListener(name, wakeBelowTheFold, { passive: true });
    return () => {
      for (const name of WAKE_EVENTS) window.removeEventListener(name, wakeBelowTheFold);
    };
  }, [gated]);

  // A prompt from the hero: a recorded battle plays below (the matching one when the prompt is a
  // demo prompt); the sections wake up if they are still prerendered HTML.
  const ask = (prompt: string) => {
    const index = findBattleIndex(prompt);
    requestDemo(index === null ? { asked: prompt } : { index, asked: null });
    wakeBelowTheFold();
  };

  return (
    <>
      <SkipLink />
      <SiteHeader variant="marketing" overlay />
      <main id="main" tabIndex={-1} className="outline-none">
        <HeroSection onAsk={ask} stats={stats} />
        <BelowTheFoldSlot gated={gated} />
      </main>
      <SiteFooter />
    </>
  );
}
