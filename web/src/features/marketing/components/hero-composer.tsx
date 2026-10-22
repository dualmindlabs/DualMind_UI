import { useState } from 'react';

import { PlaceholdersAndVanishInput } from '@/components/vendor/aceternity/placeholders-and-vanish-input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { sendPromptToSignIn } from '@/lib/session/prompt-draft';
import { cn } from '@/lib/utils/cn';

import { DEMO_BATTLES } from '../content/demo';
import { EXAMPLE_PROMPTS, HERO, HERO_STATUS, SIGN_IN_HREF } from '../content/landing';

/** Short examples for phones: the field is one line, so a long one would be cut off. */
const NARROW_PROMPTS: readonly string[] = [
  'Why do benchmarks stop working?',
  'Explain entanglement simply',
  'Define an API in one line',
  'Write a haiku about bugs',
  'Which is bigger, 9.11 or 9.9?',
];

interface HeroComposerProps {
  /** Called with a demo chip's prompt; the page plays that recorded battle below and scrolls to it. */
  onAsk: (prompt: string) => void;
  className?: string;
}

/**
 * The hero composer: the arena's prompt box with rotating example prompts. Signed out, a prompt
 * cannot reach real models, so a prompt the visitor types is kept for this tab
 * (lib/session/prompt-draft.ts) and the visitor goes to sign in; the arena then opens with it in
 * the box, focused and not sent (UI audit P1-1). The chips play the recorded demo battles, as
 * before. The status line says which of the two is happening.
 */
export function HeroComposer({ onAsk, className }: HeroComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'demo' | 'sign-in'>('idle');
  const narrow = useMediaQuery('(max-width: 30rem)');

  const signInWith = (text: string) => {
    if (text.trim() === '') return;
    setStatus('sign-in');
    sendPromptToSignIn(text);
  };

  const playDemo = (text: string) => {
    setStatus('demo');
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
        onSubmit={signInWith}
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
            onClick={() => playDemo(battle.prompt)}
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
      <p role="status" className="mt-3 min-h-6 text-ui-sm text-fg-soft" data-testid="hero-status">
        {status === 'sign-in' ? (
          HERO_STATUS.signIn
        ) : status === 'demo' ? (
          <>
            {HERO_STATUS.demo}{' '}
            <a
              href={SIGN_IN_HREF}
              className="font-medium text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
            >
              {HERO_STATUS.demoLink}
            </a>
          </>
        ) : (
          <span className="text-muted">{HERO_STATUS.idle}</span>
        )}
      </p>
    </div>
  );
}
