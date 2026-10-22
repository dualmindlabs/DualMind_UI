import { Scale } from 'lucide-react';
import { useId } from 'react';

import { displayNameFromModelName } from '@/lib/api';

import { type PaneData, paneMetrics, type TurnData, VOTE_LABELS } from '../lib/turns';
import { AnswerPane } from './answer-pane';
import { PaneMetrics } from './pane-metrics';
import { PanePair } from './pane-pair';
import { PromptCard } from './prompt-card';

export interface TurnViewProps {
  turn: TurnData;
  /** Display names by `modelName`, from the model catalogue. */
  names: ReadonlyMap<string, string>;
  /**
   * Who reads it: the thread's owner in the arena ("Your verdict"), or anyone on a share page
   * ("Verdict", "Picked"), where nothing speaks to the reader as the voter.
   */
  audience?: 'owner' | 'public';
}

const COPY = {
  owner: {
    verdict: 'Your verdict:',
    pick: 'Your pick',
    hidden: 'Hidden, not voted',
    noVote: 'No vote on this battle yet, so both names stay hidden.',
  },
  public: {
    verdict: 'Verdict:',
    pick: 'Picked',
    hidden: 'Hidden: no vote',
    noVote: 'Nobody voted on this battle, so both models stay anonymous.',
  },
} as const;

function metrics(pane: PaneData) {
  return <PaneMetrics items={paneMetrics({ text: pane.text, timeMs: pane.timeMs })} />;
}

function label(pane: PaneData, names: ReadonlyMap<string, string>): string | null {
  if (!pane.modelName) return null;
  return names.get(pane.modelName) ?? displayNameFromModelName(pane.modelName);
}

/**
 * One past turn of a thread: the prompt, then the answers (two panes in Battle and Side by side,
 * one in Direct), with the visitor's verdict when there is one. Read-only here: voting on a
 * battle happens in the live flow.
 */
export function TurnView({ turn, names, audience = 'owner' }: TurnViewProps) {
  const promptId = useId();
  const verdict = turn.vote === null ? null : VOTE_LABELS[turn.vote];
  const copy = COPY[audience];
  const hiddenNote = copy.hidden;

  return (
    <article aria-labelledby={promptId} className="grid gap-8" data-testid="turn">
      <PromptCard id={promptId} number={turn.number} prompt={turn.prompt} />
      {turn.b === null ? (
        <AnswerPane
          side="solo"
          text={turn.a.text}
          modelLabel={label(turn.a, names)}
          footer={metrics(turn.a)}
        />
      ) : (
        <PanePair
          label={`Answers to prompt ${turn.number}`}
          a={
            <AnswerPane
              side="a"
              text={turn.a.text}
              modelLabel={turn.revealed ? label(turn.a, names) : null}
              hiddenNote={hiddenNote}
              footer={turn.revealed ? metrics(turn.a) : null}
              chosen={turn.vote === 'left'}
              pickLabel={copy.pick}
            />
          }
          b={
            <AnswerPane
              side="b"
              text={turn.b.text}
              modelLabel={turn.revealed ? label(turn.b, names) : null}
              hiddenNote={hiddenNote}
              footer={turn.revealed ? metrics(turn.b) : null}
              chosen={turn.vote === 'right'}
              pickLabel={copy.pick}
            />
          }
        />
      )}
      {verdict ? (
        <p
          className="mx-auto flex w-full max-w-[42rem] items-center gap-2 text-ui-sm text-fg-soft"
          data-testid="turn-verdict"
        >
          <Scale aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
          {copy.verdict} <span className="font-medium text-human">{verdict}</span>
        </p>
      ) : turn.b !== null && !turn.revealed ? (
        <p className="text-ui-sm text-muted">{copy.noVote}</p>
      ) : null}
    </article>
  );
}
