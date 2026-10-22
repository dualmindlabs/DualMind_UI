import { Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Kbd } from '@/components/ui/kbd';
import { RoleBadge } from '@/components/ui/role-badge';
import type { VoteChoice } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { PRESSABLE } from '../lib/press';

/** The verdicts, with the keys of design-direction.md section 7 (1 A, 2 B, 3 Tie, 4 Both bad). */
export const VOTE_OPTIONS: ReadonlyArray<{ choice: VoteChoice; label: string; key: string }> = [
  { choice: 'left', label: 'A is better', key: '1' },
  { choice: 'right', label: 'B is better', key: '2' },
  { choice: 'tie', label: 'Tie', key: '3' },
  { choice: 'both-bad', label: 'Both are bad', key: '4' },
];

const BY_CHOICE = Object.fromEntries(VOTE_OPTIONS.map(option => [option.choice, option])) as Record<
  VoteChoice,
  (typeof VOTE_OPTIONS)[number]
>;

const SIDE = {
  left: {
    who: 'a',
    fill: 'bg-mind-a',
    shape: 'justify-start rounded-s-full ps-5 sm:ps-8',
    fillOrigin: 'origin-left',
  },
  right: {
    who: 'b',
    fill: 'bg-mind-b-text',
    shape: 'justify-end rounded-e-full pe-5 sm:pe-8',
    fillOrigin: 'origin-right',
  },
} as const;

const SECONDARY =
  'group/vote inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-ui-sm font-medium text-fg-soft hover:border-fg-soft hover:text-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg aria-disabled:cursor-default aria-disabled:not-aria-pressed:opacity-50 pointer-coarse:h-12';

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
 * The verdict, as a tug of war: one wide pill across the middle of the stage, A on the left in
 * Mind A's cyan, B on the right in Mind B's terracotta, a VS medallion between them that leans
 * toward the side under the pointer or focus. A side fills with its colour from the outer edge
 * on hover and floods on the press (transform and opacity only); the other side steps back.
 * Tie and Both are bad are small and quiet under it. Keys 1 to 4 outside text fields.
 *
 * Buttons use aria-disabled while a vote is sent, so focus never falls out of the dock. 80px
 * tall (96 on touch screens); phones get a short buzz where the browser allows it.
 */
