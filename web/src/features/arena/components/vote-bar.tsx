import { useEffect, useRef } from 'react';

import { Kbd } from '@/components/ui/kbd';
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

/** The look of each choice: A in cyan, B in terracotta, the two middle verdicts quiet. */
const TONE: Record<VoteChoice, { idle: string; sent: string; kbd: string }> = {
  left: {
    idle: 'border-mind-a-edge bg-mind-a-tint hover:border-mind-a hover:bg-[color-mix(in_oklab,var(--mind-a)_20%,var(--surface))]',
    sent: 'aria-pressed:border-mind-a aria-pressed:bg-mind-a aria-pressed:text-on-accent aria-pressed:shadow-glow-a',
    kbd: 'group-aria-pressed/vote:border-on-accent/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-on-accent',
  },
  right: {
    idle: 'border-mind-b-edge bg-mind-b-tint hover:border-mind-b hover:bg-[color-mix(in_oklab,var(--mind-b)_20%,var(--surface))]',
    sent: 'aria-pressed:border-mind-b aria-pressed:bg-mind-b-text aria-pressed:text-on-accent aria-pressed:shadow-glow-b',
    kbd: 'group-aria-pressed/vote:border-on-accent/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-on-accent',
  },
  tie: {
    idle: 'border-transparent bg-transparent text-fg-soft hover:bg-surface hover:text-fg',
    sent: 'aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg',
    kbd: 'group-aria-pressed/vote:border-bg/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-bg',
  },
  'both-bad': {
    idle: 'border-transparent bg-transparent text-fg-soft hover:bg-surface hover:text-fg',
    sent: 'aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg',
    kbd: 'group-aria-pressed/vote:border-bg/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-bg',
  },
};

/** What a phone's cramped pill shows instead of the full label (the full one stays in the name). */
const SHORT: Record<VoteChoice, string> = {
  left: 'A',
  tie: 'Tie',
  'both-bad': 'Neither',
  right: 'B',
};

const BUTTON =
  'group/vote flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border px-3 text-ui font-semibold tracking-tight sm:flex-none sm:px-5 pointer-coarse:h-13';
const PILL =
  'mx-auto w-full max-w-xl rounded-full border border-line-strong bg-surface-2/95 p-1.5 shadow-float backdrop-blur-md sm:w-fit sm:max-w-full';

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
 * The vote pill: one floating capsule that rises when both answers have been read. A on the left
 * in Mind A's cyan, B on the right in Mind B's terracotta, "Tie" and "Neither" between them as
 * quiet text buttons. Keys 1 to 4 vote as well (outside text fields). The pick fills with its own
 * colour and a glow. The buttons use aria-disabled while the vote is sent, so focus never falls out
 * of the pill; the others dim and stop pressing. Phones get a short buzz where allowed.
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
    <div className={cn('grid justify-items-center gap-2', className)} data-testid="vote-bar">
      <div className={cn(PILL, 'motion-safe:animate-rise')}>
        <div
          ref={group}
          role="group"
          aria-label="Your verdict"
          aria-describedby={optional ? 'vote-optional-note' : undefined}
          className="flex items-center gap-1"
        >
          {VOTE_OPTIONS.map(option => {
            const tone = TONE[option.choice];
            return (
              <button
                key={option.choice}
                type="button"
                aria-pressed={chosen === option.choice}
                aria-disabled={locked || undefined}
                aria-keyshortcuts={option.key}
                onClick={() => {
                  if (locked) return;
                  try {
                    navigator.vibrate?.(12);
                  } catch {
                    // No haptics here; the fill is the feedback.
                  }
                  onVote(option.choice);
                }}
                className={cn(
                  BUTTON,
                  PRESSABLE,
                  'cursor-pointer',
                  tone.idle,
                  tone.sent,
                  'aria-disabled:cursor-default aria-disabled:not-aria-pressed:opacity-45 aria-disabled:not-aria-pressed:active:scale-100',
                  option.choice === 'tie' || option.choice === 'both-bad' ? 'sm:px-4' : 'sm:px-6',
                )}
              >
                <span aria-hidden="true" className="sm:hidden">
                  {SHORT[option.choice]}
                </span>
                <span className="max-sm:sr-only">{option.label}</span>
                <Kbd
                  aria-hidden="true"
                  className={cn(
                    'hidden transition-colors lg:inline-flex pointer-coarse:hidden',
                    tone.kbd,
                  )}
                >
                  {option.key}
                </Kbd>
              </button>
            );
          })}
        </div>
      </div>
      {optional ? (
        <p id="vote-optional-note" className="text-caption text-muted">
          Voting is optional here.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-ui-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface VoteHintProps {
  read: { a: boolean; b: boolean };
  onSkip: () => void;
  className?: string;
}

/**
 * The pill before it opens: two dots that light as each answer is read, one line and a way past
 * (the keys 1 to 4 vote at any time as well). It swaps for the VoteBar when both answers are read
 * or the visitor chooses to vote now.
 */
export function VoteHint({ read, onSkip, className }: VoteHintProps) {
  const left = !read.a && !read.b ? 'Read both answers to vote' : read.a ? 'Now read B' : 'Now read A';
  return (
    <div className={cn('grid', className)} data-testid="vote-hint">
      <div
        className={cn(
          PILL,
          'flex items-center justify-between gap-3 pr-1.5 pl-4 motion-safe:animate-rise',
        )}
      >
        <span className="flex min-w-0 items-center gap-3 text-ui-sm text-fg-soft">
          <span aria-hidden="true" className="flex gap-1.5">
            <span
              className={cn(
                'size-2 rounded-full border border-mind-a transition-colors duration-(--dur-base)',
                read.a && 'bg-mind-a',
              )}
            />
            <span
              className={cn(
                'size-2 rounded-full border border-mind-b transition-colors duration-(--dur-base)',
                read.b && 'bg-mind-b',
              )}
            />
          </span>
          <span className="truncate">{left}</span>
        </span>
        <button
          type="button"
          onClick={onSkip}
          className="h-10 shrink-0 cursor-pointer rounded-full px-4 text-ui-sm font-medium text-fg-soft transition-colors hover:bg-surface hover:text-fg pointer-coarse:h-11"
        >
          Vote now
        </button>
      </div>
    </div>
  );
}
