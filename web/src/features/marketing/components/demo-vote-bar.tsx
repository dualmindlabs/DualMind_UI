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

/**
 * The verdict row of the demo: A is better, Tie, Both are bad, B is better, with the 1 to 4
 * shortcuts. The buttons use aria-disabled (not disabled) while the answers appear and after the
 * vote, so keyboard focus never falls out of the demo. The choice turns terra: the human's colour.
 */
export function DemoVoteBar({ enabled, vote, onVote, groupRef }: DemoVoteBarProps) {
  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Your verdict"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
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
            'flex h-12 min-w-0 items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3 text-ui font-medium text-fg sm:px-4',
            'transition-[background-color,border-color,opacity,scale] duration-(--dur-fast) ease-out-expo',
            'hover:bg-surface-3 active:scale-[0.98] aria-disabled:cursor-default aria-disabled:hover:bg-surface aria-disabled:active:scale-100',
            'aria-pressed:border-human aria-pressed:bg-human-tint',
            !enabled && vote !== option.id && 'opacity-60',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {option.id === 'a' || option.id === 'b' ? (
              <span aria-hidden="true" className="inline-flex">
                <RoleBadge who={option.id} letterOnly size="sm" />
              </span>
            ) : null}
            <span className="truncate">{option.label}</span>
          </span>
          <kbd
            aria-hidden="true"
            className="rounded-sm border border-line px-1.5 py-0.5 text-caption leading-none text-muted"
          >
            {option.shortcut}
          </kbd>
        </button>
      ))}
    </div>
  );
}
