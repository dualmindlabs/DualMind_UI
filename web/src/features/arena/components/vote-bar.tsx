import { Lock } from 'lucide-react';
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

/** The look of each choice: A in cyan, B in terracotta, the two middle verdicts neutral. */
const TONE: Record<VoteChoice, { idle: string; sent: string; kbd: string }> = {
  left: {
    idle: 'border-mind-a-edge bg-mind-a-tint hover:border-mind-a hover:bg-[color-mix(in_oklab,var(--mind-a)_18%,var(--surface))]',
    sent: 'aria-pressed:border-mind-a aria-pressed:bg-mind-a aria-pressed:text-on-accent aria-pressed:shadow-glow-a',
    kbd: 'group-aria-pressed/vote:border-on-accent/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-on-accent',
  },
  right: {
    idle: 'border-mind-b-edge bg-mind-b-tint hover:border-mind-b hover:bg-[color-mix(in_oklab,var(--mind-b)_18%,var(--surface))]',
    sent: 'aria-pressed:border-mind-b aria-pressed:bg-mind-b-text aria-pressed:text-on-accent aria-pressed:shadow-glow-b',
    kbd: 'group-aria-pressed/vote:border-on-accent/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-on-accent',
  },
  tie: {
    idle: 'border-line-strong bg-surface hover:border-fg-soft hover:bg-surface-2',
    sent: 'aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg',
    kbd: 'group-aria-pressed/vote:border-bg/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-bg',
  },
  'both-bad': {
    idle: 'border-line-strong bg-surface hover:border-fg-soft hover:bg-surface-2',
    sent: 'aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg',
    kbd: 'group-aria-pressed/vote:border-bg/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-bg',
  },
};

const GRID = 'grid grid-cols-2 gap-2 sm:grid-cols-[1.35fr_1fr_1fr_1.35fr]';
const BUTTON =
  'group/vote flex h-14 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 text-ui font-semibold tracking-tight text-fg sm:px-4 pointer-coarse:h-16';

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
 * The verdict dock: four large targets (keys 1 to 4 outside text fields), A on the left in Mind
 * A's cyan and B on the right in Mind B's terracotta, like the panes; Tie and Both are bad sit in
 * between. The pick fills with its own colour and a glow (a tie or "both bad" fills neutral). The
 * buttons use aria-disabled while a vote is sent, so focus never falls out of the dock; the others
 * dim and stop pressing. Press, hover and focus match the kit's buttons (lib/press.ts); 64px tall
 * on touch screens; phones get a short buzz where the browser allows it.
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
      className={cn('surface-float grid gap-2 p-2.5 motion-safe:animate-rise sm:p-3', className)}
      data-testid="vote-bar"
    >
      <p className="flex items-center gap-2 px-1 text-ui-sm text-fg-soft">
        <span className="text-ui font-semibold tracking-tight text-fg">
          Which answer is better?
        </span>
        <span className="text-muted">
          {optional ? 'Voting is optional here.' : ''}
          <span className="hidden sm:inline">{optional ? ' ' : ''}Keys 1 to 4.</span>
        </span>
      </p>
      <div ref={group} role="group" aria-label="Your verdict" className={GRID}>
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
                'aria-disabled:cursor-default aria-disabled:not-aria-pressed:opacity-55 aria-disabled:not-aria-pressed:hover:border-line-strong aria-disabled:not-aria-pressed:active:scale-100',
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
                className={cn('hidden transition-colors sm:inline-flex', tone.kbd)}
              >
                {option.key}
              </Kbd>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="px-1 pb-0.5 text-ui-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The dock while an answer is still on its way: the same four targets, drawn quiet and out of
 * the tab order, with a line that says what it is waiting for. It swaps for the live VoteBar when
 * both answers are in, so the layout does not jump.
 */
export function VoteBarLocked({ className }: { className?: string }) {
  return (
    <div
      className={cn('surface-float grid gap-2 p-2.5 opacity-90 sm:p-3', className)}
      data-testid="vote-bar-locked"
    >
      <p className="flex items-center gap-2 px-1 text-ui-sm text-fg-soft">
        <Lock aria-hidden="true" className="size-4 text-muted" strokeWidth={1.75} />
        <span className="text-ui font-semibold tracking-tight text-fg">
          Voting opens when both answers finish
        </span>
      </p>
      <div aria-hidden="true" className={GRID}>
        {VOTE_OPTIONS.map(option => (
          <div
            key={option.choice}
            className={cn(
              BUTTON,
              'border-line bg-surface/60 text-muted',
              option.phoneOrder,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {option.choice === 'left' ? <RoleBadge who="a" letterOnly size="sm" /> : null}
              {option.choice === 'right' ? <RoleBadge who="b" letterOnly size="sm" /> : null}
              <span className="truncate">{option.label}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
