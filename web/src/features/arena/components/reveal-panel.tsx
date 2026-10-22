import { CloudOff, MessageSquareText, Plus, Scale, Share2, Shuffle } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { ModelMark } from '@/components/ui/model-mark';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { modelMaker, resolveDisplayName } from '@/lib/models/display-name';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import type { LiveAnswer, LiveTurn } from '../lib/battle-machine';
import { VOTE_LABELS } from '../lib/turns';
import { ModelRating } from './model-rating';

function nameOf(answer: LiveAnswer | null): string {
  const model = answer?.model;
  return model ? resolveDisplayName(model.name, model.displayName) : 'Unknown model';
}

const VERDICT_TONE = {
  left: 'text-mind-a',
  right: 'text-mind-b-text',
  tie: 'text-fg',
  'both-bad': 'text-fg',
} as const;

/**
 * The end of a vote, under the newest turn, and the payoff of a blind battle: the verdict as a
 * headline, then the two name plates turning over (A, then B 140 ms later) with the maker, the
 * model's standing on the board counting up, and a glow in the winner's colour; then what comes
 * next: a follow-up on the same pair, a rematch (the same prompt for two other models), sharing,
 * a new battle. Both names are written in full (the pane headers may cut a long name short, and
 * after a long answer they are a screen away). Reduced motion: everything is simply there.
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
  const reduce = useShouldReduceMotion();

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
      className="relative grid gap-5 overflow-hidden surface-float p-4 motion-safe:animate-fade-in sm:p-6"
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-48 [mask-image:linear-gradient(to_bottom,#000,transparent)]',
          turn.vote === 'left' && 'mesh-a',
          turn.vote === 'right' && 'mesh-b',
        )}
      />
      <div className="relative grid gap-1.5">
        <p
          id={titleId}
          data-testid="verdict"
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <span className="inline-flex items-center gap-1.5 eyebrow text-fg-soft">
            <Scale aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
            Your verdict:
          </span>{' '}
          <span
            className={cn(
              'text-h3 font-semibold tracking-tight sm:text-[1.75rem]',
              VERDICT_TONE[turn.vote],
            )}
          >
            {VOTE_LABELS[turn.vote]}
          </span>
        </p>
        {pending ? (
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-warn/60 px-2.5 py-0.5 text-caption text-warn"
            data-testid="vote-pending"
          >
            <CloudOff aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            Saved offline, sends when you reconnect
          </span>
        ) : null}
      </div>

      <ul aria-label="The two models" className="relative grid gap-3 sm:grid-cols-2 sm:gap-4">
        {sides.map(({ side, answer, picked }, index) => (
          <motion.li
            key={side}
            data-testid="reveal-name"
            initial={reduce ? false : { opacity: 0, rotateY: 80, y: 8 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 170, damping: 22, delay: 0.1 + index * 0.14 }}
            style={{ transformPerspective: 800 }}
            className={cn(
              'flex min-w-0 items-start gap-3 rounded-xl border p-3.5 sm:p-4',
              side === 'a' ? 'bg-mind-a-wash' : 'bg-mind-b-wash',
              picked
                ? side === 'a'
                  ? 'border-mind-a glow-a'
                  : 'border-mind-b glow-b'
                : 'border-line',
              !picked && turn.vote !== 'tie' && 'opacity-85',
            )}
          >
            <ModelMark name={nameOf(answer)} who={side} size="lg" />
            <div className="grid min-w-0 flex-1 gap-1">
              <span className="min-w-0 text-ui font-semibold tracking-tight [overflow-wrap:anywhere] text-fg">
                {nameOf(answer)}
              </span>
              {answer?.model ? (
                <span className="text-caption text-fg-soft">
                  {modelMaker(answer.model.name, answer.model.provider ?? '').label}
                </span>
              ) : null}
              <ModelRating answer={answer} />
            </div>
            {picked ? (
              <span className="shrink-0 pt-0.5 eyebrow whitespace-nowrap text-human">
                Your pick
              </span>
            ) : null}
          </motion.li>
        ))}
      </ul>

      {/* Phones: two columns (New battle across both when it would sit alone). Wider: one row,
          New battle at the end. */}
      <div className="relative grid grid-cols-2 gap-2 border-t border-line pt-4 sm:flex sm:flex-wrap sm:items-center">
        <Button
          variant="secondary"
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
            title="The same prompt, two other models"
            onClick={() => rematch(turn.prompt)}
          >
            <Shuffle aria-hidden="true" strokeWidth={1.75} />
            Rematch
          </Button>
        ) : null}
        {shareId ? (
          <Button variant="ghost" onClick={() => openShare(shareId)}>
            <Share2 aria-hidden="true" strokeWidth={1.75} />
            Share this battle
          </Button>
        ) : null}
        <Button
          variant="primary"
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
