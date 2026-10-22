import { Fragment } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';

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

/**
 * /developers/: the API reference. Plain, prerendered HTML built from docs/api/openapi.v2.json
 * and the problem registry (no renderer library, no script beyond the app shell).
 */
export function DevelopersPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <div className="border-b border-line bg-bg-deep">
          <div className="mx-auto max-w-page px-4 pt-12 pb-12 sm:px-6 md:pt-16 md:pb-16">
            <p className="eyebrow text-muted">{developersPage.eyebrow}</p>
            <h1
              id="page-title"
              className="mt-5 max-w-[18ch] text-h1 font-medium text-balance text-fg sm:max-w-[22ch]"
            >
              {developersPage.heading.text}{' '}
              <span className="human-voice text-human">{developersPage.heading.human}</span>
            </h1>
            <p className="mt-6 max-w-reading text-h3 font-normal [text-wrap:pretty] text-fg-soft">
              {developersPage.intro}
            </p>
            <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-sm text-muted">
              <span className="eyebrow">API version</span>
              <span className="text-fg-soft tabular-nums">{reference.version}</span>
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-page px-4 py-10 sm:px-6 md:py-14">
          <nav aria-label="On this page" className="mb-10">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-ui-sm">
              {sections.map(section => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-8 items-center text-fg-soft underline decoration-line-strong underline-offset-4 hover:text-fg pointer-coarse:min-h-11"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="prose max-w-reading min-w-0">
            <section id="overview" aria-labelledby="overview-title" className="scroll-mt-24">
              <h2 id="overview-title">Overview</h2>
              <p>
                The base URL is <code>{reference.baseUrl}/api/v2</code>. {reference.title} is
                described by an OpenAPI 3.1 document you can{' '}
                <a href="/api/v2/openapi.json">download</a>.
              </p>
              <ul>
                {conventions.map(item => (
                  <li key={item}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            </section>

            <section id="quickstart" aria-labelledby="quickstart-title" className="scroll-mt-24">
              <h2 id="quickstart-title">Quickstart</h2>
              <p>
                The leaderboard is public. This reads it and prints the top model and when the data
                last changed.
              </p>
              {quickstart.map(snippet => (
                <div key={snippet.id}>
                  <h3 id={`quickstart-${snippet.id}`}>{snippet.label}</h3>
                  <CodeBlock code={snippet.code} label={`${snippet.label} example`} />
                </div>
              ))}
            </section>

            <section id="operations" aria-labelledby="operations-title" className="scroll-mt-24">
              <h2 id="operations-title">Operations</h2>
              <p>
                Generated from the OpenAPI document: {reference.operations.length} operations at
                version {reference.version}.
              </p>
              {reference.operations.map(operation => (
                <OperationCard key={operation.id} operation={operation} />
              ))}
            </section>

            <section id="problems" aria-labelledby="problems-title" className="scroll-mt-24">
              <h2 id="problems-title">Errors</h2>
              <p>
                Every error is <code>application/problem+json</code> with a <code>type</code> that
                names one of these problems, a <code>status</code>, a <code>requestId</code> and
                usually a <code>detail</code> written for people. Each type has a short page with
                what to do.
              </p>
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
                    <tr key={problem.slug} id={`problem-${problem.slug}`}>
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
                      <td>{problem.status}</td>
                      <td>
                        {problem.title}: <Inline text={problem.usedFor} />.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            </section>

            <section id="rate-limits" aria-labelledby="rate-limits-title" className="scroll-mt-24">
              <h2 id="rate-limits-title">Rate limits</h2>
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
                      <td>{row.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
              <p>
                <Inline text={rateLimitNote} />
              </p>
            </section>

            <section id="versioning" aria-labelledby="versioning-title" className="scroll-mt-24">
              <h2 id="versioning-title">Versioning and deprecation</h2>
              {versioningParagraphs.map(paragraph => (
                <p key={paragraph}>
                  <Inline text={paragraph} />
                </p>
              ))}
            </section>

            <section id="more" aria-labelledby="more-title" className="scroll-mt-24">
              <h2 id="more-title">More</h2>
              <ul>
                {moreLinks.map(link => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>: {link.note}.
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
