import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface KitCardProps {
  title: string;
  description: ReactNode;
  /** The import path, shown as a reference for developers. */
  source?: string;
  className?: string;
  children: ReactNode;
}

/** A specimen of the UI kit: what it is, where it lives, and the component in its states. */
export function KitCard({ title, description, source, className, children }: KitCardProps) {
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col rounded-lg border border-line bg-surface shadow-raise',
        className,
      )}
    >
      <div className="grid gap-1 px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-h3 font-semibold text-fg">{title}</h3>
          {source ? <code className="text-caption text-muted">{source}</code> : null}
        </div>
        <p className="text-ui-sm text-fg-soft">{description}</p>
      </div>
      <div className="flex flex-1 flex-col gap-6 px-4 pt-5 pb-5 sm:p-6">{children}</div>
    </article>
  );
}

/** A labelled demo inside a KitCard: the component, and its state underneath in the label voice. */
export function KitState({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={cn('grid min-w-0 content-start gap-2.5', className)}>
      <div className="flex min-h-11 flex-wrap items-center gap-3">{children}</div>
      <figcaption className="eyebrow text-muted">{label}</figcaption>
    </figure>
  );
}
