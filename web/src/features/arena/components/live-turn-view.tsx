import { CloudOff, FastForward, Plus, RotateCw, Scale } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { TextShimmer } from '@/components/vendor/motion-primitives/text-shimmer';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { resolveDisplayName } from '@/lib/models/display-name';

import { useArena } from '../hooks/use-arena';
import { useRevealText } from '../hooks/use-reveal-text';
import { type LiveAnswer, type LiveTurn, namesShown } from '../lib/battle-machine';
import { UNRATED_NOTES } from '../lib/battle-notes';
import { paneMetrics, VOTE_LABELS } from '../lib/turns';
import { AnswerPane } from './answer-pane';
import { PaneMetrics } from './pane-metrics';
import { PanePair } from './pane-pair';
import { PromptCard } from './prompt-card';
import { RevealPanel } from './reveal-panel';
import { VoteBar } from './vote-bar';

function modelLabel(answer: LiveAnswer | null): string | null {
  const model = answer?.model;
  if (!model) return null;
  return resolveDisplayName(model.name, model.displayName);
}

function Waiting({ mode }: { mode: LiveTurn['mode'] }) {
  return (
    <div className="grid gap-2.5 py-1" aria-hidden="true">
      <TextShimmer className="text-ui-sm" duration={1.6}>
        {mode === 'direct' ? 'Writing' : 'Generating'}
      </TextShimmer>
      <div className="h-3 w-11/12 rounded-sm bg-surface-3" />
      <div className="h-3 w-4/5 rounded-sm bg-surface-3" />
      <div className="h-3 w-2/3 rounded-sm bg-surface-3" />
    </div>
  );
}

interface PaneProps {
  turn: LiveTurn;
  side: 'a' | 'b' | 'solo';
  answer: LiveAnswer | null;
}

function LivePane({ turn, side, answer }: PaneProps) {
  const reduce = useShouldReduceMotion();
  const revealing = turn.phase === 'answering' && turn.mode !== 'direct' && !reduce;
  const text = useRevealText(answer?.text ?? '', turn.answeredAt, revealing);
  const shown = namesShown(turn);
  const choice = side === 'a' ? 'left' : side === 'b' ? 'right' : null;
  const chosen = choice !== null && turn.vote === choice && turn.phase !== 'voting';
  const generating = turn.phase === 'submitting' || turn.phase === 'answering';
  const revealedNow = turn.mode === 'battle' && turn.phase === 'revealed';

  return (
    <AnswerPane
      side={side}
      text={text}
      modelLabel={shown ? modelLabel(answer) : null}
      {...(turn.unrated === null ? { hiddenNote: 'Hidden until you vote' } : {})}
      chosen={chosen}
      streaming={generating && answer !== null}
      generating={generating}
      revealing={revealedNow}
      footer={
        // Blind integrity: timing, length and tokens hint at the model, so they wait for the
        // reveal (and for the whole text).
        answer && shown && !generating ? (
          <PaneMetrics
            items={paneMetrics({
              text: answer.text,
              timeMs: answer.responseTimeMs,
              tokens: answer.usage?.completionTokens,
            })}
          />
        ) : null
      }
    >
      {turn.phase === 'submitting' || (generating && answer === null) ? (
        <Waiting mode={turn.mode} />
      ) : undefined}
    </AnswerPane>
  );
}

/**
 * A turn of this session: the prompt, the panes in every state (waiting with a Border Beam, the
 * progressive reveal with Show all, the vote, the reveal with decrypting names, a one-shot charge
 * on the chosen pane and the metrics), the next steps after the newest vote, the error with a
 * retry, and the offline vote chip.
 */
export function LiveTurnView({
  turn,
  number,
  latest = false,
}: {
  turn: LiveTurn;
  number: number;
  /** The newest turn of the session: after its vote it offers the next steps (reveal-panel). */
  latest?: boolean;
}) {
  const promptId = useId();
  const { battle, newBattle } = useArena();
  const optional = turn.mode === 'side';
  const showVote =
    turn.mode !== 'direct' && (turn.phase === 'awaiting_vote' || turn.phase === 'voting');
  // A turn that failed or stopped before any answer has nothing to show in its panes.
  const noAnswers = turn.a === null && (turn.phase === 'error' || turn.phase === 'stopped');

  return (
    <article
      aria-labelledby={promptId}
      className="grid gap-4"
      data-testid="live-turn"
      data-phase={turn.phase}
    >
      <PromptCard id={promptId} number={number} prompt={turn.prompt} />
      {noAnswers ? null : turn.mode === 'direct' ? (
        <LivePane turn={turn} side="solo" answer={turn.a} />
      ) : (
        <PanePair
          label={`Answers to prompt ${number}`}
          a={<LivePane turn={turn} side="a" answer={turn.a} />}
          b={<LivePane turn={turn} side="b" answer={turn.b} />}
        />
      )}
      {turn.phase === 'answering' && turn.mode !== 'direct' ? (
        <Button
          variant="ghost"
          size="xs"
          className="justify-self-center"
          onClick={() => battle.showAll(turn.id)}
        >
          <FastForward aria-hidden="true" strokeWidth={1.75} />
          Show all
        </Button>
      ) : null}
      {turn.unrated !== null && turn.mode !== 'direct' ? (
        <p className="text-ui-sm text-fg-soft" data-testid="unrated-note">
          {UNRATED_NOTES[turn.unrated]}
        </p>
      ) : null}
      {showVote ? (
        <VoteBar
          className="sticky bottom-2 z-10"
          optional={optional}
          chosen={turn.phase === 'voting' ? turn.vote : null}
          error={turn.error}
          onVote={choice => battle.vote(turn.id, choice)}
        />
      ) : null}
      {turn.phase === 'revealed' && turn.vote && latest ? <RevealPanel turn={turn} /> : null}
      {turn.phase === 'revealed' && turn.vote && !latest ? (
        <p
          className="flex flex-wrap items-center gap-2 text-ui-sm text-fg-soft"
          data-testid="verdict"
        >
          <Scale aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
          Your verdict: <span className="font-medium text-human">{VOTE_LABELS[turn.vote]}</span>
          {turn.votePending && battle.pendingVotes > 0 ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-warn/60 px-2.5 py-0.5 text-caption text-warn"
              data-testid="vote-pending"
            >
              <CloudOff aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              Saved offline, sends when you reconnect
            </span>
          ) : null}
        </p>
      ) : null}
      {turn.phase === 'error' ? (
        <div
          role="alert"
          className="grid justify-items-start gap-2 rounded-lg border border-bad/50 bg-surface px-4 py-3"
        >
          {turn.errorKind === 'forbidden' ? (
            <>
              <p className="text-ui-sm text-fg">{turn.error}</p>
              <Button variant="secondary" size="xs" onClick={newBattle}>
                <Plus aria-hidden="true" strokeWidth={1.75} />
                New battle
              </Button>
            </>
          ) : (
            <>
              <p className="text-ui-sm text-fg">The answers did not arrive. {turn.error}</p>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => battle.send(turn.prompt, { mode: turn.mode, pair: null })}
              >
                <RotateCw aria-hidden="true" strokeWidth={1.75} />
                Try again
              </Button>
            </>
          )}
        </div>
      ) : null}
      {turn.phase === 'stopped' ? <p className="text-ui-sm text-muted">Stopped.</p> : null}
    </article>
  );
}
