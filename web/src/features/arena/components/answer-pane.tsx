import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils/cn';

import { Markdown } from './markdown';
import { PaneHeader, type PaneSide } from './pane-header';
import { type LiveStats, LiveReadout, StreamMeter } from './stream-meter';

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
  /** Streaming progress and, when the names may be shown, speed and length (stream-meter.tsx). */
  live?: LiveStats;
  /** Under the body: the metrics once the names may be shown (pane-metrics.tsx). */
  footer?: ReactNode;
  /** Replaces the body (loading, error). */
  children?: ReactNode;
  className?: string;
}

const EDGE = {
  a: { chosen: 'bg-mind-a', busy: 'bg-mind-a/35' },
  b: { chosen: 'bg-mind-b', busy: 'bg-mind-b/35' },
  solo: { chosen: 'bg-fg-soft', busy: 'bg-fg-soft/35' },
} as const;

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
  live,
  footer,
  children,
  className,
}: AnswerPaneProps) {
  const headingId = useId();
  const accent = side === 'b' ? 'mind-b' : side === 'a' ? 'mind-a' : 'fg-soft';
  const edge = EDGE[side];
  const glow = side === 'a' ? 'glow-a' : 'glow-b';

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={generating || undefined}
      data-side={side}
      data-chosen={chosen ? '' : undefined}
      className={cn(
        'relative isolate flex min-w-0 flex-col rounded-xl transition-[opacity,transform,box-shadow] duration-(--dur-slow) ease-out-expo',
        // The winner lifts a few pixels and glows in its own colour; the other steps back.
        chosen && side !== 'solo' && ['motion-safe:-translate-y-1', glow],
        dimmed && 'saturate-50',
        className,
      )}
    >
      {/* The edge: a hairline at rest, a light that circles the pane while it is being written. */}
      <span
        aria-hidden="true"
        data-testid={generating ? 'pane-edge' : undefined}
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl',
          chosen && side !== 'solo' ? edge.chosen : generating ? edge.busy : 'bg-line',
        )}
      >
        {generating ? (
          <span
            className="absolute -inset-[70%] hidden motion-safe:block motion-safe:animate-spin"
            style={{
              animationDuration: '3.6s',
              background: `conic-gradient(from 0deg, transparent 0 62%, var(--${accent}) 88%, transparent 100%)`,
            }}
          />
        ) : null}
      </span>
      <div className="m-px flex min-w-0 flex-1 flex-col rounded-[calc(var(--radius-xl)-1px)] bg-surface">
        <PaneHeader
          side={side}
          revealing={revealing}
          live={generating}
          headingId={headingId}
          modelLabel={modelLabel}
          hiddenNote={hiddenNote}
          chosen={chosen}
          {...(pickLabel === undefined ? {} : { pickLabel })}
          trailing={live && generating ? <LiveReadout stats={live} /> : null}
          // Nothing final to copy while it arrives, in a loading or error body, or when empty.
          copyText={streaming || generating || children || text.trim() === '' ? null : text}
        />
        <StreamMeter side={side} stats={live} active={generating} />
        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5 sm:py-5">
          {children ?? (
            <>
              <Markdown streaming={streaming} className="answer-prose max-w-[72ch]">
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
      </div>
    </section>
  );
}
