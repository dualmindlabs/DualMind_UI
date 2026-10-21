import { howItWorksContent } from '../content';
import { BattleDiagram } from './battle-diagram';
import { InfoPage } from './info-page';
import { StepsTimeline } from './steps-timeline';

/**
 * /how-it-works/: the flow diagram under the intro, the four steps as a timeline, and the
 * rating explanation at `#ratings` (the leaderboard links to it).
 */
export function HowItWorksPage() {
  return (
    <InfoPage
      page={howItWorksContent}
      overrides={{ steps: StepsTimeline }}
      wideSections={['steps']}
      beforeSections={<BattleDiagram />}
    />
  );
}
