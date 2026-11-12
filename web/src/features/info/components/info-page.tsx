import type { ReactNode } from 'react';

import { Reveal } from '@/components/motion/reveal';
import { PageHero } from '@/components/ui/page-hero';

import type { PageContent, Section } from '../content';
import { BlockList, type BlockOverrides } from './block-list';
import { HeroDuel } from './hero-duel';
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
        className="scroll-mt-24 border-t border-line py-14 md:py-20"
      >
        <div
          className={
            wide ? 'grid gap-y-8' : 'grid gap-x-16 gap-y-6 lg:grid-cols-[18rem_minmax(0,1fr)]'
          }
        >
          <div className={wide ? undefined : 'lg:sticky lg:top-28 lg:self-start'}>
            <p
              aria-hidden="true"
              className="inline-flex h-7 items-center rounded-sm border border-line-strong bg-surface-2 px-2.5 numeric text-label text-fg-soft shadow-raise"
            >
              {String(number).padStart(2, '0')}
            </p>
            <SectionHeading
              section={section}
              id={headingId}
              className={
                wide
                  ? 'mt-4 max-w-reading text-h2 text-balance text-fg'
                  : 'mt-4 max-w-[16ch] text-h2 text-balance text-fg'
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
      <PageHero aside={<HeroDuel />}>
        <PageHeading page={page} size="display" />
      </PageHero>
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
