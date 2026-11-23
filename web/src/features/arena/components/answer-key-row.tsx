import { Check, KeyRound, X } from 'lucide-react';
import { useId } from 'react';

import type { AnswerKey } from '@/lib/api';

const SIDES = [
  { slot: 1, letter: 'A' },
  { slot: 2, letter: 'B' },
] as const;

/**
 * Truth vs Taste (backend PR 70): after the vote on a question with a known answer, the answer
 * key. The expected answer in Geist Mono, then for each side whether it matched, with a check or a
 * cross and the words, so it never leans on colour. A and B keep their own colours' absence here:
 * nothing is green or red. The vote already counted before this appeared; this row only reports.
 * It renders only when the vote response carried a key, so an ordinary battle looks as before.
 */
export function AnswerKeyRow({ answerKey }: { answerKey: AnswerKey }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      data-testid="answer-key"
      className="grid w-full gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 text-start"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3
          id={titleId}
          className="inline-flex items-center gap-2 font-mono text-label tracking-[0.1em] text-muted uppercase"
        >
          <KeyRound aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          Answer key
        </h3>
        {answerKey.sample ? (
          <span className="rounded-sm border border-line-strong px-1.5 py-px font-mono text-label tracking-[0.1em] text-fg-soft uppercase">
            Sample question
          </span>
        ) : null}
      </div>

      <p className="text-ui-sm text-fg-soft">
        This question has one right answer:{' '}
        <span data-testid="answer-key-answer" className="font-mono font-medium text-fg">
          {answerKey.answer}
        </span>
      </p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {SIDES.map(({ slot, letter }) => {
          const side = answerKey.sides.find(item => item.slot === slot);
          if (side === undefined) return null;
          const Icon = side.correct ? Check : X;
          return (
            <li
              key={slot}
              data-testid={`answer-key-side-${letter.toLowerCase()}`}
              data-correct={side.correct ? '' : undefined}
              className="flex min-w-0 items-start gap-2.5 rounded-md border border-line bg-surface-2 px-3 py-2"
            >
              <Icon aria-hidden="true" strokeWidth={2} className="mt-0.5 size-4 shrink-0 text-fg" />
              <span className="grid min-w-0 gap-0.5 text-ui-sm">
                <span className="font-medium text-fg">
                  Answer {letter}: {side.correct ? 'matched the key' : 'did not match the key'}
                </span>
                {side.extracted ? (
                  <span className="min-w-0 font-mono text-caption [overflow-wrap:anywhere] text-muted">
                    read as {side.extracted}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-caption text-muted">
        Model names stay hidden on a question with a known answer.
      </p>
    </section>
  );
}
