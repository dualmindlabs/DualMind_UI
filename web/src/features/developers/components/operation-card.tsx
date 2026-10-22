import { Badge } from '@/components/ui/badge';

import type { ReferenceOperation } from '../lib/reference';
import { CodeBlock } from './code-block';
import { Inline } from './inline';
import { ScrollTable } from './scroll-table';

/** One operation of the OpenAPI document: what it does, its parameters, and every response. */
export function OperationCard({ operation }: { operation: ReferenceOperation }) {
  const headingId = `${operation.id}-title`;
  return (
    <section
      id={operation.id}
      aria-labelledby={headingId}
      className="scroll-mt-24 border-t border-line pt-8"
    >
      <h3 id={headingId} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant="mind-a">{operation.method}</Badge>
        <code className="break-all">{operation.path}</code>
      </h3>
      {operation.summary ? <p className="lead">{operation.summary}</p> : null}
      {operation.description ? (
        <p>
          <Inline text={operation.description} />
        </p>
      ) : null}
      <p>
        {operation.requiresAuth ? (
          <>
            Needs <code>Authorization: Bearer &lt;access token&gt;</code>.
          </>
        ) : (
          <>Public: no sign-in and no key.</>
        )}
      </p>

      {operation.parameters.length > 0 ? (
        <>
          <h4>Parameters</h4>
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

      <h4>Responses</h4>
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
                <code>{response.status}</code>
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
              <td>{response.contentType ? <code>{response.contentType}</code> : 'no body'}</td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>

      {operation.responses
        .filter(response => response.example !== null)
        .map(response => (
          <div key={response.status} className="mt-4">
            <p className="font-mono text-label tracking-[0.16em] text-muted uppercase">
              Example {response.status}
            </p>
            <CodeBlock
              code={response.example ?? ''}
              label={`Example ${response.status} response of ${operation.method} ${operation.path}`}
            />
          </div>
        ))}
    </section>
  );
}
