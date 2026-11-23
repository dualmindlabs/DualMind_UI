import { CircleAlert, Columns2, Lock } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function Card({
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
  actions?: ReactNode;
  tone?: 'default' | 'error';
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      role={tone === 'error' ? 'alert' : undefined}
      className={
        tone === 'error'
          ? 'grid max-w-reading gap-5 rounded-lg border border-bad/40 bg-surface p-6 shadow-float sm:p-8'
          : 'grid max-w-reading gap-5 surface-float p-6 sm:p-8'
      }
    >
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-lg border border-line bg-surface-2 text-fg-soft"
      >
        {icon}
      </span>
      <div className="grid gap-2">
        <h2 className="text-h3 text-fg">{title}</h2>
        <div className="grid gap-2 text-ui text-fg-soft">{children}</div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Compare mode is off on this backend: say so, and point at what already does the job. */
export function CompareUnavailable() {
  return (
    <Card
      testId="compare-unavailable"
      icon={<Columns2 className="size-5" strokeWidth={1.75} />}
      title="Compare is not switched on yet."
      actions={
        <a href="/" className={buttonVariants({ variant: 'primary', size: 'md' })}>
          Open the Arena
        </a>
      }
    >
      <p>
        Compare lets you pick two models and read both answers with their names. It is not available
        on this server yet.
      </p>
      <p>
        Until it is, the Arena&apos;s Side by side mode does the same job: choose two models in the
        composer and ask once.
      </p>
    </Card>
  );
}

/** A private, expired or deleted result, or a link that was cut short: one message for all. */
export function CompareNotFound() {
  return (
    <Card
      testId="compare-not-found"
      icon={<Lock className="size-5" strokeWidth={1.75} />}
      title="This result is private or does not exist."
      actions={
        <a href="/compare/" className={buttonVariants({ variant: 'primary', size: 'md' })}>
          Run your own compare
        </a>
      }
    >
      <p>
        Results are private unless their owner shares them, and they are deleted after 30 days. The
        owner may have turned sharing off or deleted it, or the link was cut short.
      </p>
    </Card>
  );
}

export function CompareLoadError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <Card
      testId="compare-error"
      tone="error"
      icon={<CircleAlert className="size-5 text-bad" strokeWidth={1.75} />}
      title="This did not load."
      actions={
        <Button variant="secondary" loading={retrying} onClick={onRetry}>
          Try again
        </Button>
      }
    >
      <p>{message}</p>
    </Card>
  );
}

export function CompareSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="grid gap-4">
      <p role="status" className="sr-only">
        {label}
      </p>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
