import { useState } from 'react';

import { cn } from '@/lib/utils/cn';

export interface PromptCardProps {
  /** The heading id the turn is labelled by. */
  id: string;
  number: number;
  prompt: string;
  className?: string;
}

/** Past this many characters the prompt folds to three lines, with a way to unfold it. */
const LONG = 220;

/**
 * The visitor's prompt as a quiet header over the answers: a small "You asked" label and the text
 * as written (line breaks kept) in the soft ink, set in the same column as the answer. No box.
 * A long prompt folds to three lines with a More button.
 */
export function PromptCard({ id, number, prompt, className }: PromptCardProps) {
  const long = prompt.length > LONG || prompt.split('\n').length > 4;
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('mx-auto grid w-full max-w-[42rem] gap-2', className)}>
      <h2 id={id} className="text-ui-sm font-medium text-human">
        You asked<span className="sr-only">, prompt {number}</span>
      </h2>
      <p
        className={cn(
          'text-lead font-medium break-words whitespace-pre-wrap text-fg-soft',
          long && !open && 'line-clamp-3',
        )}
      >
        {prompt}
      </p>
      {long ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
          className="w-fit cursor-pointer text-ui-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {open ? 'Less' : 'More'}
        </button>
      ) : null}
    </div>
  );
}
