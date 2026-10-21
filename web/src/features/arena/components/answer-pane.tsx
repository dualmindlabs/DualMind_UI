import { type ReactNode, useId } from 'react';

import { BorderBeam } from '@/components/vendor/magicui/border-beam';
import { ChargeBorder } from '@/features/marketing';
import { cn } from '@/lib/utils/cn';

import { Markdown } from './markdown';
import { PaneHeader, type PaneSide } from './pane-header';

export interface AnswerPaneProps {
  side: PaneSide;
  /** The answer, as Markdown. */
  text: string;
  /** The model's name for people once it may be shown; null keeps it hidden. */
  modelLabel: string | null;
  /** Why the name is hidden, for the header ("Hidden until you vote"). */
  hiddenNote?: string;
  /** Mono metadata on the right: "1.8 s · 312 words". */
  meta?: string | null;
  /** The visitor picked this answer: a static terra outline and a "Your pick" mark. */
  chosen?: boolean;
  /** The mark's words; "Your pick" unless a share page says otherwise. */
  pickLabel?: string;
  /** True while the text is still arriving. */
  streaming?: boolean;
  /** The model is working: a Border Beam runs around the pane (a state, not decoration). */
  generating?: boolean;
  /** The name just became visible: it decrypts once, and the chosen pane gets the charge. */
  revealing?: boolean;
  /** Under the body: the metrics after a reveal. */
  footer?: ReactNode;
  /** Replaces the body (loading, error). */
  children?: ReactNode;
  className?: string;
}

/**
 * One answer: a labelled region ("Answer A") with the A or B header and the Markdown body. Both
 * panes of a battle use identical typography and no colour that implies good or bad; the only
 * warm colour is the visitor's own pick.
 */
export function AnswerPane({
  side,
  text,
  modelLabel,
  hiddenNote,
  meta,
  chosen = false,
  pickLabel,
  streaming = false,
  generating = false,
  revealing = false,
  footer,
  children,
  className,
}: AnswerPaneProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      data-side={side}
      data-chosen={chosen ? '' : undefined}
      className={cn(
        'relative flex min-w-0 flex-col rounded-lg border bg-surface shadow-raise',
        chosen ? 'border-human ring-1 ring-human/40' : 'border-line',
        className,
      )}
    >
      {generating && side !== 'solo' ? (
        <BorderBeam
          duration={2.4}
          size={120}
          colorFrom={side === 'a' ? '--mind-a' : '--mind-b'}
          colorTo={side === 'a' ? '--mind-a' : '--mind-b'}
        />
      ) : generating ? (
        <BorderBeam duration={2.4} size={120} colorFrom="--mind-a" colorTo="--mind-a" />
      ) : null}
      {chosen && revealing ? <ChargeBorder /> : null}
      <PaneHeader
        side={side}
        revealing={revealing}
        headingId={headingId}
        modelLabel={modelLabel}
        hiddenNote={hiddenNote}
        meta={meta}
        chosen={chosen}
        {...(pickLabel === undefined ? {} : { pickLabel })}
        copyText={streaming || generating || children ? null : text}
      />
      <div className="min-w-0 px-4 py-4 sm:px-5">
        {children ?? (
          <Markdown streaming={streaming} className="answer-prose max-w-[72ch]">
            {text}
          </Markdown>
        )}
      </div>
      {footer}
    </section>
  );
}
