import { Shuffle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { PromptSuggestion } from '@/components/vendor/prompt-kit/prompt-suggestion';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useDraft } from '../hooks/use-draft';
import { pickSurprise, STARTER_CATEGORIES, type StarterCategory } from '../lib/starters';

/**
 * Prompt starters (new-features.md F-7): categories, four curated prompts each, and "Surprise
 * me". A starter fills the prompt box and focuses it; nothing is sent until the visitor sends it.
 * On phones the chips scroll sideways.
 */
export function PromptStarters({ className }: { className?: string }) {
  const { focusComposer } = useArena();
  const { draft, setDraft } = useDraft();
  const [category, setCategory] = useState<StarterCategory['id']>('code');
  const active = STARTER_CATEGORIES.find(item => item.id === category) ?? STARTER_CATEGORIES[0];

  const fill = (prompt: string) => {
    setDraft(prompt);
    focusComposer();
  };

  return (
    <section aria-labelledby="starters-title" className={cn('grid min-w-0 gap-3', className)}>
      <h2 id="starters-title" className="sr-only">
        Prompt starters
      </h2>
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:justify-center md:overflow-visible">
        <div role="group" aria-label="Starter category" className="flex shrink-0 gap-1">
          {STARTER_CATEGORIES.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === category}
              onClick={() => setCategory(item.id)}
              className="h-8 shrink-0 rounded-full px-3 eyebrow text-muted transition-colors duration-(--dur-fast) hover:text-fg aria-pressed:bg-surface-3 aria-pressed:text-fg pointer-coarse:h-10"
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0 rounded-full text-human hover:text-human"
          onClick={() => fill(pickSurprise(Math.random, draft || null))}
        >
          <Shuffle aria-hidden="true" strokeWidth={1.75} />
          Surprise me
        </Button>
      </div>
      <ul className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:justify-center md:overflow-visible">
        {active?.prompts.map(prompt => (
          <li key={prompt} className="max-w-[80vw] shrink-0 md:max-w-[22rem]">
            <PromptSuggestion title={prompt} onClick={() => fill(prompt)} className="w-full">
              {prompt}
            </PromptSuggestion>
          </li>
        ))}
      </ul>
    </section>
  );
}
