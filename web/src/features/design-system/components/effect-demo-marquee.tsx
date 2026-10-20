import { useState } from 'react';

import { Marquee } from '@/components/vendor/magicui/marquee';

import { EffectFrame } from './effect-frame';
import { PauseToggle } from './pause-toggle';

const prompts = [
  'Explain recursion to a ten-year-old',
  'Write a haiku about merge conflicts',
  'Is 9.11 bigger than 9.9?',
  'Plan a budget trip to Lisbon',
  'Fix this off-by-one error',
];

/** Marquee: example prompts scrolling past, with a visible pause control (WCAG 2.2.2). */
export function EffectDemoMarquee() {
  const [paused, setPaused] = useState(false);

  return (
    <EffectFrame effect="marquee" stageClassName="flex-col gap-4 px-0">
      <Marquee pauseOnHover paused={paused} duration={30} repeat={3} className="w-full">
        {prompts.map(prompt => (
          <span
            key={prompt}
            className="rounded-full border border-line bg-surface-2 px-3.5 py-1.5 text-ui-sm whitespace-nowrap text-fg-soft"
          >
            {prompt}
          </span>
        ))}
      </Marquee>
      <PauseToggle paused={paused} onToggle={() => setPaused(value => !value)} label="prompts" />
    </EffectFrame>
  );
}
