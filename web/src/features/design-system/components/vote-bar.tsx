import { useState } from 'react';

import { cn } from '@/lib/utils/cn';

import { voteChoices } from '../lib/demo-battle';
import type { VoteChoice } from '../types';
import { MindBadge } from './mind-badge';

/**
 * The verdict row: A is better, Tie, Both are bad, B is better. Choosing one marks it in the
 * human's terra. In the Arena the shortcuts 1-4 work too; here it is a demo.
 */
export function VoteBar() {
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const chosen = voteChoices.find(item => item.id === choice);

  return (
    <div>
      <div role="group" aria-label="Your verdict" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {voteChoices.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={choice === item.id}
            onClick={() => setChoice(current => (current === item.id ? null : item.id))}
            className={cn(
              'flex h-12 min-w-0 items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3 text-ui font-medium text-fg sm:px-4',
              'transition-[background-color,border-color,transform] duration-(--dur-fast) ease-out-expo hover:bg-surface-2 active:scale-[0.98]',
              'aria-pressed:border-human aria-pressed:bg-human-tint',
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {item.id === 'a' || item.id === 'b' ? (
                <MindBadge role={item.id} className="size-5 text-caption" />
              ) : null}
              <span className="truncate">{item.label}</span>
            </span>
            <kbd
              aria-hidden="true"
              className="rounded-sm border border-line px-1.5 py-0.5 text-caption leading-none text-muted"
            >
              {item.shortcut}
            </kbd>
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-ui-sm text-muted">
        {chosen
          ? `Your verdict: ${chosen.label}. In the Arena, this is when both names are revealed.`
          : 'Your choice turns terra: the colour belongs to you, never to a model.'}
      </p>
    </div>
  );
}
