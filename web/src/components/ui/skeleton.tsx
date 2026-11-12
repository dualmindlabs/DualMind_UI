/**
 * Loading placeholder.
 * Source: shadcn/ui `skeleton` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our surface token; a band of light crosses it (transform only, so it is cheap), and
 * it stands still under reduced motion.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** Decorative: give the region that is loading `aria-busy` and a text status instead. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-3',
        'after:absolute after:inset-0 after:-translate-x-full after:bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--fg)_9%,transparent),transparent)] motion-safe:after:animate-skeleton',
        className,
      )}
      {...props}
    />
  );
}
