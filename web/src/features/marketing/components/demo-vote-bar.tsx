import type { RefObject } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';
import { cn } from '@/lib/utils/cn';

import { type DemoVote, VOTE_OPTIONS } from '../lib/demo-machine';

interface DemoVoteBarProps {
  /** True while a vote can be cast; otherwise the buttons stay focusable but do nothing. */
  enabled: boolean;
  vote: DemoVote | null;
  onVote: (choice: DemoVote) => void;
  groupRef?: RefObject<HTMLDivElement | null>;
}

const tone: Record<DemoVote, { rest: string; picked: string }> = {
  a: {
    rest: 'border-mind-a-edge bg-mind-a-tint hover:border-mind-a',
    picked:
      'aria-pressed:border-mind-a aria-pressed:bg-mind-a aria-pressed:text-on-accent aria-pressed:shadow-glow-a',
  },
  b: {
    rest: 'border-mind-b-edge bg-mind-b-tint hover:border-mind-b-text',
    picked:
      'aria-pressed:border-mind-b-text aria-pressed:bg-mind-b-text aria-pressed:text-on-accent aria-pressed:shadow-glow-b',
  },
  tie: {
    rest: 'border-line-strong bg-surface hover:bg-surface-3',
    picked: 'aria-pressed:border-human aria-pressed:bg-human-tint',
  },
  bad: {
    rest: 'border-line-strong bg-surface hover:bg-surface-3',
    picked: 'aria-pressed:border-human aria-pressed:bg-human-tint',
  },
};

/**
 * The verdict row of the demo, a split control: A is better (Mind A's colour), Tie and Both are
 * bad in the middle, B is better (Mind B's colour), with the 1 to 4 shortcuts. The buttons use
 * aria-disabled (not disabled) while the answers appear and after the vote, so keyboard focus
 * never falls out of the demo. Your choice fills with its colour.
 */
export function DemoVoteBar({ enabled, vote, onVote, groupRef }: DemoVoteBarProps) {
  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Your verdict"
      className="grid grid-cols-2 gap-2 surface-inset p-2 sm:grid-cols-4"
    >
      {VOTE_OPTIONS.map(option => (
        <button
          key={option.id}
          type="button"
          aria-pressed={vote === option.id}
          aria-disabled={enabled ? undefined : true}
          aria-keyshortcuts={option.shortcut}
          onClick={() => {
            if (enabled) onVote(option.id);
          }}
          className={cn(
            'flex h-12 min-w-0 press items-center justify-between gap-2 rounded-md border px-3 text-ui font-medium text-fg sm:h-14 sm:px-4',
            'transition-[background-color,border-color,opacity,box-shadow] duration-(--dur-fast) ease-out-expo',
            'aria-disabled:cursor-default aria-disabled:active:scale-100',
            tone[option.id].rest,
            tone[option.id].picked,
            !enabled && vote !== option.id && 'opacity-70',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {option.id === 'a' || option.id === 'b' ? (
              <span
                aria-hidden="true"
                className={cn('inline-flex', vote === option.id && 'hidden')}
              >
                <RoleBadge who={option.id} letterOnly size="sm" />
              </span>
            ) : null}
            <span className="truncate">{option.label}</span>
          </span>
          <kbd
            aria-hidden="true"
            className="rounded-sm border border-current/25 px-1.5 py-0.5 numeric text-caption leading-none opacity-70"
          >
            {option.shortcut}
          </kbd>
        </button>
      ))}
    </div>
  );
}
