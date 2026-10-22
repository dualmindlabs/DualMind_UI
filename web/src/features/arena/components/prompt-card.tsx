import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils/cn';

export interface PromptCardProps {
  /** The heading id the turn is labelled by. */
  id: string;
  number: number;
  prompt: string;
  className?: string;
}

/** Past this many characters the prompt folds to two lines, with a "Show more" under it. */
const FOLD_AT = 180;

/**
 * The visitor's prompt as a command line: a mono prompt mark, the text as written (line breaks
 * kept) and nothing else. Long prompts fold to two lines; the whole text stays in the page for
 * screen readers and find-in-page.
 */
export function PromptCard({ id, number, prompt, className }: PromptCardProps) {
  const [open, setOpen] = useState(false);
  const long = prompt.length > FOLD_AT || prompt.split('\n').length > 2;
  return (
    <div className={cn('flex items-start gap-3 border-l-2 border-human/60 py-0.5 pl-4', className)}>
      <h2 id={id} className="sr-only">
        You, prompt {number}
      </h2>
      <div className="grid min-w-0 flex-1 gap-1">
        <p
          className={cn(
            'max-w-[80ch] text-body font-medium break-words whitespace-pre-wrap text-fg',
            long && !open && 'line-clamp-2',
          )}
        >
          {prompt}
        </p>
        {long ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(value => !value)}
            className="inline-flex h-8 w-fit items-center gap-1 rounded-md pr-2 text-caption font-medium text-fg-soft hover:text-fg"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', open && 'rotate-180')}
              strokeWidth={1.75}
            />
            {open ? 'Show less' : 'Show more'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
