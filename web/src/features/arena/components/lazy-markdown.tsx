import { Suspense } from 'react';

import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { cn } from '@/lib/utils/cn';

const Markdown = lazyWithRetry(() =>
  import('./markdown').then(module => ({ default: module.Markdown })),
);

/**
 * An answer as Markdown for pages that must not pay for the renderer up front (the landing
 * page's guest battle, the private arena): the hardened Markdown component (markdown.tsx) loads as
 * its own chunk, and the answer shows as plain text for the moment it takes.
 */
export function LazyMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string | undefined;
}) {
  return (
    <Suspense
      fallback={
        <p dir="auto" className={cn('break-words whitespace-pre-wrap', className)}>
          {children}
        </p>
      }
    >
      <Markdown className={className}>{children}</Markdown>
    </Suspense>
  );
}
