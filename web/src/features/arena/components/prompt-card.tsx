import { cn } from '@/lib/utils/cn';

export interface PromptCardProps {
  /** The heading id the turn is labelled by. */
  id: string;
  number: number;
  prompt: string;
  className?: string;
}

/**
 * The visitor's prompt, in the human's terra: a rule, the "You" label and the text as written
 * (line breaks kept).
 */
export function PromptCard({ id, number, prompt, className }: PromptCardProps) {
  return (
    <div className={cn('grid gap-1.5 border-l-2 border-human pl-4', className)}>
      <h2 id={id} className="eyebrow text-human">
        You<span className="sr-only">, prompt {number}</span>
      </h2>
      <p className="max-w-[72ch] text-body font-medium break-words whitespace-pre-wrap text-fg">
        {prompt}
      </p>
    </div>
  );
}
