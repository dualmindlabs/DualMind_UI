import { EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

import { ModelMark } from '@/components/ui/model-mark';
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

/**
 * The model's name, large, with its mark. While `revealing` the plate turns over like a card
 * (once, rotateY, B 140 ms after A): a moment, not a loop. Reduced motion: it is simply there.
 */
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
  const content = (
    <span className="flex min-w-0 items-center gap-3">
      <ModelMark name={label} {...(side === 'solo' ? {} : { who: side })} size="lg" />
      <span className="block min-w-0 truncate text-h3 font-semibold tracking-tight text-fg">
        {label}
      </span>
    </span>
  );
  return (
    <span
      className="block min-w-0 [perspective:700px]"
      data-testid="pane-model"
      title={label}
      style={{ display: 'block' }}
    >
      <span className="sr-only">, </span>
      {revealing && !reduce ? (
        <motion.span
          initial={{ rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 150,
            damping: 20,
            delay: 0.15 + (side === 'b' ? 0.14 : 0),
          }}
          className="block min-w-0 origin-center [backface-visibility:hidden]"
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
 * The pane's header, one row so both cards line up: the A or B letter (colour is never the only
 * signal), then either the heading "Answer A" with the blind note under it, or, once the name may
 * be shown, the model's name large on a plate that turns over at the reveal (screen readers still
 * hear "Answer A, <name>"). A long name ends in an ellipsis with the full name in its tooltip;
 * the pick mark and copy never shrink. Timing and length live in the footer (pane-metrics.tsx).
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
    <header className="flex min-h-14 items-center gap-3 px-5 pt-5 pb-1 sm:gap-4 sm:px-8 sm:pt-7">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {side === 'solo' ? null : <RoleBadge who={side} letterOnly size="md" className="size-9" />}
        <h3 id={headingId} className="grid min-w-0 flex-1 gap-0.5">
          <span
            className={cn(
              'shrink-0 text-h3 font-semibold tracking-tight',
              style.text,
              named && 'sr-only',
            )}
          >
            {style.title}
          </span>
          {modelLabel ? (
            <NamePlate side={side} label={modelLabel} revealing={revealing} />
          ) : live && side === 'solo' ? (
            <span className="inline-flex items-center gap-1.5 text-caption text-fg-soft">
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full motion-safe:animate-pulse', style.dot)}
              />
              <span className="sr-only">, </span>
              Writing
            </span>
          ) : side === 'solo' ? null : (
            <span className="inline-flex items-center gap-1.5 text-caption text-muted">
              {live ? (
                <span
                  aria-hidden="true"
                  data-testid="pane-writing"
                  className={cn('size-2 rounded-full motion-safe:animate-pulse', style.dot)}
                />
              ) : null}
              <EyeOff aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              <span className="sr-only">, </span>
              {hiddenNote}
            </span>
          )}
        </h3>
        {chosen ? (
          <span
            data-testid="pane-pick"
            className="shrink-0 rounded-full border border-human/50 bg-human-tint px-3 py-1 text-caption font-semibold whitespace-nowrap text-human"
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
