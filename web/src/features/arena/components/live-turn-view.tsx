import { CloudOff, FastForward, Scale } from 'lucide-react';
import { useCallback, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { TurnError, UnratedNotice } from './turn-notice';
import { VoteBar, VoteHint } from './vote-bar';

function modelLabel(answer: LiveAnswer | null): string | null {
  const model = answer?.model;
  if (!model) return null;
  return resolveDisplayName(model.name, model.displayName);
}

const WAITING_LINES = ['w-11/12', 'w-full', 'w-4/5', 'w-10/12', 'w-2/3'] as const;

/** Before the first words: staggered skeleton lines (80 ms apart) under a quiet status. */
function Waiting({ mode }: { mode: LiveTurn['mode'] }) {
  return (
    <div className="grid gap-3 py-1" aria-hidden="true">
      <p className="text-ui-sm text-muted">{mode === 'direct' ? 'Writing' : 'Generating'}</p>
      {WAITING_LINES.map((width, index) => (
        <Skeleton
          key={width + index}
          className={`h-3.5 ${width} motion-safe:animate-fade-in`}
          style={{ animationDelay: `${index * 80}ms` }}
        />
      ))}
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
  // A verdict is in: the winner glows (answer-pane), the loser steps back, a tie keeps both.
  const dimmed =
    choice !== null &&
    turn.vote !== null &&
    turn.phase !== 'voting' &&
    (turn.vote === 'both-bad' || (turn.vote !== choice && turn.vote !== 'tie'));
  const revealedNow = turn.mode === 'battle' && turn.phase === 'revealed';

  return (
    <AnswerPane
      side={side}
      text={text}
      modelLabel={shown ? modelLabel(answer) : null}
      {...(turn.unrated === null ? { hiddenNote: 'Hidden until you vote' } : {})}
      chosen={chosen}
      dimmed={dimmed}
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
  // Which answers were read to the end, and whether the visitor chose to vote without that.
  const [read, setRead] = useState({ a: false, b: false });
  const [skipped, setSkipped] = useState(false);
  const markRead = useCallback(
    (side: 'a' | 'b') => setRead(current => ({ ...current, [side]: true })),
    [],
  );
  const optional = turn.mode === 'side';
  const showVote =
    turn.mode !== 'direct' && (turn.phase === 'awaiting_vote' || turn.phase === 'voting');
  // A turn that failed or stopped before any answer has nothing to show in its panes.
  const noAnswers = turn.a === null && (turn.phase === 'error' || turn.phase === 'stopped');

  return (
    <article
      aria-labelledby={promptId}
      className="grid grid-cols-[minmax(0,1fr)] gap-8"
      data-testid="live-turn"
      data-phase={turn.phase}
    >
      <PromptCard id={promptId} number={number} prompt={turn.prompt} />
      {noAnswers ? null : turn.mode === 'direct' ? (
        <LivePane turn={turn} side="solo" answer={turn.a} />
      ) : (
        <PanePair
          label={`Answers to prompt ${number}`}
          writing={{
            a: turn.phase === 'submitting' || turn.phase === 'answering',
            b: turn.phase === 'submitting' || turn.phase === 'answering',
          }}
          ready={turn.phase !== 'submitting' && turn.phase !== 'answering'}
          onRead={markRead}
          keyboard={latest}
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
        <UnratedNotice>{UNRATED_NOTES[turn.unrated]}</UnratedNotice>
      ) : null}
      {showVote && turn.phase === 'awaiting_vote' && !skipped && !(read.a && read.b) ? (
        <VoteHint className="sticky bottom-3 z-10" read={read} onSkip={() => setSkipped(true)} />
      ) : null}
      {showVote && (turn.phase === 'voting' || skipped || (read.a && read.b)) ? (
        <VoteBar
          className="sticky bottom-3 z-10"
          optional={optional}
          chosen={turn.phase === 'voting' ? turn.vote : null}
          error={turn.error}
          onVote={choice => battle.vote(turn.id, choice)}
        />
      ) : null}
      {turn.phase === 'revealed' && turn.vote && latest ? <RevealPanel turn={turn} /> : null}
      {turn.phase === 'revealed' && turn.vote && !latest ? (
        <p
          className="mx-auto flex w-full max-w-[42rem] flex-wrap items-center gap-2 text-ui-sm text-fg-soft"
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
        <TurnError
          kind={turn.errorKind}
          message={turn.error}
          onNewBattle={newBattle}
          onRetry={() => battle.send(turn.prompt, { mode: turn.mode, pair: null })}
        />
      ) : null}
      {turn.phase === 'stopped' ? <p className="text-ui-sm text-muted">Stopped.</p> : null}
    </article>
  );
}
