import { EyeOff } from 'lucide-react';

import { RoleBadge } from '@/components/ui/role-badge';
import { cn } from '@/lib/utils/cn';

import { CopyButton } from './copy-button';

/** Mind A (left or top), Mind B (right or below), or the one model of a Direct chat. */
export type PaneSide = 'a' | 'b' | 'solo';

const SIDE_STYLES: Record<PaneSide, { tint: string; text: string; title: string }> = {
  a: { tint: 'bg-mind-a-tint', text: 'text-mind-a', title: 'Answer A' },
  b: { tint: 'bg-mind-b-tint', text: 'text-mind-b-text', title: 'Answer B' },
  solo: { tint: 'bg-surface-2', text: 'text-fg', title: 'Answer' },
};

export interface PaneHeaderProps {
  side: PaneSide;
  headingId: string;
  modelLabel: string | null;
  hiddenNote?: string | undefined;
  meta?: string | null | undefined;
  chosen?: boolean;
  /** The text the copy button copies; null hides the button (nothing final to copy yet). */
  copyText: string | null;
}

/**
 * The pane's header on a 10% role tint: the A or B letter (colour is never the only signal),
 * the heading, the model's name once it may be shown, timing and length, and copy.
 */
export function PaneHeader({
  side,
  headingId,
  modelLabel,
  hiddenNote = 'Name hidden',
  meta,
  chosen = false,
  copyText,
}: PaneHeaderProps) {
  const style = SIDE_STYLES[side];

  return (
    <header
      className={cn(
        'flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-3 py-2 sm:px-4',
        style.tint,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {side === 'solo' ? null : <RoleBadge who={side} letterOnly />}
        <h3 id={headingId} className="flex min-w-0 items-baseline gap-2 text-ui">
          <span className={cn('shrink-0 font-semibold', style.text)}>{style.title}</span>
          {modelLabel ? (
            <span className="truncate font-medium text-fg" data-testid="pane-model">
              <span className="sr-only">, </span>
              {modelLabel}
            </span>
          ) : side === 'solo' ? null : (
            <span className="inline-flex items-center gap-1 text-caption text-muted">
              <EyeOff aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              <span className="sr-only">, </span>
              {hiddenNote}
            </span>
          )}
        </h3>
        {chosen ? (
          <span className="shrink-0 rounded-full border border-human/50 bg-human-tint px-2 py-0.5 eyebrow text-human">
            Your pick
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        {meta ? (
          <p className="font-mono text-caption whitespace-nowrap text-muted tabular-nums">{meta}</p>
        ) : null}
        {copyText === null ? null : <CopyButton text={copyText} label={`Copy ${style.title}`} />}
      </div>
    </header>
  );
}
