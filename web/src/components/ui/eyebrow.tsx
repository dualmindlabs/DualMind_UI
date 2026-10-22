/**
 * Eyebrow: a small data label in Geist Mono caps (the `eyebrow` utility), optionally in a role
 * colour. Use it for data (model ids, counts, shortcuts) and sparingly above a heading; for a
 * plain section lead-in use `kicker` (see ./section-title.tsx). Our own component.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

export type EyebrowTone = 'muted' | 'soft' | 'a' | 'b' | 'human';

const toneClass: Record<EyebrowTone, string> = {
  muted: 'text-muted',
  soft: 'text-fg-soft',
  a: 'text-mind-a',
  b: 'text-mind-b-text',
  human: 'text-human',
};

export function Eyebrow({
  tone = 'muted',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: EyebrowTone }) {
  return (
    <span
      data-slot="eyebrow"
      data-tone={tone}
      className={cn('eyebrow', toneClass[tone], className)}
      {...props}
    />
  );
}
