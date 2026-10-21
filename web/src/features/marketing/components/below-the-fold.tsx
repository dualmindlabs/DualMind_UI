import type { RefObject } from 'react';

import type { DemoBattleControls } from '../hooks/use-demo-battle';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { BattleSection } from './battle-section';
import { ClosingCta } from './closing-cta';
import { FeaturesSection } from './features-section';
import { LeaderboardPreview } from './leaderboard-preview';
import { ModelStrip } from './model-strip';
import { StepsSection } from './steps-section';

interface BelowTheFoldProps {
  stats: LiveStatsState;
  demo: DemoBattleControls;
  demoRef: RefObject<HTMLDivElement | null>;
}

/** The landing sections under the hero: one lazy chunk (see landing-page.tsx). */
export function BelowTheFold({ stats, demo, demoRef }: BelowTheFoldProps) {
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
