import { Timeline } from '@/components/vendor/aceternity/timeline';

import { STEPS } from '../content/landing';
import { SectionHeading } from './section-heading';
import { StepVisual } from './step-visual';

/**
 * 03, the four steps: Ask, Compare, Vote, Reveal on Aceternity's timeline, whose line fills as you
 * scroll (the full line, without scroll linking, under reduced motion).
 */
export function StepsSection() {
  const data = STEPS.map((step, index) => ({
    title: step.title,
    content: (
      <div>
        <p className="max-w-reading text-body text-fg-soft">{step.body}</p>
        <StepVisual step={index} />
      </div>
    ),
  }));

  return (
    <section
      aria-labelledby="steps-title"
      className="border-t border-line bg-bg-deep pt-20 md:pt-28"
    >
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <SectionHeading
          id="steps-title"
          index="03"
          eyebrow="The four steps"
          title={
            <>
              Ask. Compare. Vote. <span className="human-voice text-human">Reveal.</span>
            </>
          }
          lead="A battle takes four steps, and the order matters: the names stay hidden until your vote is in."
        />
      </div>
      <Timeline data={data} titleAs="h3" className="mt-4 px-4 sm:px-6 md:mt-8" />
    </section>
  );
}
