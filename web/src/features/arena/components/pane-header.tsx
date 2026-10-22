import { EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

import { RoleBadge } from '@/components/ui/role-badge';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

import { CopyButton } from './copy-button';

/** Mind A (left or top), Mind B (right or below), or the one model of a Direct chat. */
export type PaneSide = 'a' | 'b' | 'solo';

const SIDE_STYLES: Record<PaneSide, { text: string; title: string; dot: string; plate: string }> = {
  a: {
    text: 'text-mind-a',
    title: 'Answer A',
    dot: 'bg-mind-a',
    plate: 'border-mind-a-edge bg-mind-a-tint',
  },
  b: {
    text: 'text-mind-b-text',
    title: 'Answer B',
    dot: 'bg-mind-b',
    plate: 'border-mind-b-edge bg-mind-b-tint',
  },
  solo: { text: 'text-fg', title: 'Answer', dot: 'bg-fg-soft', plate: 'border-line bg-surface-2' },
};

export interface PaneHeaderProps {
  side: PaneSide;
  headingId: string;
  modelLabel: string | null;
  hiddenNote?: string | undefined;
  chosen?: boolean;
  /** The words on the chosen pane's mark: "Your pick" for the voter, "Picked" on a share page. */
  pickLabel?: string;
  /** The name flips onto its plate once (the reveal). */
  revealing?: boolean;
  /** The model is still writing: a pulsing dot and "Writing" replace the blind note. */
  live?: boolean;
  /** The text the copy button copies; null hides the button (nothing final to copy yet). */
  copyText: string | null;
}

/** The model's name on its plate. While `revealing` the plate turns over like a card (once). */
function NamePlate({
  side,
  label,
  revealing,
}: {
  side: PaneSide;
  label: string;
  revealing: boolean;
}) {
  const reduce = useShouldReduceMotion();
  const style = SIDE_STYLES[side];
  const content = (
    <span className="block truncate text-ui font-semibold tracking-tight text-fg">{label}</span>
  );
  return (
    <span
      className="min-w-0 [perspective:600px]"
      data-testid="pane-model"
      title={label}
      style={{ display: 'block' }}
    >
      <span className="sr-only">, </span>
      {revealing && !reduce ? (
        <motion.span
          initial={{ rotateX: -92, opacity: 0, y: 4 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 24,
            delay: side === 'b' ? 0.14 : 0,
          }}
          className={cn(
            'block min-w-0 origin-bottom rounded-sm border px-2 py-0.5 [backface-visibility:hidden]',
            style.plate,
          )}
        >
          {content}
        </motion.span>
      ) : (
        content
      )}
    </span>
  );
}

/**
 * The pane's header, always one row so both panes line up: the A or B letter (colour is never the
 * only signal), the heading, the model's name once it may be shown (on a plate that turns over at
 * the reveal), the pick mark and copy. While the model writes, "Writing" and a pulsing dot say so.
 * Timing and length live in the pane's footer (pane-metrics.tsx).
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
  live = false,
  copyText,
}: PaneHeaderProps) {
  const style = SIDE_STYLES[side];
  const named = modelLabel !== null && side !== 'solo';

  return (
    <header className="flex min-h-12 items-center gap-3 border-b border-line/70 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {side === 'solo' ? null : <RoleBadge who={side} letterOnly />}
        <h3 id={headingId} className="flex min-w-0 flex-1 items-baseline gap-2 text-ui">
          <span
            className={cn('shrink-0 font-semibold tracking-tight', style.text, named && 'sr-only')}
          >
            {style.title}
          </span>
          {modelLabel ? (
            <NamePlate side={side} label={modelLabel} revealing={revealing} />
          ) : live ? (
            <span className="inline-flex items-center gap-1.5 text-caption text-fg-soft">
              <span aria-hidden="true" className="relative flex size-2">
                <span
                  className={cn(
                    'absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping',
                    style.dot,
                  )}
                />
                <span className={cn('relative size-2 rounded-full', style.dot)} />
              </span>
              <span className="sr-only">, </span>
              Writing
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
