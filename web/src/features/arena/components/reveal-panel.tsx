import { CloudOff, MessageSquareText, Plus, Share2, Shuffle } from 'lucide-react';
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
import { ModelRating, RatingOdds } from './model-rating';

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
 * The end of a vote, under the two cards: the verdict as a headline across the middle of the
 * stage, then the two models (name, maker, standing counting up; the pick marked) with a
 * tug-of-war bar that settles on how the board expects the pair to fare, then what comes next.
 * The cards above have already turned over to the model names and the winner glows. Both names
 * are written in full here (the card headers may cut a long name short). Reduced motion:
 * everything is simply there.
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
      className="relative mx-auto grid w-full max-w-3xl justify-items-center gap-8 pt-4 pb-6 text-center outline-none motion-safe:animate-fade-in"
    >
      <div className="grid justify-items-center gap-2">
        <p id={titleId} data-testid="verdict" className="grid justify-items-center gap-1">
          <span className="text-ui-sm font-medium text-fg-soft">Your verdict:</span>{' '}
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.05 }}
            className={cn(
              'text-h2 font-semibold tracking-tight text-balance',
              VERDICT_TONE[turn.vote],
            )}
          >
            {VOTE_LABELS[turn.vote]}
          </motion.span>
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

      <div className="grid w-full gap-5">
        <ul aria-label="The two models" className="grid w-full grid-cols-2 gap-3 sm:gap-8">
          {sides.map(({ side, answer, picked }, index) => (
            <motion.li
              key={side}
              data-testid="reveal-name"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.25 + index * 0.14 }}
              className={cn(
                'grid min-w-0 content-start gap-2',
                side === 'a' ? 'justify-items-start text-start' : 'justify-items-end text-end',
              )}
            >
              <ModelMark name={nameOf(answer)} who={side} size="lg" />
              <span className="min-w-0 text-ui font-semibold tracking-tight [overflow-wrap:anywhere] text-fg">
                {nameOf(answer)}
              </span>
              {answer?.model ? (
                <span className="text-caption text-fg-soft">
                  {modelMaker(answer.model.name, answer.model.provider ?? '').label}
                </span>
              ) : null}
              <ModelRating answer={answer} />
              {picked ? (
                <span className="rounded-full border border-human/50 bg-human-tint px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap text-human">
                  Your pick
                </span>
              ) : null}
            </motion.li>
          ))}
        </ul>
        <RatingOdds a={turn.a} b={turn.b} />
      </div>

      {/* The next steps: three quiet ones, then the one that matters. */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Button
          variant="ghost"
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
            variant="ghost"
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
          size="lg"
          aria-keyshortcuts={shortcutsEnabled ? 'N' : undefined}
          onClick={newBattle}
          className="max-sm:w-full"
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
