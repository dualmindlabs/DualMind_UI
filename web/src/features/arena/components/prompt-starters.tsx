import { ArrowUpRight, Dices } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useDraft } from '../hooks/use-draft';
import { PRESSABLE } from '../lib/press';
import { pickSurprise, STARTER_CATEGORIES, type StarterCategory } from '../lib/starters';
import { ScrollRow } from './scroll-row';
import { EXPO, playOn } from './stage-motion';

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
  const dice = useRef<HTMLSpanElement | null>(null);
  const reduce = useShouldReduceMotion();
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
                'h-8 shrink-0 cursor-pointer snap-start rounded-full border border-transparent px-3.5 text-ui-sm font-medium text-fg-soft hover:bg-hover hover:text-fg aria-pressed:border-line-strong aria-pressed:bg-surface-3 aria-pressed:text-fg aria-pressed:shadow-raise pointer-coarse:h-11',
                PRESSABLE,
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="xs"
          className="h-8 shrink-0 snap-start rounded-full border-human/50 px-3.5 text-ui-sm text-human hover:border-human hover:text-human pointer-coarse:h-11"
          onClick={() => {
            // The dice turn once per press.
            if (!reduce) {
              playOn(
                dice.current,
                [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
                {
                  duration: 520,
                  easing: EXPO,
                },
              );
            }
            fill(pickSurprise(Math.random, draft || null));
          }}
        >
          <span ref={dice} aria-hidden="true" className="inline-flex">
            <Dices strokeWidth={1.75} />
          </span>
          Surprise me
        </Button>
      </ScrollRow>
      <ScrollRow
        as="ul"
        contentKey={category}
        className="gap-2.5 md:grid md:grid-cols-2 md:overflow-visible"
      >
        {active?.prompts.map(prompt => (
          <li
            key={prompt}
            className="w-[72vw] max-w-72 shrink-0 snap-start md:w-auto md:max-w-none"
          >
            <button
              type="button"
              title={prompt}
              onClick={() => fill(prompt)}
              className={cn(
                'group/starter surface-duel flex h-full min-h-20 w-full cursor-pointer items-start gap-3 p-3.5 text-left text-ui-sm text-fg-soft hover:border-line-strong hover:text-fg pointer-coarse:min-h-11',
                PRESSABLE,
              )}
            >
              <span className="line-clamp-3 min-w-0 flex-1">{prompt}</span>
              <ArrowUpRight
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted transition-colors duration-(--dur-fast) group-hover/starter:text-human"
                strokeWidth={1.75}
              />
            </button>
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}
