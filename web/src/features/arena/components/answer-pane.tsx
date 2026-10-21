import { type ReactNode, useId } from 'react';

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
  /** True while the text is still arriving. */
  streaming?: boolean;
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
  streaming = false,
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
        'flex min-w-0 flex-col overflow-hidden rounded-lg border bg-surface shadow-raise',
        chosen ? 'border-human ring-1 ring-human/40' : 'border-line',
        className,
      )}
    >
      <PaneHeader
        side={side}
        headingId={headingId}
        modelLabel={modelLabel}
        hiddenNote={hiddenNote}
        meta={meta}
        chosen={chosen}
        copyText={streaming || children ? null : text}
      />
      <div className="min-w-0 px-4 py-4 sm:px-5">
        {children ?? (
          <Markdown streaming={streaming} className="answer-prose max-w-[72ch]">
            {text}
          </Markdown>
        )}
      </div>
    </section>
  );
}
