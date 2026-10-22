import { CircleAlert, Lock, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserMessage, isApiError } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

export const RUN_YOUR_OWN_HREF = '/';

function StateCard({
  icon,
  title,
  children,
  actions,
  tone = 'default',
  testId,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  tone?: 'default' | 'error';
  testId: string;
}) {
  return (
    <PageContainer width="reading" className="py-16 md:py-24">
      <div
        data-testid={testId}
        role={tone === 'error' ? 'alert' : undefined}
        className={cn(
          'relative grid justify-items-start gap-5 overflow-hidden rounded-xl border bg-surface px-6 py-9 shadow-raise sm:px-10',
          tone === 'error' ? 'border-bad/40' : 'border-line',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 dot-grid [mask-image:radial-gradient(ellipse_70%_60%_at_100%_0%,black,transparent)] opacity-60"
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative grid size-11 place-items-center rounded-lg border bg-surface-2',
            tone === 'error' ? 'border-bad/40 text-bad' : 'border-line text-fg-soft',
          )}
        >
          {icon}
        </span>
        <div className="relative grid gap-2">
          <h1 className="text-h2 font-medium text-balance text-fg">{title}</h1>
          <div className="grid gap-2 text-ui text-fg-soft">{children}</div>
        </div>
        <div className="relative flex flex-wrap gap-2">{actions}</div>
      </div>
    </PageContainer>
  );
}

/** Private, deleted, never there, or an address without an id: one honest message. */
export function ShareUnavailable({ ownerHref }: { ownerHref: string | null }) {
  return (
    <StateCard
      testId="share-unavailable"
      icon={<Lock strokeWidth={1.75} className="size-5" />}
      title="This link is private or does not exist."
      actions={
        <>
          <a
            href={RUN_YOUR_OWN_HREF}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            Run your own battle
          </a>
          {ownerHref ? (
            <a href={ownerHref} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Open it in your arena
            </a>
          ) : null}
        </>
      }
    >
      <p>
        Its owner may have made it private or deleted it, or the link was cut short. Ask the person
        who sent it to check that it is set to Unlisted or Public.
      </p>
    </StateCard>
  );
}

/** The API could not be reached or failed: what happened, and a retry. */
export function ShareError({
  error,
  retrying,
  onRetry,
}: {
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
}) {
  const requestId = isApiError(error) ? error.requestId : undefined;
  return (
    <StateCard
      testId="share-error"
      tone="error"
      icon={<CircleAlert strokeWidth={1.75} className="size-5" />}
      title="This shared page did not load."
      actions={
        <>
          <Button variant="primary" size="sm" onClick={onRetry} loading={retrying}>
            <RotateCw aria-hidden="true" strokeWidth={1.75} />
            Try again
          </Button>
          <a
            href={RUN_YOUR_OWN_HREF}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            Start a battle
          </a>
        </>
      }
    >
      <p>{getUserMessage(error)}</p>
      {requestId ? (
        <p className="font-mono text-caption text-muted">Request id {requestId}</p>
      ) : null}
    </StateCard>
  );
}

/** The page's shape while the thread loads: the heading, then a turn with two panes. */
export function ShareSkeleton() {
  return (
    <div aria-busy="true" data-testid="share-loading">
      <p role="status" className="sr-only">
        Loading the shared battle
      </p>
      <div aria-hidden="true">
        <PageContainer className="grid gap-4 pt-12 pb-10 md:pt-16">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-4/5 max-w-3xl" />
          <Skeleton className="h-4 w-3/5 max-w-xl" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </PageContainer>
        <PageContainer className="grid gap-4 pb-16">
          <div className="grid gap-2 border-l-2 border-line pl-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map(index => (
              <div key={index} className="overflow-hidden rounded-lg border border-line">
                <Skeleton className="h-12 rounded-none" />
                <div className="grid gap-2.5 p-5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
