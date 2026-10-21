import type { PageContent } from '../content';
import { formatDate } from '../lib/format';
import { BlockList } from './block-list';
import { Callout } from './callout';
import { PageHeading } from './page-heading';
import { PageShell } from './page-shell';
import { SectionHeading } from './section-heading';
import { TableOfContents } from './table-of-contents';

/**
 * Privacy, Terms and Cookies: plain, fast and printable, with no effects. A summary box at the
 * top, the last updated date, a table of contents (sticky with the current section marked on
 * desktop, collapsible on phones) and the sections as long-form text.
 */
export function LegalPage({ page }: { page: PageContent }) {
  const summary = page.sections.find(section => section.id === 'summary');
  const summaryBlock = summary?.blocks.find(block => block.type === 'callout');
  const sections = page.sections.filter(section => section !== summary);
  const toc = sections.map(section => ({
    id: section.id,
    label: section.human ? `${section.heading} ${section.human}` : section.heading,
  }));

  return (
    <PageShell>
      <div className="border-b border-line bg-bg-deep print:border-0 print:bg-transparent">
        <div className="mx-auto max-w-page px-4 pt-12 pb-12 sm:px-6 md:pt-16 md:pb-16">
          <PageHeading page={page} />
          {page.updated ? (
            <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-sm text-muted">
              <span className="eyebrow">Last updated</span>
              <time dateTime={page.updated} className="text-fg-soft tabular-nums">
                {formatDate(page.updated)}
              </time>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-page px-4 py-10 sm:px-6 md:py-14">
        {summaryBlock?.type === 'callout' ? (
          <Callout block={summaryBlock} className="max-w-3xl" />
        ) : null}

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <TableOfContents items={toc} />
          <div className="max-w-reading min-w-0">
            {sections.map((section, index) => {
              const headingId = `${section.id}-title`;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={headingId}
                  className="scroll-mt-24 border-t border-line py-10 first:border-t-0 first:pt-0 print:break-inside-avoid-page"
                >
                  <p aria-hidden="true" className="eyebrow text-muted tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <SectionHeading
                    section={section}
                    id={headingId}
                    className="mt-3 mb-6 text-h2 font-medium text-balance text-fg"
                  />
                  <BlockList blocks={section.blocks} />
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
