import { CloudOff, Hourglass, LifeBuoy, Lock, type LucideIcon, Plus, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils/cn';

type Tone = 'warn' | 'bad' | 'info';

const TONES: Record<Tone, { box: string; icon: string }> = {
  warn: {
    box: 'border-warn/45 bg-[color-mix(in_oklab,var(--warn)_7%,var(--surface))]',
    icon: 'text-warn',
  },
  bad: {
    box: 'border-bad/45 bg-[color-mix(in_oklab,var(--bad)_7%,var(--surface))]',
    icon: 'text-bad',
  },
  info: { box: 'border-line bg-surface-2', icon: 'text-fg-soft' },
};

/** A calm, emphatic callout under the panes: an icon tile, a title, a line, and what to do. */
function Callout({
  tone,
  icon: Icon,
  title,
  children,
  action,
  alert = false,
  testId,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  alert?: boolean;
  testId?: string;
}) {
  const style = TONES[tone];
  return (
    <div
      role={alert ? 'alert' : undefined}
      data-testid={testId}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-3.5 shadow-raise motion-safe:animate-rise sm:p-4',
        style.box,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface',
          style.icon,
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
        <p className="text-ui font-semibold tracking-tight text-fg">{title}</p>
        {children ? <p className="text-ui-sm text-fg-soft">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** A battle that cannot be rated (a backup model answered, no comparison, or voting closed). */
export function UnratedNotice({ children }: { children: ReactNode }) {
  return (
    <Callout tone="info" icon={LifeBuoy} title="Not a rated battle" testId="unrated-note-card">
      <span data-testid="unrated-note">{children}</span>
    </Callout>
  );
}

const RATE_LIMITED = /too many|rate.?limit|slow down|quota|try again later|limit/i;

/**
 * A turn that did not produce answers. Four voices, one shape: the thread belongs to another
 * account (New battle), the visitor is out of requests for now (wait, no retry button spam), the
 * device is offline (the draft is safe; retry when back), anything else (Try again). The text
 * always starts "The answers did not arrive." for the generic case, which tests and screen
 * readers rely on.
 */
export function TurnError({
  kind,
  message,
  onRetry,
  onNewBattle,
}: {
  kind: 'forbidden' | null;
  message: string | null;
  onRetry: () => void;
  onNewBattle: () => void;
}) {
  const online = useOnlineStatus();

  if (kind === 'forbidden') {
    return (
      <Callout
        alert
        tone="bad"
        icon={Lock}
        title="This conversation is not yours"
        action={
          <Button variant="secondary" size="sm" onClick={onNewBattle}>
            <Plus aria-hidden="true" strokeWidth={1.75} />
            New battle
          </Button>
        }
      >
        {message}
      </Callout>
    );
  }
  if (!online) {
    return (
      <Callout
        alert
        tone="warn"
        icon={CloudOff}
        title="You are offline"
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden="true" strokeWidth={1.75} />
            Try again
          </Button>
        }
      >
        The answers did not arrive. Your prompt is safe; send it again when you are back.
      </Callout>
    );
  }
  if (message && RATE_LIMITED.test(message)) {
    return (
      <Callout
        alert
        tone="warn"
        icon={Hourglass}
        title="Slow down a moment"
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden="true" strokeWidth={1.75} />
            Try again
          </Button>
        }
      >
        The answers did not arrive. {message}
      </Callout>
    );
  }
  return (
    <Callout
      alert
      tone="bad"
      icon={RotateCw}
      title="No answers this time"
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" strokeWidth={1.75} />
          Try again
        </Button>
      }
    >
      The answers did not arrive. {message}
    </Callout>
  );
}
