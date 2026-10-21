import { Info, ShieldCheck, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

import type { CalloutBlock } from '../content';
import { RichText } from './rich-text';

const tones = {
  summary: {
    box: 'border-human/45 bg-human-tint',
    icon: 'text-human',
    label: 'Summary',
    Icon: ShieldCheck,
  },
  note: { box: 'border-mind-a/40 bg-mind-a-tint', icon: 'text-mind-a', label: 'Note', Icon: Info },
  warning: {
    box: 'border-warn/50 bg-surface-2',
    icon: 'text-warn',
    label: 'Warning',
    Icon: TriangleAlert,
  },
} as const;

/**
 * A boxed note: the summary at the top of a legal page, a note, or a warning. The icon and the
 * label carry the tone as well as the colour.
 */
export function Callout({ block, className }: { block: CalloutBlock; className?: string }) {
  const tone = tones[block.tone];
  return (
    <aside
      role="note"
      data-tone={block.tone}
      aria-label={block.title ?? tone.label}
      className={cn(
        'not-prose rounded-lg border p-5 wrap-break-word text-fg sm:p-6 print:break-inside-avoid',
        tone.box,
        className,
      )}
    >
      <p className="flex items-center gap-2.5 text-ui font-semibold text-fg">
        <tone.Icon
          aria-hidden="true"
          strokeWidth={1.75}
          className={cn('size-5 shrink-0', tone.icon)}
        />
        {block.title ?? tone.label}
      </p>
      <p className="mt-3 text-body leading-relaxed [text-wrap:pretty] text-fg-soft">
        <RichText text={block.text} />
      </p>
    </aside>
  );
}
