import { CloudOff, MessageSquareText, Plus, Scale, Share2, Shuffle } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { RoleBadge } from '@/components/ui/role-badge';
import { resolveDisplayName } from '@/lib/models/display-name';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import type { LiveAnswer, LiveTurn } from '../lib/battle-machine';
import { VOTE_LABELS } from '../lib/turns';

function nameOf(answer: LiveAnswer | null): string {
  const model = answer?.model;
  return model ? resolveDisplayName(model.name, model.displayName) : 'Unknown model';
}

/**
 * The end of a vote, under the newest turn: the verdict, both names in full (the pane headers
 * may cut a long name short, and after a long answer they are a screen away) and what comes next:
 * a follow-up on the same pair, a rematch (the same prompt for two other models), sharing, a new
 * battle.
 *
 * The vote bar leaves when the vote lands, and focus would fall back to the page. When it does,
 * it moves here instead (a group named by the verdict), so Tab continues with the next steps; the
 * arena's live region has already said the verdict and both names. Focus elsewhere stays put.
 */
export function RevealPanel({ turn }: { turn: LiveTurn }) {
  const { focusComposer, newBattle, rematch, openShare, threadId, battle, shortcutsEnabled } =
    useArena();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const active = document.activeElement;
    if (active === null || active === document.body) panel.current?.focus();
  }, []);

  if (turn.vote === null) return null;
  const shareId = battle.state.threadId ?? threadId;
  const pending = turn.votePending && battle.pendingVotes > 0;
  const sides = [
    { side: 'a', answer: turn.a, picked: turn.vote === 'left' },
    { side: 'b', answer: turn.b, picked: turn.vote === 'right' },
  ] as const;

  return (
    <div
      ref={panel}
      role="group"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-testid="reveal-panel"
      className="grid gap-3 rounded-xl border border-line bg-surface p-3 shadow-raise motion-safe:animate-fade-in sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p
          id={titleId}
          data-testid="verdict"
          className="flex items-center gap-2 text-ui-sm text-fg-soft"
        >
          <Scale aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
          Your verdict: <span className="font-medium text-human">{VOTE_LABELS[turn.vote]}</span>
        </p>
        {pending ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-warn/60 px-2.5 py-0.5 text-caption text-warn"
            data-testid="vote-pending"
          >
            <CloudOff aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            Saved offline, sends when you reconnect
          </span>
        ) : null}
      </div>

      <ul aria-label="The two models" className="grid gap-2 sm:grid-cols-2">
        {sides.map(({ side, answer, picked }) => (
          <li
            key={side}
            data-testid="reveal-name"
            className={cn(
              'flex min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2',
              picked ? 'border-human/50 bg-human-tint' : 'border-line bg-surface-2',
            )}
          >
            <RoleBadge who={side} letterOnly size="sm" className="mt-px" />
            <span className="min-w-0 text-ui-sm font-medium [overflow-wrap:anywhere] text-fg">
              {nameOf(answer)}
            </span>
            {picked ? (
              <span className="ms-auto shrink-0 pt-0.5 eyebrow whitespace-nowrap text-human">
                Your pick
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Phones: two columns (New battle across both when it would sit alone). Wider: one row,
          New battle at the end. */}
      <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:flex sm:flex-wrap sm:items-center">
        <Button
          variant="secondary"
          size="sm"
          aria-keyshortcuts={shortcutsEnabled ? '/' : undefined}
          onClick={focusComposer}
        >
          <MessageSquareText aria-hidden="true" strokeWidth={1.75} />
          Ask a follow-up
          {shortcutsEnabled ? (
            <Kbd aria-hidden="true" className="hidden sm:inline-flex">
              /
            </Kbd>
          ) : null}
        </Button>
        {turn.mode === 'battle' ? (
          <Button
            variant="secondary"
            size="sm"
            title="The same prompt, two other models"
            onClick={() => rematch(turn.prompt)}
          >
            <Shuffle aria-hidden="true" strokeWidth={1.75} />
            Rematch
          </Button>
        ) : null}
        {shareId ? (
          <Button variant="ghost" size="sm" onClick={() => openShare(shareId)}>
            <Share2 aria-hidden="true" strokeWidth={1.75} />
            Share this battle
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          aria-keyshortcuts={shortcutsEnabled ? 'N' : undefined}
          onClick={newBattle}
          className="odd:col-span-2 sm:ms-auto"
        >
          <Plus aria-hidden="true" strokeWidth={1.75} />
          New battle
          {shortcutsEnabled ? (
            <Kbd
              aria-hidden="true"
              className="hidden border-current/30 bg-transparent text-current sm:inline-flex"
            >
              N
            </Kbd>
          ) : null}
        </Button>
      </div>
    </div>
  );
}
