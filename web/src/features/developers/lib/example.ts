import type { OpenApiDocument, OpenApiSchema } from './spec';

const MAX_DEPTH = 8;

/** Resolves `#/components/schemas/<Name>`; anything else is not followed. */
function resolveRef(ref: string, doc: OpenApiDocument): OpenApiSchema | undefined {
  const prefix = '#/components/schemas/';
  return ref.startsWith(prefix) ? doc.components?.schemas?.[ref.slice(prefix.length)] : undefined;
}

function stringExample(format: string | undefined): string {
  switch (format) {
    case 'uuid':
      return '3f6c7f0e-5d2b-4f0a-9f3e-0b9a6a1d2c11';
    case 'date-time':
      return '2026-10-21T08:30:00.000Z';
    case 'date':
      return '2026-10-21';
    case 'uri':
      return 'https://arena.dualmindlab.tech/';
    case 'email':
      return 'name@example.com';
    default:
      return 'string';
  }
}

/**
 * An example value for a schema: the schema's own `example`, `examples`, `default`, `const` or
 * first `enum` value when it has one, else a value built from its type, so a reader sees the
 * shape of a response even when no example was written. Pure and deterministic.
 */
export function exampleFor(schema: OpenApiSchema, doc: OpenApiDocument, depth = 0): unknown {
  if (depth > MAX_DEPTH) return null;
  if (schema.$ref) {
    const target = resolveRef(schema.$ref, doc);
    return target ? exampleFor(target, doc, depth + 1) : null;
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.examples?.[0] !== undefined) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.[0] !== undefined) return schema.enum[0];

  const variants = schema.oneOf ?? schema.anyOf;
  if (variants?.length) {
    const first = variants.find(variant => variant.type !== 'null') ?? variants[0];
    return first ? exampleFor(first, doc, depth + 1) : null;
  }
  if (schema.allOf?.length) {
    const merged: Record<string, unknown> = {};
    for (const part of schema.allOf) {
      const value = exampleFor(part, doc, depth + 1);
      if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(merged, value);
    }
    return merged;
  }

  const type = Array.isArray(schema.type)
    ? (schema.type.find(item => item !== 'null') ?? 'null')
    : schema.type;
  switch (type) {
    case 'object': {
      const result: Record<string, unknown> = {};
      for (const [name, property] of Object.entries(schema.properties ?? {})) {
        result[name] = exampleFor(property, doc, depth + 1);
      }
      return result;
    }
    case 'array':
      return schema.items ? [exampleFor(schema.items, doc, depth + 1)] : [];
    case 'string':
      return stringExample(schema.format);
    case 'integer':
    case 'number':
      return schema.minimum ?? 0;
    case 'boolean':
      return true;
    default:
      return schema.properties ? exampleFor({ ...schema, type: 'object' }, doc, depth + 1) : null;
  }
}
