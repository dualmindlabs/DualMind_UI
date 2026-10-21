import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface SectionHeadingProps {
  id: string;
  /** Two-digit section number, in Mind A. */
  index: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
}

/**
 * The editorial heading of a landing section: a numbered eyebrow in the label voice, an H2 with
 * at most one human-voice phrase, and a one or two sentence lead.
 */
export function SectionHeading({
  id,
  index,
  eyebrow,
  title,
  lead,
  align = 'start',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'grid max-w-3xl gap-4',
        align === 'center' && 'mx-auto justify-items-center text-center',
        className,
      )}
    >
      <p className="eyebrow text-muted">
        <span className="text-mind-a">{index}</span> <span aria-hidden="true">/</span> {eyebrow}
      </p>
      <h2 id={id} className="text-h1 font-light tracking-[-0.035em] text-fg">
        {title}
      </h2>
      {lead ? <p className="max-w-2xl text-h3 font-normal text-fg-soft">{lead}</p> : null}
    </div>
  );
}
