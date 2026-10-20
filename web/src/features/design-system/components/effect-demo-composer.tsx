import { useState } from 'react';

import { PlaceholdersAndVanishInput } from '@/components/vendor/aceternity/placeholders-and-vanish-input';

import { EffectFrame } from './effect-frame';

const examples = [
  'Explain recursion to a ten-year-old',
  'Write a haiku about merge conflicts',
  'Plan a three-day trip to Lisbon on a budget',
  'Which is bigger, 9.11 or 9.9?',
];

/** Placeholders And Vanish Input as the hero composer: labelled, controlled, Enter sends. */
export function EffectDemoComposer() {
  const [prompt, setPrompt] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  return (
    <EffectFrame effect="placeholders-and-vanish-input" className="sm:col-span-2" stageClassName="px-6 sm:px-10">
      <div className="grid w-full gap-3">
        <PlaceholdersAndVanishInput
          label="Ask both models"
          placeholders={examples}
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={text => setSent(text)}
          name="prompt"
          submitLabel="Send to both models"
        />
        <p role="status" className="min-h-5 text-center text-caption text-muted">
          {sent ? `Sent: “${sent}”` : 'Type a prompt and press Enter.'}
        </p>
      </div>
    </EffectFrame>
  );
}
