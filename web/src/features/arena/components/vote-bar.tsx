import { useEffect, useRef } from 'react';

import { Kbd } from '@/components/ui/kbd';
import { RoleBadge } from '@/components/ui/role-badge';
import type { VoteChoice } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { PRESSABLE } from '../lib/press';

/** The verdicts in reading order, with the keys of design-direction.md section 7. */
export const VOTE_OPTIONS: ReadonlyArray<{
  choice: VoteChoice;
  label: string;
  key: string;
  /** Phones: A and B on the first row, under their panes' switch. */
  phoneOrder: string;
}> = [
  { choice: 'left', label: 'A is better', key: '1', phoneOrder: 'max-sm:order-1' },
  { choice: 'tie', label: 'Tie', key: '3', phoneOrder: 'max-sm:order-3' },
  { choice: 'both-bad', label: 'Both are bad', key: '4', phoneOrder: 'max-sm:order-4' },
  { choice: 'right', label: 'B is better', key: '2', phoneOrder: 'max-sm:order-2' },
];

export interface VoteBarProps {
  onVote: (choice: VoteChoice) => void;
  /** The choice being sent (voting) or sent; the other buttons stay readable but inert. */
  chosen: VoteChoice | null;
  /** Side by side: voting is optional, and the bar says so. */
  optional?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * The verdict: four large targets (keys 1 to 4 outside text fields), A on the left and B on the
 * right like the panes. The pick turns terra, the human's colour. The buttons use aria-disabled
 * while a vote is sent, so focus never falls out of the bar; the others dim and stop pressing.
 * Press, hover and focus match the kit's buttons (lib/press.ts); 56px tall on touch screens.
 */
export function VoteBar({ onVote, chosen, optional = false, error, className }: VoteBarProps) {
  const locked = chosen !== null;
  const group = useRef<HTMLDivElement>(null);

  // Answers are ready: when the visitor is still in the empty prompt box (they just sent), move
  // focus to the verdict, so the keys 1 to 4 vote instead of typing into the box.
  useEffect(() => {
    const active = document.activeElement;
    if (
      active instanceof HTMLTextAreaElement &&
      active.dataset.slot === 'prompt-input-textarea' &&
      active.value.trim() === ''
    ) {
      group.current?.querySelector('button')?.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div
      className={cn(
        'grid gap-2 rounded-xl border border-line bg-glass p-2 shadow-raise-strong backdrop-blur-md',
        className,
      )}
      data-testid="vote-bar"
    >
      <p className="px-2 pt-1 text-ui-sm text-fg-soft">
        {optional ? 'Which answer is better? Voting is optional here.' : 'Which answer is better?'}
        <span className="hidden text-muted sm:inline"> Keys 1 to 4.</span>
      </p>
      <div
        ref={group}
        role="group"
        aria-label="Your verdict"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {VOTE_OPTIONS.map(option => (
          <button
            key={option.choice}
            type="button"
            aria-pressed={chosen === option.choice}
            aria-disabled={locked || undefined}
            aria-keyshortcuts={option.key}
            onClick={() => {
              if (!locked) onVote(option.choice);
            }}
            className={cn(
              'group/vote flex h-12 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3 text-ui font-medium text-fg sm:px-4 pointer-coarse:h-14',
              PRESSABLE,
              'hover:border-fg-soft hover:bg-surface-2 active:bg-surface-3',
              // Sent: the pick turns terra; the others stay readable, but quiet and inert.
              'aria-pressed:border-human aria-pressed:bg-human-tint aria-pressed:hover:border-human aria-pressed:hover:bg-human-tint',
              'aria-disabled:cursor-default aria-disabled:not-aria-pressed:opacity-60 aria-disabled:hover:border-line-strong aria-disabled:hover:bg-surface aria-disabled:active:scale-100',
              option.phoneOrder,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {option.choice === 'left' ? <RoleBadge who="a" letterOnly size="sm" /> : null}
              {option.choice === 'right' ? <RoleBadge who="b" letterOnly size="sm" /> : null}
              <span className="truncate">{option.label}</span>
            </span>
            <Kbd
              aria-hidden="true"
              className="hidden transition-colors duration-(--dur-fast) group-hover/vote:text-fg group-aria-pressed/vote:border-human/60 group-aria-pressed/vote:text-human sm:inline-flex"
            >
              {option.key}
            </Kbd>
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="px-2 pb-1 text-ui-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
