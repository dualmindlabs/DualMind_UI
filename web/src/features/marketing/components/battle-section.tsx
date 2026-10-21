import type { RefObject } from 'react';

import type { DemoBattleControls } from '../hooks/use-demo-battle';
import { BattleBeams } from './battle-beams';
import { DemoBattle } from './demo-battle';
import { SectionHeading } from './section-heading';

interface BattleSectionProps {
  demo: DemoBattleControls;
  demoRef: RefObject<HTMLDivElement | null>;
}

/** 01, how a battle works: the beam diagram explains it in five seconds, the demo lets you try it. */
export function BattleSection({ demo, demoRef }: BattleSectionProps) {
  return (
    <section id="how" aria-labelledby="how-title" className="overflow-x-clip py-20 md:py-28">
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <SectionHeading
            id="how-title"
            index="01"
            eyebrow="How a battle works"
            title={
              <>
                One prompt, two answers.{' '}
                <span className="human-voice text-human">Your verdict.</span>
              </>
            }
            lead="Your prompt goes to two anonymous models at once. You read both answers side by side, pick the better one, and only then see who wrote what."
          />
          <BattleBeams
            run={demo.state.run}
            phase={demo.state.phase}
            className="mx-auto max-w-md lg:mr-0"
          />
        </div>
        <div className="mt-12 md:mt-16">
          <DemoBattle demo={demo} rootRef={demoRef} />
        </div>
      </div>
    </section>
  );
}
