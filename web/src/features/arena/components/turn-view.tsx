import { Scale } from 'lucide-react';
import { useId } from 'react';

import { displayNameFromModelName } from '@/lib/api';

import {
  countWords,
  formatDuration,
  type PaneData,
  type TurnData,
  VOTE_LABELS,
} from '../lib/turns';
import { AnswerPane } from './answer-pane';
import { PanePair } from './pane-pair';
import { PromptCard } from './prompt-card';

export interface TurnViewProps {
  turn: TurnData;
  /** Display names by `modelName`, from the model catalogue. */
  names: ReadonlyMap<string, string>;
}

function paneMeta(pane: PaneData): string {
  const words = countWords(pane.text);
  return [
    formatDuration(pane.timeMs),
    `${words.toLocaleString('en-US')} ${words === 1 ? 'word' : 'words'}`,
  ]
    .filter(Boolean)
    .join(' · ');
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
export function TurnView({ turn, names }: TurnViewProps) {
  const promptId = useId();
  const verdict = turn.vote === null ? null : VOTE_LABELS[turn.vote];
  const hiddenNote = 'Hidden, not voted';

  return (
    <article aria-labelledby={promptId} className="grid gap-4" data-testid="turn">
      <PromptCard id={promptId} number={turn.number} prompt={turn.prompt} />
      {turn.b === null ? (
        <AnswerPane
          side="solo"
          text={turn.a.text}
          modelLabel={label(turn.a, names)}
          meta={paneMeta(turn.a)}
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
              meta={paneMeta(turn.a)}
              chosen={turn.vote === 'left'}
            />
          }
          b={
            <AnswerPane
              side="b"
              text={turn.b.text}
              modelLabel={turn.revealed ? label(turn.b, names) : null}
              hiddenNote={hiddenNote}
              meta={paneMeta(turn.b)}
              chosen={turn.vote === 'right'}
            />
          }
        />
      )}
      {verdict ? (
        <p className="flex items-center gap-2 text-ui-sm text-fg-soft">
          <Scale aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
          Your verdict: <span className="font-medium text-human">{verdict}</span>
        </p>
      ) : turn.b !== null && !turn.revealed ? (
        <p className="text-ui-sm text-muted">
          No vote on this battle yet, so both names stay hidden.
        </p>
      ) : null}
    </article>
  );
}
