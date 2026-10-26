import { Lock } from 'lucide-react';

import { RoleBadge } from '@/components/ui/role-badge';
import { DecryptedText } from '@/components/vendor/reactbits/decrypted-text';
import { cn } from '@/lib/utils/cn';

import type { DemoSide } from '../content/demo';

interface DemoAnswerPaneProps {
  side: DemoSide;
  words: string[];
  /** Words on screen during the reveal; the rest keeps its space so nothing jumps. */
  shown: number;
  streaming: boolean;
  revealed: boolean;
  /** What the reveal shows instead of a model name. */
  revealLabel: string;
  chosen: boolean;
}

const letters = { a: 'A', b: 'B' } as const;

/**
 * One answer of the demo battle, in the arena's pane: a tinted surface with its role rule, the A
 * or B header, a progress hairline while the answer appears, the decrypted reveal after the vote
 * and the winner's glow on the pane you picked (a shadow, so nothing repaints). Screen readers get
 * the whole answer at once.
 */
export function DemoAnswerPane({
  side,
  words,
  shown,
  streaming,
  revealed,
  revealLabel,
  chosen,
}: DemoAnswerPaneProps) {
  const headingId = `demo-answer-${side}`;
  const text = words.join(' ');
  const visible = shown >= words.length ? text : words.slice(0, shown).join(' ');
  const progress = words.length === 0 ? 1 : Math.min(1, shown / words.length);

  return (
    <section
      aria-labelledby={headingId}
      data-testid={`demo-pane-${side}`}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden p-4 transition-shadow duration-(--dur-slow) ease-out-expo sm:p-6',
        side === 'a' ? 'surface-a' : 'surface-b',
        chosen && (side === 'a' ? 'glow-a' : 'glow-b'),
      )}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 id={headingId} className="flex items-center gap-2.5 text-ui font-semibold">
          <span aria-hidden="true" className="inline-flex">
            <RoleBadge who={side} letterOnly />
          </span>
          <span className="text-fg">Answer {letters[side]}</span>
        </h3>
        {chosen ? (
          <span className="rounded-full border border-human/50 bg-human-tint px-2.5 py-1 eyebrow text-human">
            Your pick
          </span>
        ) : (
          <span className="numeric text-caption text-muted">
            {streaming ? (
              <span className="inline-flex items-center gap-1.5">
                Writing
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-block h-3.5 w-0.5 animate-caret',
                    side === 'a' ? 'bg-mind-a' : 'bg-mind-b-text',
                  )}
                />
              </span>
            ) : (
              `${words.length} words`
            )}
          </span>
        )}
      </div>

      <p className="mt-3 flex min-h-5 items-center gap-1.5 font-mono text-caption">
        {revealed ? (
          <span className="text-fg">
            <span className="text-muted">Revealed: </span>
            <DecryptedText
              text={revealLabel}
              animateOn="mount"
              sequential
              speed={26}
              encryptedClassName="text-muted"
            />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Lock aria-hidden="true" className="size-3" strokeWidth={2} />
            Name hidden until you vote
          </span>
        )}
      </p>

      <div className="relative mt-4 text-body text-fg-soft">
        <p className="sr-only">{text}</p>
        <p aria-hidden="true" className="invisible">
          {text}
        </p>
        <p aria-hidden="true" className="absolute inset-0" data-testid={`demo-text-${side}`}>
          {visible}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="mt-5 block h-0.5 w-full overflow-hidden rounded-full bg-line"
      >
        <span
          style={{ transform: `scaleX(${progress.toFixed(3)})` }}
          className={cn(
            'block h-full origin-left transition-opacity duration-(--dur-slow)',
            side === 'a' ? 'bg-mind-a' : 'bg-mind-b',
            streaming ? 'opacity-100' : 'opacity-40',
          )}
        />
      </span>
    </section>
  );
}
