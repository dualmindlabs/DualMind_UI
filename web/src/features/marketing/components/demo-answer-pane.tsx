import { RoleBadge } from '@/components/ui/role-badge';
import { BorderBeam } from '@/components/vendor/magicui/border-beam';
import { DecryptedText } from '@/components/vendor/reactbits/decrypted-text';
import { ShinyText } from '@/components/vendor/reactbits/shiny-text';
import { cn } from '@/lib/utils/cn';

import type { DemoSide } from '../content/demo';
import { ChargeBorder } from './charge-border';

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
 * One answer of the demo battle, in the arena's pane: an A or B header, a Border Beam while the
 * answer appears (glow is a state), the decrypted reveal after the vote and a one-shot electric
 * border on the pane you picked. Screen readers get the whole answer at once.
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

  return (
    <section
      aria-labelledby={headingId}
      data-testid={`demo-pane-${side}`}
      className={cn(
        'relative flex min-w-0 flex-col rounded-lg border bg-surface-2 p-4 shadow-raise transition-colors duration-(--dur-slow) ease-out-expo sm:p-5',
        chosen ? 'border-human' : 'border-line',
      )}
    >
      {streaming ? (
        <BorderBeam
          duration={2.4}
          size={110}
          colorFrom={side === 'a' ? '--mind-a' : '--mind-b'}
          colorTo={side === 'a' ? '--mind-a' : '--mind-b'}
        />
      ) : null}
      {chosen ? <ChargeBorder /> : null}

      <header className="flex min-h-7 items-center justify-between gap-3">
        <h3 id={headingId} className="flex items-center gap-2.5 text-ui font-semibold">
          <span aria-hidden="true" className="inline-flex">
            <RoleBadge who={side} letterOnly />
          </span>
          <span className={side === 'a' ? 'text-mind-a' : 'text-mind-b-text'}>
            Answer {letters[side]}
          </span>
        </h3>
        {chosen ? (
          <span className="rounded-full border border-human/50 bg-human-tint px-2.5 py-1 eyebrow text-human">
            Your pick
          </span>
        ) : (
          <span className="font-mono text-caption text-muted tabular-nums">
            {streaming ? <ShinyText>Writing</ShinyText> : `${words.length} words`}
          </span>
        )}
      </header>

      <p className="mt-3 min-h-5 font-mono text-caption">
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
          <span className="text-muted">Name hidden until you vote</span>
        )}
      </p>

      <div className="relative mt-3 text-body text-fg-soft">
        <p className="sr-only">{text}</p>
        <p aria-hidden="true" className="invisible">
          {text}
        </p>
        <p aria-hidden="true" className="absolute inset-0" data-testid={`demo-text-${side}`}>
          {visible}
        </p>
      </div>
    </section>
  );
}
