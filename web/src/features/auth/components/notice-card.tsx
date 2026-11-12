import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/** A quiet card with an icon, a title and body text: unavailable, signed in, check your email. */
export function NoticeCard({
  icon: Icon,
  tone = 'neutral',
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  tone?: 'neutral' | 'good' | 'bad';
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('grid gap-4 surface-inset p-5', className)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full border',
            tone === 'good' && 'border-ok/40 bg-ok/10 text-ok',
            tone === 'bad' && 'border-bad/40 bg-bad/10 text-bad',
            tone === 'neutral' && 'border-line bg-surface-2 text-mind-a',
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <h2 className="pt-1.5 text-ui font-medium text-fg">{title}</h2>
      </div>
      <div className="grid gap-3 text-ui-sm text-fg-soft">{children}</div>
    </section>
  );
}
