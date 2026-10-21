import type { ComponentProps, ReactNode } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { cn } from '@/lib/utils/cn';

export interface PageSectionProps extends Omit<ComponentProps<'section'>, 'title'> {
  /** The small label above the title, in the label voice. */
  eyebrow?: ReactNode;
  /** The section's h2; it also names the region. */
  title?: ReactNode;
  /** One or two sentences under the title. */
  lead?: ReactNode;
  /** `deep` uses the deeper background, for alternating bands. */
  tone?: 'default' | 'deep';
  width?: 'page' | 'reading';
  /** Classes for the inner container. */
  containerClassName?: string;
}

/**
 * A page band: vertical rhythm, an optional eyebrow, title and lead, and the content. With a
 * title it is a labelled region.
 */
export function PageSection({
  eyebrow,
  title,
  lead,
  tone = 'default',
  width = 'page',
  className,
  containerClassName,
  children,
  id,
  ...props
}: PageSectionProps) {
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={title && headingId ? headingId : undefined}
      className={cn('py-16 md:py-24', tone === 'deep' && 'bg-bg-deep', className)}
      {...props}
    >
      <PageContainer width={width} className={containerClassName}>
        {eyebrow || title || lead ? (
          <div className="mb-10 grid max-w-reading gap-4 md:mb-14">
            {eyebrow ? <p className="eyebrow text-muted">{eyebrow}</p> : null}
            {title ? (
              <h2 id={headingId} className="text-h2 font-medium text-fg">
                {title}
              </h2>
            ) : null}
            {lead ? <div className="text-body text-fg-soft">{lead}</div> : null}
          </div>
        ) : null}
        {children}
      </PageContainer>
    </section>
  );
}
