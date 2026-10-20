/**
 * Badge: a short label in the DM Mono label voice.
 * Source: shadcn/ui `badge` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our variants (neutral, outline, the three roles, status with a dot), 12px caps.
 * Role badges with the A / B letters are in ./role-badge.tsx.
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

export const badgeVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center gap-1.5 overflow-hidden rounded-sm border px-2 font-mono text-label leading-none font-medium tracking-[0.16em] whitespace-nowrap uppercase [&>svg]:size-3 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-surface-2 text-fg-soft',
        outline: 'border-line-strong text-fg-soft',
        'mind-a': 'border-mind-a/45 bg-mind-a-tint text-mind-a',
        'mind-b': 'border-mind-b/55 bg-mind-b-tint text-mind-b-text',
        human: 'border-human/50 bg-human-tint text-human',
        // Status badges keep body-contrast text; the coloured dot carries the state.
        ok: 'border-line bg-surface-2 text-fg-soft before:size-1.5 before:rounded-full before:bg-ok',
        warn: 'border-line bg-surface-2 text-fg-soft before:size-1.5 before:rounded-full before:bg-warn',
        bad: 'border-line bg-surface-2 text-fg-soft before:size-1.5 before:rounded-full before:bg-bad',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: ComponentProps<'span'> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
