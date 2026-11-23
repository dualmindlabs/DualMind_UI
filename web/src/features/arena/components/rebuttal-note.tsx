import { MessageSquareQuote } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import type { Rebuttal } from '@/lib/api';

/**
 * One model's rebuttal of the other's answer (cross-examine, backend PR 71), under the answer it
 * is about: who wrote it, at most 80 words of plain text (never Markdown, so nothing it says can
 * become a link or an image), and the word count in mono.
 */
export function RebuttalNote({
  rebuttal,
  critic,
}: {
  rebuttal: Rebuttal;
  /** The critic's name for people. */
  critic: string;
}) {
  return (
    <aside
      data-testid="rebuttal"
      aria-label={`Rebuttal by ${critic}`}
      className="relative mx-5 mb-5 grid gap-2 rounded-md border border-line bg-surface-2 px-4 py-3 sm:mx-8"
    >
      <p className="inline-flex items-center gap-2 text-caption font-medium text-fg-soft">
        <MessageSquareQuote aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
        {critic} replies to this answer
      </p>
      <p className="text-ui-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-fg">
        {rebuttal.rebuttal}
      </p>
      {rebuttal.words ? (
        <p className="font-mono text-label tracking-[0.06em] text-fg-soft uppercase tabular-nums">
          {rebuttal.words} words
        </p>
      ) : null}
    </aside>
  );
}

/** Holds the rebuttal's place while it is written, so the panes do not jump when it lands. */
export function RebuttalPending() {
  return (
    <div
      aria-hidden="true"
      data-testid="rebuttal-pending"
      className="relative mx-5 mb-5 grid gap-2 rounded-md border border-dashed border-line px-4 py-3 sm:mx-8"
    >
      <p className="text-caption text-fg-soft">Writing a reply to this answer</p>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}
