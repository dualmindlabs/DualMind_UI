import { EyeOff } from 'lucide-react';

import { RoleBadge } from '@/components/ui/role-badge';
import { DecryptedText } from '@/components/vendor/reactbits/decrypted-text';
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
  chosen?: boolean;
  /** The words on the chosen pane's mark: "Your pick" for the voter, "Picked" on a share page. */
  pickLabel?: string;
  /** The name decrypts once (the reveal). */
  revealing?: boolean;
  /** The text the copy button copies; null hides the button (nothing final to copy yet). */
  copyText: string | null;
}

/**
 * The pane's header on a 10% role tint, always one row so both panes line up: the A or B letter
 * (colour is never the only signal), the heading, the model's name once it may be shown, the
 * pick mark and copy. Timing and length live in the pane's footer (pane-metrics.tsx).
 *
 * Once a battle pane shows its model, the name takes the visible title's place (the letter still
 * says which side; screen readers still hear "Answer A, <name>"). A name too long for the pane
 * ends in an ellipsis, with the full name in its tooltip; the pick mark never shrinks, so the
 * name can never run under it.
 */
export function PaneHeader({
  side,
  headingId,
  modelLabel,
  hiddenNote = 'Name hidden',
  chosen = false,
  pickLabel = 'Your pick',
  revealing = false,
  copyText,
}: PaneHeaderProps) {
  const style = SIDE_STYLES[side];
  const named = modelLabel !== null && side !== 'solo';

  return (
    <header
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-t-[13px] border-b border-line px-3 py-2 sm:px-4',
        style.tint,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {side === 'solo' ? null : <RoleBadge who={side} letterOnly />}
        <h3 id={headingId} className="flex min-w-0 items-baseline gap-2 text-ui">
          <span className={cn('shrink-0 font-semibold', style.text, named && 'sr-only')}>
            {style.title}
          </span>
          {modelLabel ? (
            <span
              className="min-w-0 truncate font-medium text-fg"
              data-testid="pane-model"
              title={modelLabel}
            >
              <span className="sr-only">, </span>
              {revealing ? (
                // Inline and on one line, so the ellipsis applies while the name decrypts too.
                <DecryptedText
                  text={modelLabel}
                  animateOn="mount"
                  sequential
                  speed={28}
                  className="inline whitespace-nowrap"
                  encryptedClassName="text-muted"
                />
              ) : (
                modelLabel
              )}
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
          <span
            data-testid="pane-pick"
            className="shrink-0 rounded-full border border-human/50 bg-human-tint px-2 py-0.5 eyebrow whitespace-nowrap text-human"
          >
            {pickLabel}
          </span>
        ) : null}
      </div>
      {copyText === null ? null : (
        <CopyButton text={copyText} label={`Copy ${style.title}`} className="shrink-0" />
      )}
    </header>
  );
}
