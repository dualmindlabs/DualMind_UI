import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type StatusTone = 'working' | 'success' | 'error';

/**
 * A status inside the StatusShell card: an icon (spinning while working), a heading, a sentence
 * and the next action. The heading and text sit in a polite live region so a change of state is
 * announced; `progress` (0 to 1) draws a bar, e.g. the countdown before moving on.
 */
export function StatusCard({
  tone,
  title,
  children,
  action,
  progress,
}: {
  tone: StatusTone;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  progress?: number | null;
}) {
  const Icon = tone === 'working' ? LoaderCircle : tone === 'success' ? CircleCheck : CircleAlert;
  return (
    <div className="grid gap-6" aria-busy={tone === 'working'}>
      <span
        aria-hidden="true"
        className={cn(
          'grid size-12 place-items-center rounded-full border',
          tone === 'working' && 'border-line bg-surface-2 text-mind-a',
          tone === 'success' && 'border-ok/40 bg-ok/10 text-ok',
          tone === 'error' && 'border-bad/40 bg-bad/10 text-bad',
        )}
      >
        <Icon className={cn('size-6', tone === 'working' && 'animate-spin')} />
      </span>
      <div role="status" className="grid gap-2">
        <h1 className="text-h2 font-medium text-balance text-fg">{title}</h1>
        <div className="text-body text-fg-soft">{children}</div>
      </div>
      {typeof progress === 'number' ? (
        <div className="h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          <div
            className="h-full origin-left rounded-full bg-mind-a transition-transform duration-(--dur-base) ease-linear"
            style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
          />
        </div>
      ) : null}
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}
