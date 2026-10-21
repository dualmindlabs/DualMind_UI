import { Pause, Play } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

interface PauseButtonProps {
  paused: boolean;
  onToggle: () => void;
  /** What moves, for the accessible name: "Pause the model list". */
  subject: string;
  className?: string;
}

/** The visible pause control a moving loop needs (WCAG 2.2.2). */
export function PauseButton({ paused, onToggle, subject, className }: PauseButtonProps) {
  const Icon = paused ? Play : Pause;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${paused ? 'Play' : 'Pause'} ${subject}`}
      className={cn(
        'hit-area relative inline-grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted',
        'transition-[border-color,color,background-color] duration-(--dur-fast) ease-out-expo hover:border-line-strong hover:bg-hover hover:text-fg',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
    </button>
  );
}
