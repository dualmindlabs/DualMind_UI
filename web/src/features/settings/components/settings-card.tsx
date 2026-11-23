import { Check } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils/cn';

import { SETTINGS_SECTIONS } from '../lib/sections';

export interface SettingsSectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** One section of the page: an anchor for the section nav, a heading, a line and its cards. */
export function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      // A focus target for the section nav, not a stop in the tab order.
      tabIndex={-1}
      className="grid scroll-mt-24 gap-5 focus:outline-none"
      data-testid={`settings-${id}`}
    >
      <header className="grid gap-2">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-6 min-w-8 place-items-center rounded-sm border border-line bg-surface-2 px-1.5 numeric text-caption text-muted"
          >
            {String(
              Math.max(
                0,
                SETTINGS_SECTIONS.findIndex(section => section.id === id),
              ) + 1,
            ).padStart(2, '0')}
          </span>
          <h2 id={`${id}-title`} className="text-h3 text-fg">
            {title}
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>
        {description ? (
          <p className="max-w-reading text-ui-sm text-fg-soft">{description}</p>
        ) : null}
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export interface SettingsCardIds {
  titleId: string;
  descriptionId: string;
}

export interface SettingsCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** The card's body; a function gets the title and description ids to label its control. */
  children?: ReactNode | ((ids: SettingsCardIds) => ReactNode);
  /** The strip under the body: a hint on the left, actions or a status on the right. */
  footer?: ReactNode;
  tone?: 'default' | 'danger';
  className?: string;
  testId?: string;
}

/**
 * A settings card, the Vercel-style pattern: a title and a line, the control, and a footer strip
 * for the hint and the action. The lit `surface-duel` (a top edge and a lift shadow); the danger tone is a red-tinted surface.
 */
export function SettingsCard({
  title,
  description,
  children,
  footer,
  tone = 'default',
  className,
  testId,
}: SettingsCardProps) {
  const id = useId();
  const ids: SettingsCardIds = { titleId: `${id}-title`, descriptionId: `${id}-description` };
  return (
    <div
      data-testid={testId}
      className={cn(
        'overflow-hidden',
        tone === 'danger'
          ? 'rounded-lg border border-bad/45 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--bad)_7%,var(--surface-2)),var(--surface))] shadow-lift'
          : 'surface-duel',
        className,
      )}
    >
      <div className="grid gap-4 p-5 sm:p-6">
        <div className="grid gap-1">
          <h3 id={ids.titleId} className="text-ui font-medium text-fg">
            {title}
          </h3>
          {description ? (
            <div id={ids.descriptionId} className="text-ui-sm text-fg-soft">
              {description}
            </div>
          ) : null}
        </div>
        {typeof children === 'function' ? children(ids) : children}
      </div>
      {footer ? (
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line bg-bg-deep/60 px-5 py-3 text-caption text-muted sm:px-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/**
 * "Saved on this device", shown for a moment after a setting that applies at once changes. The
 * live region is always in the page, so the message is announced when it appears.
 */
export function SavedNote({
  visible,
  children = 'Saved on this device',
}: {
  visible: boolean;
  children?: ReactNode;
}) {
  return (
    <p role="status" className="flex min-h-5 items-center gap-1.5 text-caption text-ok">
      {visible ? (
        <>
          <Check aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
          {children}
        </>
      ) : null}
    </p>
  );
}