export function VoteBar({ onVote, chosen, optional = false, error, className }: VoteBarProps) {
  const locked = chosen !== null;
  const group = useRef<HTMLDivElement>(null);

  // Answers are ready: when the visitor is still in the empty prompt box (they just sent), move
  // focus to the verdict, so the keys 1 to 4 vote instead of typing into the box.
  useEffect(() => {
    const active = document.activeElement;
    const inEmptyPrompt =
      active instanceof HTMLTextAreaElement &&
      active.dataset.slot === 'prompt-input-textarea' &&
      active.value.trim() === '';
    // The prompt box steps aside while the verdict is open, which drops focus on the page.
    if (inEmptyPrompt || active === null || active === document.body) {
      group.current?.querySelector('button')?.focus({ preventScroll: true });
    }
  }, []);

  const press = (choice: VoteChoice) => {
    if (locked) return;
    try {
      navigator.vibrate?.(12);
    } catch {
      // No haptics here; the flood is the feedback.
    }
    onVote(choice);
  };

  const side = (choice: 'left' | 'right') => {
    const option = BY_CHOICE[choice];
    const look = SIDE[choice];
    return (
      <button
        type="button"
        aria-pressed={chosen === choice}
        aria-disabled={locked || undefined}
        aria-keyshortcuts={option.key}
        data-side={look.who}
        onClick={() => press(choice)}
        className={cn(
          'group/vote relative isolate flex h-20 min-w-0 cursor-pointer items-center gap-3 overflow-hidden text-lead font-semibold tracking-tight text-fg pointer-coarse:h-24',
          PRESSABLE,
          look.shape,
          'aria-disabled:cursor-default aria-disabled:not-aria-pressed:opacity-40 aria-pressed:text-on-accent',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-0 -z-10 scale-x-0 opacity-25 transition-[transform,opacity] duration-(--dur-slow) ease-out-expo',
            'group-hover/vote:scale-x-100 group-focus-visible/vote:scale-x-100',
            'group-aria-pressed/vote:scale-x-100 group-aria-pressed/vote:opacity-100',
            look.fill,
            look.fillOrigin,
          )}
        />
        <RoleBadge
          who={look.who}
          letterOnly
          size="md"
          className="size-9 group-aria-pressed/vote:border-on-accent/50 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-on-accent"
        />
        <span className="truncate">{option.label}</span>
        <Kbd
          aria-hidden="true"
          className="hidden transition-colors group-aria-pressed/vote:border-on-accent/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-on-accent sm:inline-flex pointer-coarse:hidden"
        >
          {option.key}
        </Kbd>
      </button>
    );
  };

  const small = (choice: 'tie' | 'both-bad') => {
    const option = BY_CHOICE[choice];
    return (
      <button
        key={choice}
        type="button"
        aria-pressed={chosen === choice}
        aria-disabled={locked || undefined}
        aria-keyshortcuts={option.key}
        onClick={() => press(choice)}
        className={cn(SECONDARY, PRESSABLE, 'cursor-pointer')}
      >
        {option.label}
        <Kbd
          aria-hidden="true"
          className="hidden group-aria-pressed/vote:border-bg/40 group-aria-pressed/vote:bg-transparent group-aria-pressed/vote:text-bg sm:inline-flex pointer-coarse:hidden"
        >
          {option.key}
        </Kbd>
      </button>
    );
  };

  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-3xl justify-items-center gap-3 motion-safe:animate-rise',
        className,
      )}
      data-testid="vote-bar"
    >
      <p className="text-ui-sm font-medium text-fg-soft">
        Which answer is better?
        {optional ? <span className="text-muted"> Voting is optional here.</span> : null}
      </p>
      <div
        ref={group}
        role="group"
        aria-label="Your verdict"
        className="grid w-full justify-items-center gap-3"
      >
        <div className="group/tug relative grid w-full grid-cols-2 rounded-full border border-line-strong bg-surface-2 shadow-float">
          {side('left')}
          {side('right')}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 left-1/2 z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-bg font-mono text-caption font-medium text-fg-soft shadow-raise transition-transform duration-(--dur-base) ease-out-expo',
              'group-has-[[data-side=a]:hover]/tug:-translate-x-[calc(50%+14px)] group-has-[[data-side=b]:hover]/tug:-translate-x-[calc(50%-14px)]',
              'group-has-[[data-side=a]:focus-visible]/tug:-translate-x-[calc(50%+14px)] group-has-[[data-side=b]:focus-visible]/tug:-translate-x-[calc(50%-14px)]',
            )}
          >
            VS
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {small('tie')}
          {small('both-bad')}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-ui-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The dock while an answer is still on its way: one quiet line with a hairline of light moving
 * under it, out of the tab order. It swaps for the live VoteBar when both answers are in.
 */
export function VoteBarLocked({ className }: { className?: string }) {
  return (
    <div
      className={cn('mx-auto grid w-full max-w-md justify-items-center gap-2.5', className)}
      data-testid="vote-bar-locked"
    >
      <p className="flex items-center gap-2 text-ui-sm text-fg-soft">
        <Lock aria-hidden="true" className="size-4 text-muted" strokeWidth={1.75} />
        Voting opens when both answers finish
      </p>
      <div aria-hidden="true" className="relative h-px w-full overflow-hidden bg-line">
        <span className="absolute inset-y-0 left-0 w-full -translate-x-full bg-mind-a motion-safe:animate-skeleton" />
      </div>
    </div>
  );
}
