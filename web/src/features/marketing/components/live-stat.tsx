import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface LiveStatProps {
  label: string;
  /** The value; while loading, a placeholder bar of the same height (no layout shift). */
  children: ReactNode;
  className?: string;
}

/** One number of the live strip: a label in the label voice over a large tabular value. */
export function LiveStat({ label, children, className }: LiveStatProps) {
  return (
    <div className={cn('min-w-0 px-4 py-5 sm:px-6', className)}>
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="mt-2.5 flex min-h-12 items-center">{children}</dd>
    </div>
  );
}
