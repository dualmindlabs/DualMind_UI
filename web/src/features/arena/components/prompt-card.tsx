import { cn } from '@/lib/utils/cn';

export interface PromptCardProps {
  /** The heading id the turn is labelled by. */
  id: string;
  number: number;
  prompt: string;
  className?: string;
}

/**
 * The visitor's prompt, in the human's mint: a tinted card, the "You" label and the text as
 * written (line breaks kept).
 */
export function PromptCard({ id, number, prompt, className }: PromptCardProps) {
  return (
    <div
      className={cn(
        'grid gap-1.5 rounded-xl border border-human/35 bg-human-tint px-4 py-3.5 shadow-raise',
        className,
      )}
    >
      <h2 id={id} className="eyebrow text-human">
        You<span className="sr-only">, prompt {number}</span>
      </h2>
      <p className="max-w-[72ch] text-body font-medium break-words whitespace-pre-wrap text-fg">
        {prompt}
      </p>
    </div>
  );
}
