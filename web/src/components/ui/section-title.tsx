/**
 * Section title: the kicker, then a display heading in Geist 600 with an optional accent
 * phrase (the human voice, underlined in the human colour, one per heading at most). The one heading block for the
 * redesigned pages. Our own component.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface SectionTitleProps {
  /** The quiet lead-in above the heading (sentence case, with a short rule before it). */
  kicker?: ReactNode;
  /** The heading text. */
  title: ReactNode;
  /** An accented phrase after the title, in the human colour. */
  accent?: ReactNode;
  /** One short paragraph under the heading, in the lead size. */
  lead?: ReactNode;
  /** `h1` for a page title (larger), `h2` for a section (default), `h3` for a block nested in a section (H2 size). */
  level?: 'h1' | 'h2' | 'h3';
  align?: 'start' | 'center';
  className?: string;
  id?: string;
}

export function SectionTitle({
  kicker,
  title,
  accent,
  lead,
  level = 'h2',
  align = 'start',
  className,
  id,
}: SectionTitleProps) {
  const Heading = level;

  return (
    <div
      data-slot="section-title"
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <Heading
        id={id}
        className={cn(level === 'h1' ? 'text-h1' : 'text-h2', 'max-w-[20ch] text-fg')}
      >
        {title}
        {accent ? (
          <>
            {' '}
            <span className="human-voice text-human">{accent}</span>
          </>
        ) : null}
      </Heading>
      {lead ? <p className="max-w-[56ch] text-lead text-fg-soft">{lead}</p> : null}
    </div>
  );
}
