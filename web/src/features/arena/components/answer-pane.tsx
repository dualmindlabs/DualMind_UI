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
  /** The visitor picked this answer: the pane's own colour glows, with a "Your pick" mark. */
  chosen?: boolean;
  /** A verdict is in and this pane did not win: it steps back (a tie or "both bad" dims both). */
  dimmed?: boolean;
  /** The mark's words; "Your pick" unless a share page says otherwise. */
  pickLabel?: string;
  /** True while the text is still arriving. */
  streaming?: boolean;
  /** The model is working: a light runs under the header (a state, not decoration). */
  generating?: boolean;
  /** The name just became visible: its plate turns over once, and the chosen pane settles. */
  revealing?: boolean;
  /** Under the body: the metrics once the names may be shown (pane-metrics.tsx). */
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
  chosen = false,
  dimmed = false,
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
      aria-busy={generating || undefined}
      data-side={side}
      data-chosen={chosen ? '' : undefined}
      className={cn(
        'relative flex min-w-0 flex-col transition-[opacity] duration-(--dur-slow) ease-out-expo',
        // No box: the answer sits on the page. A short rule in the mind's colour marks the side;
        // a verdict that went the other way lets the answer step back.
        dimmed && 'opacity-60 saturate-50',
        className,
      )}
    >
      <PaneHeader
        side={side}
        revealing={revealing}
        live={generating}
        headingId={headingId}
        modelLabel={modelLabel}
        hiddenNote={hiddenNote}
        chosen={chosen}
        {...(pickLabel === undefined ? {} : { pickLabel })}
        // Nothing final to copy while it arrives, in a loading or error body, or when empty.
        copyText={streaming || generating || children || text.trim() === '' ? null : text}
      />
      <div
        aria-hidden="true"
        className="bg-line-subtle relative h-0.5 overflow-hidden rounded-full"
        data-testid={generating ? 'pane-progress' : undefined}
      >
        <span
          className={cn(
            'absolute inset-y-0 left-0 w-16 rounded-full transition-[width] duration-(--dur-slow) ease-out-expo',
            side === 'b' ? 'bg-mind-b' : side === 'a' ? 'bg-mind-a' : 'bg-fg-soft',
            generating && 'w-full -translate-x-full motion-safe:animate-skeleton',
            !generating && chosen && 'w-full',
          )}
        />
      </div>
      <div className="min-w-0 flex-1 py-8 sm:py-10">
        {children ?? (
          <>
            <Markdown
              streaming={streaming}
              className="answer-prose max-w-[66ch] text-[1.0625rem]! leading-[1.8]! sm:text-[1.125rem]!"
            >
              {text}
            </Markdown>
            {streaming ? (
              <span
                aria-hidden="true"
                data-testid="stream-caret"
                className={cn(
                  'mt-1 inline-block h-[1.1em] w-0.5 translate-y-[0.2em] rounded-full motion-safe:animate-caret',
                  side === 'b' ? 'bg-mind-b' : 'bg-mind-a',
                )}
              />
            ) : null}
          </>
        )}
      </div>
      {footer}
    </section>
  );
}
