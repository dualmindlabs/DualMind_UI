import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * The lit opening band shared by every info page: the deep background with a pool of Mind A light
 * on one side and Mind B on the other, a masked grid and grain. Painted once (gradients only),
 * so it costs nothing at scroll time. Content goes in the left column; `aside` in the right one.
 */
export function PageHero({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative isolate overflow-hidden border-b border-line mesh-duel print:border-0 print:bg-transparent">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_70%_90%_at_30%_20%,black,transparent)] print:hidden"
      />
      <div
        className={cn(
          'mx-auto grid max-w-page items-center gap-12 px-4 pt-28 pb-16 sm:px-6 md:pt-36 md:pb-24 lg:grid-cols-[minmax(0,1fr)_28rem]',
          !aside && 'lg:grid-cols-1',
          className,
        )}
      >
        <div className="min-w-0">{children}</div>
        {aside}
      </div>
    </div>
  );
}
