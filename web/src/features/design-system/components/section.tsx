import type { ReactNode } from 'react';

import { getSection } from '../lib/sections';

interface SectionProps {
  id: string;
  title: ReactNode;
  lead: ReactNode;
  children: ReactNode;
}

/** A numbered style-guide section: eyebrow, H2 and lead on the left, content below. */
export function Section({ id, title, lead, children }: SectionProps) {
  const section = getSection(id);
  const headingId = `${id}-title`;

  return (
    <section id={id} aria-labelledby={headingId} className="border-b border-line">
      <div className="mx-auto max-w-page px-4 py-16 sm:px-6 md:py-24">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-16">
          <div>
            <p className="eyebrow text-muted">
              <span className="text-mind-a">{section.index}</span> <span aria-hidden="true">/</span>{' '}
              {section.title}
            </p>
            <h2 id={headingId} className="mt-4 text-h2 font-medium">
              {title}
            </h2>
          </div>
          <div className="text-body text-fg-soft md:pt-9">{lead}</div>
        </div>
        <div className="mt-12 md:mt-16">{children}</div>
      </div>
    </section>
  );
}
