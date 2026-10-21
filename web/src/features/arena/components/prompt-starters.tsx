import { Shuffle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { PromptSuggestion } from '@/components/vendor/prompt-kit/prompt-suggestion';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useDraft } from '../hooks/use-draft';
import { PRESSABLE } from '../lib/press';
import { pickSurprise, STARTER_CATEGORIES, type StarterCategory } from '../lib/starters';
import { ScrollRow } from './scroll-row';

/**
 * Prompt starters (new-features.md F-7): categories, four curated prompts each, and "Surprise
 * me". A starter fills the prompt box and focuses it; nothing is sent until the visitor sends it.
 * On phones both rows scroll sideways, with snap points, edge fades and a chevron cue
 * (ScrollRow); from `md` they wrap and centre.
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
    <section aria-labelledby="starters-title" className={cn('grid min-w-0 gap-1', className)}>
      <h2 id="starters-title" className="sr-only">
        Prompt starters
      </h2>
      <ScrollRow className="items-center gap-2 md:flex-wrap md:justify-center md:overflow-visible">
        <div role="group" aria-label="Starter category" className="flex shrink-0 gap-1">
          {STARTER_CATEGORIES.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === category}
              onClick={() => setCategory(item.id)}
              className={cn(
                'h-8 shrink-0 cursor-pointer snap-start rounded-full px-3 eyebrow text-muted hover:bg-hover hover:text-fg aria-pressed:bg-surface-3 aria-pressed:text-fg pointer-coarse:h-11',
                PRESSABLE,
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0 snap-start rounded-full text-human hover:text-human pointer-coarse:h-11 [&_svg]:transition-transform [&_svg]:duration-(--dur-base) [&_svg]:ease-out-expo motion-safe:hover:[&_svg]:rotate-180"
          onClick={() => fill(pickSurprise(Math.random, draft || null))}
        >
          <Shuffle aria-hidden="true" strokeWidth={1.75} />
          Surprise me
        </Button>
      </ScrollRow>
      <ScrollRow
        as="ul"
        contentKey={category}
        className="gap-2 md:flex-wrap md:justify-center md:overflow-visible"
      >
        {active?.prompts.map(prompt => (
          <li key={prompt} className="max-w-[80vw] shrink-0 snap-start md:max-w-[22rem]">
            <PromptSuggestion title={prompt} onClick={() => fill(prompt)} className="w-full">
              {prompt}
            </PromptSuggestion>
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}
