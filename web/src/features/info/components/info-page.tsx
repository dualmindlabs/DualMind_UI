import type { ReactNode } from 'react';

import { Reveal } from '@/components/motion/reveal';

import type { PageContent, Section } from '../content';
import { BlockList, type BlockOverrides } from './block-list';
import { PageHeading } from './page-heading';
import { PageShell } from './page-shell';
import { SectionHeading } from './section-heading';

export interface InfoPageProps {
  page: PageContent;
  /** Another renderer for some block types (How it works shows its steps as a timeline). */
  overrides?: BlockOverrides;
  /** Content between the intro and the first section (the How it works diagram). */
  beforeSections?: ReactNode;
  /** Content after the last section (the About page's "Built with" credits). */
  afterSections?: ReactNode;
  /** Section ids whose content needs the whole page width instead of the reading column. */
  wideSections?: readonly string[];
}

function InfoSection({
  section,
  number,
  overrides,
  wide,
}: {
  section: Section;
  number: number;
  overrides: BlockOverrides | undefined;
  wide: boolean;
}) {
  const headingId = `${section.id}-title`;
  return (
    <Reveal>
      <section
        id={section.id}
        aria-labelledby={headingId}
        className="scroll-mt-24 border-t border-line py-12 md:py-16"
      >
        <div
          className={
            wide ? 'grid gap-y-8' : 'grid gap-x-16 gap-y-6 lg:grid-cols-[15rem_minmax(0,1fr)]'
          }
        >
          <div className={wide ? undefined : 'lg:sticky lg:top-28 lg:self-start'}>
            <p aria-hidden="true" className="eyebrow text-muted tabular-nums">
              {String(number).padStart(2, '0')}
            </p>
            <SectionHeading
              section={section}
              id={headingId}
              className={
                wide
                  ? 'mt-3 max-w-reading text-h2 font-medium text-balance text-fg'
                  : 'mt-3 max-w-[22ch] text-h3 font-medium text-balance text-fg'
              }
            />
          </div>
          <div className={wide ? 'min-w-0' : 'max-w-reading min-w-0'}>
            <BlockList blocks={section.blocks} overrides={overrides} />
          </div>
        </div>
      </section>
    </Reveal>
  );
}

/**
 * The editorial layout of About, How it works and FAQ: a large heading with one Playfair
 * phrase, the intro, then numbered sections (heading in the left column, content in a 68ch
 * column) that fade in as they enter the view. Rendered from the typed content.
 */
export function InfoPage({
  page,
  overrides,
  beforeSections,
  afterSections,
  wideSections = [],
}: InfoPageProps) {
  return (
    <PageShell overlay>
      <div className="relative isolate overflow-hidden bg-bg-deep">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 dot-grid [mask-image:radial-gradient(ellipse_60%_80%_at_20%_30%,black,transparent)]"
        />
        <div className="mx-auto max-w-page px-4 pt-32 pb-16 sm:px-6 md:pt-40 md:pb-24">
          <PageHeading page={page} />
        </div>
      </div>
      {beforeSections}
      <div className="mx-auto max-w-page px-4 pb-8 sm:px-6">
        {page.sections.map((section, index) => (
          <InfoSection
            key={section.id}
            section={section}
            number={index + 1}
            overrides={overrides}
            wide={wideSections.includes(section.id)}
          />
        ))}
      </div>
      {afterSections}
    </PageShell>
  );
}
