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
    if (active === null || active === document.body) {
      panel.current?.focus({ preventScroll: true });
      // The payoff may be a long answer away: bring the card to the middle of the screen.
      if (typeof panel.current?.scrollIntoView === 'function') {
        panel.current.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  }, [reduce]);

  if (turn.vote === null) return null;
  const shareId = battle.state.threadId ?? threadId;
  const pending = turn.votePending && battle.pendingVotes > 0;
  const sides = [
    { side: 'a', answer: turn.a, picked: turn.vote === 'left' },
    { side: 'b', answer: turn.b, picked: turn.vote === 'right' },
  ] as const;
  const decided = turn.vote === 'left' || turn.vote === 'right';

  return (
    <div
      ref={panel}
      role="group"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-testid="reveal-panel"
      className="relative mx-auto grid w-full max-w-2xl justify-items-center gap-9 py-10 outline-none motion-safe:animate-fade-in sm:py-14"
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-x-[20vw] -top-10 -z-10 h-80 [mask-image:linear-gradient(to_bottom,#000,transparent)]',
          turn.vote === 'left' && 'mesh-a',
          turn.vote === 'right' && 'mesh-b',
          !decided && 'mesh-duel opacity-60',
        )}
      />
      <div className="grid justify-items-center gap-3 text-center">
        <p id={titleId} data-testid="verdict" className="grid justify-items-center gap-2 sm:gap-3">
          <span className="text-ui text-fg-soft">Your verdict:</span>{' '}
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'block text-h2 font-semibold tracking-[-0.04em] text-balance',
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

      <ul
        aria-label="The two models"
        className="grid w-full gap-4 [perspective:1100px] sm:grid-cols-2 sm:gap-5"
      >
        {sides.map(({ side, answer, picked }, index) => {
          const delay = 0.35 + index * 0.18;
          const stepBack = decided && !picked;
          return (
            <li key={side} data-testid="reveal-name" className="grid min-w-0">
              <motion.div
                initial={reduce ? false : { rotateY: 180 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay }}
                style={{ transformStyle: 'preserve-3d' }}
                className="grid min-w-0 [&>*]:col-start-1 [&>*]:row-start-1"
              >
                {/* The face that was up: the card's back, with the letter of the answer. */}
                <div
                  aria-hidden="true"
                  data-letter={side.toUpperCase()}
                  className={cn(
                    'flex min-h-48 [transform:rotateY(180deg)] items-center justify-center rounded-2xl border dot-grid [backface-visibility:hidden]',
                    'text-[5rem] font-semibold tracking-[-0.05em] before:content-[attr(data-letter)]',
                    side === 'a'
                      ? 'border-mind-a-edge bg-mind-a-tint text-mind-a'
                      : 'border-mind-b-edge bg-mind-b-tint text-mind-b-text',
                  )}
                />
                {/* The face that turns up: who it was. */}
                <div
                  className={cn(
                    'grid min-w-0 content-start gap-4 rounded-2xl border p-6 text-left transition-[opacity] duration-(--dur-slow) ease-out-expo [backface-visibility:hidden] sm:p-7',
                    side === 'a' ? 'bg-mind-a-wash' : 'bg-mind-b-wash',
                    picked
                      ? side === 'a'
                        ? 'border-mind-a glow-a'
                        : 'border-mind-b glow-b'
                      : 'border-line',
                    stepBack && 'saturate-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <ModelMark name={nameOf(answer)} who={side} size="lg" />
                    {picked ? (
                      <span className="pt-1 eyebrow whitespace-nowrap text-human">Your pick</span>
                    ) : null}
                  </div>
                  <div className="grid min-w-0 gap-1">
                    <span className="min-w-0 text-h3 font-semibold tracking-tight [overflow-wrap:anywhere] text-fg">
                      {nameOf(answer)}
                    </span>
                    {answer?.model ? (
                      <span className="text-ui text-fg-soft">
                        {modelMaker(answer.model.name, answer.model.provider ?? '').label}
                      </span>
                    ) : null}
                  </div>
                  <ModelRating answer={answer} side={side} />
                </div>
              </motion.div>
            </li>
          );
        })}
      </ul>

      <div className="grid w-full justify-items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          aria-keyshortcuts={shortcutsEnabled ? 'N' : undefined}
          onClick={newBattle}
          className="min-w-52"
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
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
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
        </div>
      </div>
    </div>
  );
}
