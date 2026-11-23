import { CircleAlert, Lock, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { ModelMark } from '@/components/ui/model-mark';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserMessage, isApiError } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

export const RUN_YOUR_OWN_HREF = '/';

/**
 * The picture beside a dead end: two empty panes (Mind A and Mind B) with a mark between them,
 * dashed like a table with nobody at it. Decorative.
 */
function GhostDuel({ icon, tone }: { icon: ReactNode; tone: 'default' | 'error' }) {
  return (
    <div aria-hidden="true" className="relative grid grid-cols-2 gap-3 select-none">
      {(['a', 'b'] as const).map(side => (
        <div
          key={side}
          className={cn(
            'grid h-32 content-start gap-2.5 rounded-lg border border-dashed bg-surface/60 p-3.5 sm:h-40',
            side === 'a' ? 'border-mind-a-edge' : 'border-mind-b-edge',
          )}
        >
          <ModelMark name={side.toUpperCase()} who={side} size="sm" className="opacity-70" />
          <span className="mt-1 block h-1.5 w-4/5 rounded-full bg-fg/10" />
          <span className="block h-1.5 w-3/5 rounded-full bg-fg/10" />
          <span className="block h-1.5 w-2/3 rounded-full bg-fg/10" />
        </div>
      ))}
      <span
        className={cn(
          'absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-surface-2 shadow-lift',
          tone === 'error' ? 'border-bad/50 text-bad' : 'border-line-strong text-fg-soft',
        )}
      >
        {icon}
      </span>
    </div>
  );
}

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
    <div className="relative isolate overflow-hidden mesh-duel">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60"
      />
      <PageContainer className="py-14 md:py-24">
        <div
          data-testid={testId}
          role={tone === 'error' ? 'alert' : undefined}
          className={cn(
            'grid items-center gap-10 p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]',
            tone === 'error'
              ? 'rounded-lg border border-bad/40 bg-surface shadow-float'
              : 'surface-float',
          )}
        >
          <div className="grid content-start justify-items-start gap-6">
            <div className="grid gap-3">
              <h1 className="text-h2 text-balance text-fg">{title}</h1>
              <div className="grid gap-2 text-ui text-fg-soft">{children}</div>
            </div>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
          <GhostDuel icon={icon} tone={tone} />
        </div>
      </PageContainer>
    </div>
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
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            Run your own battle
          </a>
          {ownerHref ? (
            <a href={ownerHref} className={buttonVariants({ variant: 'secondary', size: 'md' })}>
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
          <Button variant="primary" size="md" onClick={onRetry} loading={retrying}>
            <RotateCw aria-hidden="true" strokeWidth={1.75} />
            Try again
          </Button>
          <a
            href={RUN_YOUR_OWN_HREF}
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
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
