import { ArrowUpRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { PageHero } from '@/components/ui/page-hero';
import { StatTile } from '@/components/ui/stat-tile';
import { cn } from '@/lib/utils/cn';

import { useActiveSection } from '../hooks/use-active-section';
import {
  conventions,
  developersPage,
  moreLinks,
  quickstart,
  rateLimitNote,
  rateLimits,
  versioningParagraphs,
} from '../lib/content';
import { buildReference } from '../lib/reference';
import { openApiDocument } from '../lib/spec';
import { CodeBlock } from './code-block';
import { Inline } from './inline';
import { OperationCard } from './operation-card';
import { ScrollTable } from './scroll-table';

/** Rendered once from the committed OpenAPI document, so it is built into the page. */
const reference = buildReference(openApiDocument);

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'operations', label: 'Operations' },
  { id: 'problems', label: 'Errors' },
  { id: 'rate-limits', label: 'Rate limits' },
  { id: 'versioning', label: 'Versioning' },
  { id: 'more', label: 'More' },
] as const;

const operationLinks = reference.operations.map(operation => ({
  id: operation.id,
  method: operation.method,
  path: operation.path,
}));

const linkBase =
  'flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-ui-sm transition-colors duration-(--dur-fast) ease-out-expo pointer-coarse:min-h-11';

/**
 * The anchored navigation. One `<nav>`: a sticky list down the left on desktop, a sticky scrolling
 * strip under the header on phones. The section being read is marked `aria-current="location"`.
 * Plain links to the section ids, so it works without JavaScript.
 */
