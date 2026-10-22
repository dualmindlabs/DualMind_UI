import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

import { Kbd } from '@/components/ui/kbd';
import { RoleBadge } from '@/components/ui/role-badge';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import type { VoteChoice } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { PRESSABLE } from '../lib/press';

/** The verdicts in reading order, with the keys of design-direction.md section 7. */
export const VOTE_OPTIONS: ReadonlyArray<{
  choice: VoteChoice;
  label: string;
  key: string;
  /** Phones: A and B on the first row, the two quiet verdicts under them. */
  phoneOrder: string;
}> = [
  { choice: 'left', label: 'A is better', key: '1', phoneOrder: 'max-sm:order-1' },
  { choice: 'right', label: 'B is better', key: '2', phoneOrder: 'max-sm:order-2' },
  { choice: 'tie', label: 'Tie', key: '3', phoneOrder: 'max-sm:order-3' },
  { choice: 'both-bad', label: 'Both are bad', key: '4', phoneOrder: 'max-sm:order-4' },
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

const GRID = 'grid grid-cols-2 gap-2 sm:grid-cols-[1.5fr_1.5fr_1fr_1.15fr]';
const BUTTON =
  'group/vote relative flex h-12 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 text-ui font-semibold tracking-tight text-fg pointer-coarse:h-14';

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
 * The key cap of a vote chip. The four caps breathe in turn, one small lift each, every few
 * seconds, so the keyboard route is seen without a word about it (transform only). It rests once
 * a vote is sent, and always under reduced motion.
 */
function KeyHint({
  index,
  className,
  still,
  reduce,
  children,
}: {
  index: number;
  className?: string;
  still: boolean;
  reduce: boolean;
  children: string;
}) {
  const rest = still || reduce;
  return (
    <motion.span
      aria-hidden="true"
      className="hidden sm:inline-flex"
      animate={rest ? { y: 0 } : { y: [0, -3, 0] }}
      transition={
        rest
          ? { duration: 0 }
          : { duration: 0.6, delay: 1 + index * 0.22, repeat: Infinity, repeatDelay: 3.6 }
      }
    >
      <Kbd className={cn('transition-colors', className)}>{children}</Kbd>
    </motion.span>
  );
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
  const reduce = useShouldReduceMotion();
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
      className={cn('grid gap-2 surface-float p-2.5 motion-safe:animate-rise sm:p-3', className)}
      data-testid="vote-bar"
    >
      <p className="flex items-baseline gap-2 px-1 text-ui-sm text-fg-soft">
        <span className="text-ui font-semibold tracking-tight text-fg">
          Which answer is better?
        </span>
        <span className="text-muted">
          {optional ? 'Voting is optional here.' : ''}
          <span className="hidden sm:inline">{optional ? ' ' : ''}Press 1 to 4.</span>
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
              <KeyHint
                index={VOTE_OPTIONS.indexOf(option)}
                className={tone.kbd}
                still={locked}
                reduce={reduce}
              >
                {option.key}
              </KeyHint>
              {chosen === option.choice && !reduce ? (
                <motion.span
                  aria-hidden="true"
                  data-testid="vote-burst"
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scaleX: 1.08, scaleY: 1.35 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-lg border-2',
                    option.choice === 'left'
                      ? 'border-mind-a'
                      : option.choice === 'right'
                        ? 'border-mind-b'
                        : 'border-fg',
                  )}
                />
              ) : null}
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
 * The dock while an answer is still on its way: one quiet line that says what it is waiting for,
 * out of the tab order. It swaps for the live VoteBar when both answers are in.
 */
export function VoteBarLocked({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 surface-float px-4 py-3 text-ui-sm text-fg-soft',
        className,
      )}
      data-testid="vote-bar-locked"
    >
      <Lock aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
      <span className="font-medium text-fg">Voting opens when both answers finish</span>
      <span aria-hidden="true" className="ml-auto hidden items-center gap-1 sm:inline-flex">
        {VOTE_OPTIONS.map(option => (
          <Kbd key={option.key} className="opacity-60">
            {option.key}
          </Kbd>
        ))}
      </span>
    </div>
  );
}
