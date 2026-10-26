import { Globe, LockKeyhole } from 'lucide-react';
import { Fragment } from 'react';

import { Badge, type BadgeVariant } from '@/components/ui/badge';

import type { ReferenceOperation } from '../lib/reference';
import { CodeBlock } from './code-block';
import { Inline } from './inline';
import { ScrollTable } from './scroll-table';

const methodVariant: Record<string, BadgeVariant> = {
  GET: 'mind-a',
  HEAD: 'mind-a',
  POST: 'mind-b',
  PUT: 'human',
  PATCH: 'human',
  DELETE: 'bad',
};

/** The status as a badge: the dot carries the class (2xx ok, 3xx and 4xx warn, 5xx bad). */
function statusVariant(status: string): BadgeVariant {
  if (status.startsWith('2')) return 'ok';
  if (status.startsWith('5')) return 'bad';
  return 'warn';
}

/** One operation of the OpenAPI document: what it does, its parameters, and every response. */
export function OperationCard({ operation }: { operation: ReferenceOperation }) {
  const headingId = `${operation.id}-title`;
  return (
    <section
      id={operation.id}
      aria-labelledby={headingId}
      className="not-prose surface-duel scroll-mt-28 p-5 sm:p-7"
    >
      <h3 id={headingId} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant={methodVariant[operation.method.toUpperCase()] ?? 'neutral'}>
          {operation.method}
        </Badge>
        <code className="font-mono text-ui font-medium break-all text-fg">{operation.path}</code>
      </h3>
      {operation.summary ? (
        <p className="mt-4 text-lead [text-wrap:pretty] text-fg">{operation.summary}</p>
      ) : null}
      {operation.description ? (
        <p className="mt-3 max-w-reading text-body leading-relaxed text-fg-soft [&_code]:rounded-sm [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-fg">
          <Inline text={operation.description} />
        </p>
      ) : null}
      <p className="mt-5 flex w-fit items-center gap-2.5 rounded-md border border-line bg-surface-2 px-3 py-2 text-ui-sm text-fg-soft">
        {operation.requiresAuth ? (
          <>
            <LockKeyhole aria-hidden="true" strokeWidth={1.75} className="size-4 text-human" />
            <span>
              Needs{' '}
              <code className="font-mono text-fg">Authorization: Bearer &lt;access token&gt;</code>.
            </span>
          </>
        ) : (
          <>
            <Globe aria-hidden="true" strokeWidth={1.75} className="size-4 text-mind-a" />
            Public: no sign-in and no key.
          </>
        )}
      </p>

      {operation.parameters.length > 0 ? (
        <>
          <h4 className="mt-8 mb-3 eyebrow text-muted">Parameters</h4>
          <ScrollTable label={`Parameters of ${operation.method} ${operation.path}`}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">In</th>
                <th scope="col">Type</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {operation.parameters.map(parameter => (
                <tr key={`${parameter.location}-${parameter.name}`}>
                  <td>
                    <code>{parameter.name}</code>
                    {parameter.required ? ' (required)' : ''}
                  </td>
                  <td>{parameter.location}</td>
                  <td>{parameter.type}</td>
                  <td>{parameter.description}</td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        </>
      ) : null}

      <h4 className="mt-8 mb-3 eyebrow text-muted">Responses</h4>
      <ScrollTable label={`Responses of ${operation.method} ${operation.path}`}>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Meaning</th>
            <th scope="col">Content type</th>
          </tr>
        </thead>
        <tbody>
          {operation.responses.map(response => (
            <tr key={response.status}>
              <td>
                <Badge variant={statusVariant(response.status)}>
                  <code className="bg-transparent! p-0! font-mono text-inherit!">
                    {response.status}
                  </code>
                </Badge>
              </td>
              <td>
                {response.description}
                {response.headers.length > 0 ? (
                  <>
                    {' '}
                    Headers:{' '}
                    {response.headers.map((header, index) => (
                      <span key={header.name}>
                        {index > 0 ? ', ' : ''}
                        <code>{header.name}</code>
                      </span>
                    ))}
                    .
                  </>
                ) : null}
              </td>
              <td>
                {response.contentType ? (
                  <code>
                    {response.contentType.split(/(?<=[/+])/).map((part, index) => (
                      <Fragment key={index}>
                        {index > 0 ? <wbr /> : null}
                        {part}
                      </Fragment>
                    ))}
                  </code>
                ) : (
                  'no body'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>

      {operation.responses
        .filter(response => response.example !== null)
        .map(response => (
          <div key={response.status} className="mt-6">
            <p className="mb-3 flex items-center gap-2 eyebrow text-muted">
              Example <span className="numeric text-fg-soft">{response.status}</span>
            </p>
            <CodeBlock
              code={response.example ?? ''}
              language="json"
              title={`${response.status} response`}
              label={`Example ${response.status} response of ${operation.method} ${operation.path}`}
            />
          </div>
        ))}
    </section>
  );
}
