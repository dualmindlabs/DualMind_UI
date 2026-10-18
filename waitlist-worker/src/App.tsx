import { useEffect, useState } from 'react';
import { useArenaStats } from '@/lib/arena-stats';
import { readRef } from '@/lib/ref';
import { BattleDemo } from './components/BattleDemo';
import { ClosingCta } from './components/ClosingCta';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Leaderboard } from './components/Leaderboard';
import { ModelMarquee } from './components/ModelMarquee';
import { Nav } from './components/Nav';
import { ValuePoints } from './components/ValuePoints';

export default function App() {
  const stats = useArenaStats();
  // Read after hydration, so the prerendered HTML (which has no query string) always matches.
  const [refCode, setRefCode] = useState<string | null>(null);
  useEffect(() => setRefCode(readRef(window.location.search)), []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-elevated focus:px-4 focus:py-2 focus:text-sm focus:text-fg"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero refCode={refCode} stats={stats} />
        <ModelMarquee stats={stats} />
        <ValuePoints />
        <BattleDemo />
        <Leaderboard stats={stats} />
        <ClosingCta />
      </main>
      <Footer />
      <div aria-hidden="true" className="grain pointer-events-none fixed inset-0 z-40" />
    </>
  );
}