function DocNav() {
  const active = useActiveSection(sections.map(section => section.id));
  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-line bg-bg px-4 sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:px-0 print:hidden">
      <nav aria-label="On this page">
        <p className="mb-3 hidden items-center gap-2 eyebrow text-muted lg:flex">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-mind-a" />
          On this page
        </p>
        <ul className="flex gap-1 overflow-x-auto py-2 lg:grid lg:gap-0.5 lg:overflow-visible lg:py-0">
          {sections.map((section, index) => {
            const current = section.id === active;
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={current ? 'location' : undefined}
                  className={cn(
                    linkBase,
                    'whitespace-nowrap lg:rounded-l-none lg:border-l-2',
                    current
                      ? 'bg-mind-a-tint font-medium text-fg lg:border-mind-a'
                      : 'text-fg-soft hover:bg-surface-2 hover:text-fg lg:border-line',
                  )}
                >
                  <span aria-hidden="true" className="numeric text-label text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav aria-label="Operations" className="mt-8 hidden lg:block">
        <p className="mb-3 eyebrow text-muted">Operations</p>
        <ul className="grid gap-0.5">
          {operationLinks.map(operation => (
            <li key={operation.id}>
              <a
                href={`#${operation.id}`}
                className="flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-ui-sm text-fg-soft transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-fg"
              >
                <span aria-hidden="true" className="w-9 shrink-0 font-mono text-label text-muted">
                  {operation.method}
                </span>
                <span className="min-w-0 truncate font-mono text-label">{operation.path}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function DocSection({
  id,
  title,
  number,
  lead,
  children,
}: {
  id: string;
  title: string;
  number: number;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 lg:scroll-mt-24">
      <p aria-hidden="true" className="numeric text-label text-muted">
        {String(number).padStart(2, '0')}
      </p>
      <h2 id={`${id}-title`} className="mt-2 text-h2 text-fg">
        {title}
      </h2>
      {lead ? <div className="mt-4 max-w-reading text-body text-fg-soft">{lead}</div> : null}
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6">{children}</div>
    </section>
  );
}

const proseCode =
  'prose [&_code]:rounded-sm [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-fg';

/**
 * /developers/: the API reference. Plain, prerendered HTML built from docs/api/openapi.v2.json
 * and the problem registry (no renderer library; the only script is the app shell, the copy
 * buttons and the section marker in the navigation).
 */
export function DevelopersPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <PageHero
          className="pt-16 pb-12 md:pt-20 md:pb-16"
          aside={
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                tone="a"
                label="API version"
                value={reference.version}
                className="col-span-2"
              />
              <StatTile
                tone="b"
                label="Operations"
                value={reference.operations.length}
                hint="in the OpenAPI document"
              />
              <StatTile label="Error types" value={reference.problems.length} />
              <StatTile
                label="Rate limit groups"
                value={rateLimits.length}
                className="col-span-2"
              />
            </div>
          }
        >
          <p className="kicker">{developersPage.eyebrow}</p>
          <h1 id="page-title" className="mt-6 max-w-[16ch] text-h1 text-balance text-fg">
            {developersPage.heading.text}{' '}
            <span className="human-voice text-human">{developersPage.heading.human}</span>
          </h1>
          <p className="mt-7 max-w-[58ch] text-lead [text-wrap:pretty] text-fg-soft">
            {developersPage.intro}
          </p>
          <p className="mt-8 flex w-fit max-w-full items-center gap-3 rounded-md border border-line bg-surface-2 py-2 pr-4 pl-3 shadow-raise">
            <span className="eyebrow text-muted">Base URL</span>
            <code className="min-w-0 font-mono text-ui-sm break-all text-fg">
              {reference.baseUrl}/api/v2
            </code>
          </p>
        </PageHero>

        <div className="mx-auto max-w-page px-4 pb-20 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-x-16">
          <DocNav />

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-20 pt-6 md:gap-24 lg:pt-14">
            <DocSection id="overview" number={1} title="Overview">
              <p className={cn(proseCode, 'max-w-reading')}>
                The base URL is <code>{reference.baseUrl}/api/v2</code>. {reference.title} is
                described by an OpenAPI 3.1 document you can{' '}
                <a href="/api/v2/openapi.json">download</a>.
              </p>
              <ul className="not-prose grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {conventions.map(item => (
                  <li
                    key={item}
                    className="surface-duel p-4 text-ui-sm leading-relaxed text-fg-soft [&_code]:rounded-sm [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-fg"
                  >
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            </DocSection>

            <DocSection
              id="quickstart"
              number={2}
              title="Quickstart"
              lead={
                <p>
                  The leaderboard is public. This reads it and prints the top model and when the
                  data last changed.
                </p>
              }
            >
              {quickstart.map(snippet => (
                <div key={snippet.id}>
                  <h3 id={`quickstart-${snippet.id}`} className="mb-3 display text-h3 text-fg">
                    {snippet.label}
                  </h3>
                  <CodeBlock
                    code={snippet.code}
                    language={snippet.language}
                    title={snippet.label}
                    label={`${snippet.label} example`}
                  />
                </div>
              ))}
            </DocSection>

            <DocSection
              id="operations"
              number={3}
              title="Operations"
              lead={
                <p>
                  Generated from the OpenAPI document: {reference.operations.length} operations at
                  version {reference.version}.
                </p>
              }
            >
              {reference.operations.map(operation => (
                <OperationCard key={operation.id} operation={operation} />
              ))}
            </DocSection>

            <DocSection
              id="problems"
              number={4}
              title="Errors"
              lead={
                <p className={proseCode}>
                  Every error is <code>application/problem+json</code> with a <code>type</code> that
                  names one of these problems, a <code>status</code>, a <code>requestId</code> and
                  usually a <code>detail</code> written for people. Each type has a short page with
                  what to do.
                </p>
              }
            >
              <ScrollTable label="Problem types">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {reference.problems.map(problem => (
                    <tr key={problem.slug} id={`problem-${problem.slug}`} className="scroll-mt-28">
                      <td>
                        <a href={`/problems/${problem.slug}`}>
                          <code className="whitespace-normal!">
                            {problem.slug.split(/(?<=_)/).map((part, index) => (
                              <Fragment key={index}>
                                {index > 0 ? <wbr /> : null}
                                {part}
                              </Fragment>
                            ))}
                          </code>
                        </a>
                      </td>
                      <td className="numeric">{problem.status}</td>
                      <td>
                        {problem.title}: <Inline text={problem.usedFor} />.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            </DocSection>

            <DocSection id="rate-limits" number={5} title="Rate limits">
              <ScrollTable label="Rate limits">
                <thead>
                  <tr>
                    <th scope="col">Group</th>
                    <th scope="col">Applies to</th>
                    <th scope="col">Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimits.map(row => (
                    <tr key={row.group}>
                      <td>
                        <code>{row.group}</code>
                      </td>
                      <td>{row.appliesTo}</td>
                      <td className="numeric whitespace-nowrap text-fg">{row.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
              <p className={cn(proseCode, 'max-w-reading')}>
                <Inline text={rateLimitNote} />
              </p>
            </DocSection>

            <DocSection id="versioning" number={6} title="Versioning and deprecation">
              <div className={cn(proseCode, 'grid max-w-reading gap-4')}>
                {versioningParagraphs.map(paragraph => (
                  <p key={paragraph}>
                    <Inline text={paragraph} />
                  </p>
                ))}
              </div>
            </DocSection>

            <DocSection id="more" number={7} title="More">
              <ul className="not-prose grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {moreLinks.map(link => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="group surface-duel flex h-full flex-col gap-1.5 p-5 transition-transform duration-(--dur-base) ease-out-expo hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <span className="flex items-center justify-between gap-3 text-ui font-semibold text-fg">
                        {link.label}
                        <ArrowUpRight
                          aria-hidden="true"
                          strokeWidth={1.75}
                          className="size-4 text-muted transition-transform duration-(--dur-base) group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </span>
                      <span className="text-ui-sm text-fg-soft">{link.note}.</span>
                    </a>
                  </li>
                ))}
              </ul>
            </DocSection>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
