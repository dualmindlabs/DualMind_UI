import openApiJson from '@api-spec';

/** The parts of an OpenAPI 3.1 document the reference page reads. */
export interface OpenApiSchema {
  $ref?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  enum?: unknown[];
  const?: unknown;
  example?: unknown;
  examples?: unknown[];
  default?: unknown;
  minimum?: number;
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
}

export interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: OpenApiSchema;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, { schema?: OpenApiSchema }>;
  headers?: Record<string, { description?: string }>;
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  responses: Record<string, OpenApiResponse>;
}

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string }[];
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, OpenApiSchema> };
}

/**
 * The committed OpenAPI document (docs/api/openapi.v2.json), the file the Worker's contract tests
 * and the CI drift check verify. Importing it makes the web build fail if it is missing.
 */
export const openApiDocument = openApiJson as unknown as OpenApiDocument;
