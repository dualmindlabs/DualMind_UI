import { Wordmark } from '@/components/layout/wordmark';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The arena's loading frame: the header bar, the history column and a composer outline. It is in
 * the prerendered landing page too, hidden unless the head script marked <html data-arena> (a
 * signed-in visitor of the new arena), so that visitor never sees a flash of the landing page.
 * `always` shows it regardless (while the arena's code loads).
 */
export function ArenaBoot({ always = false }: { always?: boolean }) {
  return (
    <div
      data-arena-boot={always ? undefined : ''}
      aria-busy="true"
      className="flex h-dvh flex-col bg-bg"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
        <Wordmark className="h-3" title={null} />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-68 shrink-0 flex-col gap-2 border-r border-line bg-surface p-3 lg:flex">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="mt-3 h-7 w-4/5" />
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-7 w-2/3" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-6 px-4 py-8 md:justify-center">
          <p className="eyebrow text-muted">Loading the arena</p>
          <Skeleton className="h-32 w-full max-w-3xl rounded-xl" />
        </div>
      </div>
    </div>
  );
}
