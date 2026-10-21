import { useState } from 'react';

import { PlaceholdersAndVanishInput } from '@/components/vendor/aceternity/placeholders-and-vanish-input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils/cn';

import { DEMO_BATTLES } from '../content/demo';
import { EXAMPLE_PROMPTS, HERO, SIGN_IN_HREF } from '../content/landing';

/** Short examples for phones: the field is one line, so a long one would be cut off. */
const NARROW_PROMPTS: readonly string[] = [
  'Why do benchmarks stop working?',
  'Explain entanglement simply',
  'Define an API in one line',
  'Write a haiku about bugs',
  'Which is bigger, 9.11 or 9.9?',
];

interface HeroComposerProps {
  /** Called with the prompt; the page plays the recorded demo below and scrolls to it. */
  onAsk: (prompt: string) => void;
  className?: string;
}

/**
 * The hero composer: the arena's prompt box with rotating example prompts. Signed out, a prompt
 * cannot reach real models, so sending one plays the recorded demo battle below and offers the
 * sign-in (the status line says so). The chips play one of the recorded battles directly.
 */
export function HeroComposer({ onAsk, className }: HeroComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [sent, setSent] = useState(false);
  const narrow = useMediaQuery('(max-width: 30rem)');

  const ask = (text: string) => {
    setSent(true);
    onAsk(text);
  };

  return (
    <div className={cn('flex w-full flex-col items-center', className)}>
      <PlaceholdersAndVanishInput
        label={HERO.composerLabel}
        hideLabel
        size="lg"
        placeholders={narrow ? NARROW_PROMPTS : EXAMPLE_PROMPTS}
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={ask}
        name="prompt"
        submitLabel={HERO.composerSubmit}
        className="max-w-2xl"
      />
      <div className="mt-5 flex max-w-5xl flex-wrap items-center justify-center gap-2">
        <span className="mr-1 eyebrow text-muted">Or watch</span>
        {DEMO_BATTLES.map((battle, index) => (
          <button
            key={battle.id}
            type="button"
            onClick={() => ask(battle.prompt)}
            aria-label={`Play the recorded battle: ${battle.prompt}`}
            className={cn(
              'hit-area relative inline-block h-8 max-w-full truncate rounded-full border border-line bg-glass px-3.5 text-caption leading-[1.875rem] text-fg-soft',
              'transition-[border-color,color,background-color,scale] duration-(--dur-fast) ease-out-expo hover:border-line-strong hover:bg-hover hover:text-fg active:scale-[0.97]',
              index === 2 && 'hidden md:inline-block',
            )}
          >
            {battle.prompt}
          </button>
        ))}
      </div>
      <p role="status" className="mt-3 min-h-6 text-ui-sm text-fg-soft">
        {sent ? (
          <>
            Playing a recorded demo below.{' '}
            <a
              href={SIGN_IN_HREF}
              className="font-medium text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
            >
              Sign in to battle real models
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
