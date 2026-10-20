import { easings, spring } from '@/styles/tokens';

import { DurationBars } from './duration-bars';
import { EasingCurve } from './easing-curve';
import { Section } from './section';

const rules = [
  'One signature moment per screen: the hero entrance, the reveal, the leaderboard count-in.',
  'Animate only transform, opacity and filter.',
  'Reduced motion is live: movement becomes a cross-fade or nothing.',
];

export function MotionSection() {
  return (
    <Section
      id="motion"
      title={
        <>
          Motion that explains,{' '}
          <span className="human-voice text-human">then gets out of the way.</span>
        </>
      }
      lead={
        <p>
          Motion shows what is happening: sending, generating, revealing, ranking. It is never there
          to look busy, and every effect has a reduced-motion version.
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <DurationBars />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {easings.map(easing => (
            <EasingCurve key={easing.name} easing={easing} />
          ))}
          <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <h3 className="text-ui font-semibold text-fg">Spring</h3>
            <p className="mt-1 font-code text-caption text-muted">
              stiffness {spring.stiffness}, damping {spring.damping}
            </p>
            <p className="mt-2 text-ui-sm text-fg-soft">
              Layout changes and the mode switch indicator.
            </p>
          </div>
        </div>
      </div>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {rules.map((rule, index) => (
          <li key={rule} className="flex gap-3 border-t border-line pt-4 text-ui-sm text-fg-soft">
            <span className="font-mono text-caption text-mind-a tabular-nums">0{index + 1}</span>
            {rule}
          </li>
        ))}
      </ol>
    </Section>
  );
}
