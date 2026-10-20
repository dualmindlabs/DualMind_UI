/**
 * Loading placeholder.
 * Source: shadcn/ui `skeleton` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our surface token; the pulse is an opacity animation, which stops under reduced motion.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** Decorative: give the region that is loading `aria-busy` and a text status instead. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-surface-3', className)}
      {...props}
    />
  );
}
