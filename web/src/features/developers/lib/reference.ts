import { PROBLEM_TYPES, problemTypeUrl } from '@api-problems';

import { exampleFor } from './example';
import type { OpenApiDocument, OpenApiOperation, OpenApiSchema } from './spec';

const METHODS = ['get', 'put', 'post', 'patch', 'delete', 'head', 'options'] as const;
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

export interface ReferenceParameter {
  name: string;
  location: string;
  required: boolean;
  type: string;
  description: string;
}

export interface ReferenceHeader {
  name: string;
  description: string;
}

export interface ReferenceResponse {
  status: string;
  description: string;
  contentType: string | null;
  /** Pretty-printed JSON example, or null for a response without a body. */
  example: string | null;
  headers: ReferenceHeader[];
  isError: boolean;
}

export interface ReferenceOperation {
  /** Anchor id, unique per operation: `get-api-v2-health`. */
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  requiresAuth: boolean;
  parameters: ReferenceParameter[];
  responses: ReferenceResponse[];
}

export interface ReferenceProblem {
  slug: string;
  status: number;
  title: string;
  usedFor: string;
  help: string;
  url: string;
}

export interface Reference {
  title: string;
  version: string;
  baseUrl: string;
  operations: ReferenceOperation[];
  problems: ReferenceProblem[];
}

/** `GET /api/v2/health` -> `get-api-v2-health`. */
export function operationId(method: string, path: string): string {
  return `${method}-${path}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function typeLabel(schema: OpenApiSchema | undefined): string {
  if (!schema) return 'any';
  if (schema.type) return Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type;
  return 'any';
}

/** The error example: the registry's own title and the status of the response. */
function problemExample(status: number): unknown {
  const entry = Object.entries(PROBLEM_TYPES).find(([, value]) => value.status === status);
  return {
    type: problemTypeUrl(entry?.[0] ?? 'internal_error'),
    title: entry?.[1].title ?? 'Error',
    status,
    detail: 'A sentence for people, safe to show.',
    instance: '/api/v2/example',
    requestId: '4b6a3c0e-6f0b-4a3e-9d1a-2d3f1c9b7a10',
  };
}

function buildOperation(
  doc: OpenApiDocument,
  path: string,
  method: string,
  operation: OpenApiOperation,
): ReferenceOperation {
  const responses: ReferenceResponse[] = Object.entries(operation.responses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, response]) => {
      const entries = Object.entries(response.content ?? {});
      const [contentType, media] = entries[0] ?? [null, undefined];
      let example: string | null = null;
      if (contentType === PROBLEM_CONTENT_TYPE) {
        example = JSON.stringify(problemExample(Number(status)), null, 2);
      } else if (media?.schema) {
        example = JSON.stringify(exampleFor(media.schema, doc), null, 2);
      }
      return {
        status,
        description: response.description ?? '',
        contentType,
        example,
        headers: Object.entries(response.headers ?? {}).map(([name, header]) => ({
          name,
          description: header.description ?? '',
        })),
        isError: Number(status) >= 400,
      };
    });

  return {
    id: operationId(method, path),
    method: method.toUpperCase(),
    path,
    summary: operation.summary ?? '',
    description: operation.description ?? '',
    requiresAuth: '401' in operation.responses,
    parameters: (operation.parameters ?? []).map(parameter => ({
      name: parameter.name,
      location: parameter.in,
      required: parameter.required ?? false,
      type: typeLabel(parameter.schema),
      description: parameter.description ?? '',
    })),
    responses,
  };
}

/** Everything the reference page shows, from the OpenAPI document and the problem registry. */
export function buildReference(doc: OpenApiDocument): Reference {
  const operations = Object.entries(doc.paths).flatMap(([path, item]) =>
    METHODS.flatMap(method => {
      const operation = item[method];
      return operation ? [buildOperation(doc, path, method, operation)] : [];
    }),
  );
  return {
    title: doc.info.title,
    version: doc.info.version,
    baseUrl: doc.servers?.[0]?.url ?? '',
    operations,
    problems: Object.entries(PROBLEM_TYPES).map(([slug, entry]) => ({
      slug,
      status: entry.status,
      title: entry.title,
      usedFor: entry.usedFor,
      help: entry.help,
      url: problemTypeUrl(slug),
    })),
  };
}
