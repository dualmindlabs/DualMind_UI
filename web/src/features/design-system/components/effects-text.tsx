import { TextShimmer } from '@/components/vendor/motion-primitives/text-shimmer';
import { BlurText } from '@/components/vendor/reactbits/blur-text';
import { DecryptedText } from '@/components/vendor/reactbits/decrypted-text';
import { FuzzyText } from '@/components/vendor/reactbits/fuzzy-text';
import { ShinyText } from '@/components/vendor/reactbits/shiny-text';
import { TextType } from '@/components/vendor/reactbits/text-type';

import { EffectFrame } from './effect-frame';

const examples = [
  'Explain recursion to a ten-year-old.',
  'Write a haiku about merge conflicts.',
  'Which is bigger, 9.11 or 9.9?',
];

/** Blur Text, Decrypted Text, Shiny Text, Text Shimmer, Text Type and Fuzzy Text. */
export function EffectsText() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <EffectFrame effect="blur-text" replay className="sm:col-span-2">
        {run => (
          <BlurText
            as="p"
            trigger={run === 0 ? 'view' : 'load'}
            className="text-center text-h2 font-light text-fg"
            text={[
              { text: 'Two models. One prompt.' },
              { text: 'You decide.', className: 'human-voice text-human' },
            ]}
          />
        )}
      </EffectFrame>

      <EffectFrame effect="decrypted-text" replay>
        {run => (
          <div className="grid w-full max-w-xs gap-3 font-mono text-ui-sm">
            <p className="flex items-center justify-between gap-4 rounded-md border border-line bg-mind-a-tint px-3 py-2">
              <span className="text-muted">Mind A was</span>
              <DecryptedText
                text="Vega 7"
                animateOn={run === 0 ? 'view' : 'mount'}
                sequential
                speed={70}
                className="font-medium text-mind-a"
                encryptedClassName="text-muted"
              />
            </p>
            <p className="flex items-center justify-between gap-4 rounded-md border border-line bg-mind-b-tint px-3 py-2">
              <span className="text-muted">Mind B was</span>
              <DecryptedText
                text="Lumen 3"
                animateOn={run === 0 ? 'view' : 'mount'}
                sequential
                speed={70}
                className="font-medium text-mind-b-text"
                encryptedClassName="text-muted"
              />
            </p>
          </div>
        )}
      </EffectFrame>

      <EffectFrame effect="shiny-text">
        <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface-2 px-4 py-2 text-ui-sm">
          <span aria-hidden="true" className="size-2 rounded-full bg-mind-a" />
          <ShinyText>Generating both answers</ShinyText>
        </p>
      </EffectFrame>

      <EffectFrame effect="text-shimmer">
        <TextShimmer as="p" className="text-ui" duration={1.8}>
          Thinking it through, step by step
        </TextShimmer>
      </EffectFrame>

      <EffectFrame effect="text-type">
        <p className="w-full max-w-xs rounded-lg border border-line-strong bg-surface-2 px-4 py-3 text-ui text-muted">
          <TextType text={examples} />
        </p>
      </EffectFrame>

      <EffectFrame
        effect="fuzzy-text"
        className="sm:col-span-2 xl:col-span-3"
        stageClassName="min-h-64"
      >
        <div className="grid justify-items-center gap-3 text-center">
          <p className="text-muted">
            <FuzzyText fontSize="clamp(5rem, 16vw, 9rem)">404</FuzzyText>
          </p>
          <p className="human-voice text-h3 text-fg-soft">This page lost the vote.</p>
        </div>
      </EffectFrame>
    </div>
  );
}
