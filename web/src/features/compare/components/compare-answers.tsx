import { AnswerPane } from '@/features/arena';
import type { CompareResult, CompareSide } from '@/lib/api';

import { formatTime } from '../lib/format';

function Footer({ side }: { side: CompareSide }) {
  const time = formatTime(side.timeMs);
  return (
    <dl className="relative mt-auto flex flex-wrap gap-x-5 gap-y-1 px-5 pt-1 pb-6 font-mono text-caption sm:px-8">
      {side.provider ? (
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted">Maker</dt>
          <dd className="font-medium text-fg">{side.provider}</dd>
        </div>
      ) : null}
      {time ? (
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted">Time</dt>
          <dd className="font-medium text-fg tabular-nums">{time}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function nameOf(side: CompareSide): string {
  return side.displayName ?? side.modelName;
}

/** Both answers side by side (stacked on a phone), names shown. Same panes the arena uses. */
export function CompareAnswers({ result }: { result: CompareResult }) {
  return (
    <div data-testid="compare-answers" className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
      <AnswerPane
        side="a"
        text={result.a.answer}
        modelLabel={nameOf(result.a)}
        footer={<Footer side={result.a} />}
      />
      <AnswerPane
        side="b"
        text={result.b.answer}
        modelLabel={nameOf(result.b)}
        footer={<Footer side={result.b} />}
      />
    </div>
  );
}

/** Two quiet panes while both models work: the same size as the answers, so nothing jumps. */
export function CompareAnswersLoading() {
  return (
    <div
      data-testid="compare-loading"
      aria-busy="true"
      className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6"
    >
      {(['a', 'b'] as const).map(side => (
        <AnswerPane
          key={side}
          side={side}
          text=""
          modelLabel={null}
          hiddenNote="Waiting for the answer"
          generating
        >
          <div className="grid min-h-48 content-start gap-3" aria-hidden="true">
            {[92, 100, 84, 96, 60].map(width => (
              <span
                key={width}
                className="block h-3 rounded-full bg-fg/10"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </AnswerPane>
      ))}
    </div>
  );
}
