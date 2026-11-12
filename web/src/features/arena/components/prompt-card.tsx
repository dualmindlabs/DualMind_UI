import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export interface PromptCardProps {
  /** The heading id the turn is labelled by. */
  id: string;
  number: number;
  prompt: string;
  className?: string;
}

/**
 * The visitor's prompt as a slim title bar over the stage: one line, the text as written. A long
 * prompt folds behind the bar (a native disclosure, so the keyboard and screen readers get it
 * for free) and opens to its full text with line breaks kept.
 */
export function PromptCard({ id, number, prompt, className }: PromptCardProps) {
  return (
    <details
      className={cn(
        'group/prompt mx-auto w-full max-w-3xl rounded-2xl border border-line bg-surface/70 open:bg-surface',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus) [&::-webkit-details-marker]:hidden">
        <h2 id={id} className="shrink-0 text-caption font-semibold tracking-tight text-human">
          You<span className="sr-only">, prompt {number}</span>
        </h2>
        <p className="min-w-0 flex-1 truncate text-ui text-fg group-open/prompt:hidden">{prompt}</p>
        <span className="hidden min-w-0 flex-1 text-caption text-muted group-open/prompt:block">
          Your prompt
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition-transform group-open/prompt:rotate-180"
          strokeWidth={1.75}
        />
      </summary>
      <p className="max-w-[72ch] px-4 pb-3.5 text-body break-words whitespace-pre-wrap text-fg">
        {prompt}
      </p>
    </details>
  );
}
