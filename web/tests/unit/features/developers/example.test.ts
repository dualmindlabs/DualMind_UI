import { describe, expect, it } from 'vitest';

import { exampleFor } from '@/features/developers/lib/example';
import type { OpenApiDocument } from '@/features/developers/lib/spec';

const doc: OpenApiDocument = {
  openapi: '3.1.0',
  info: { title: 'T', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Item: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'llama' },
          score: { type: 'number', minimum: 10 },
          count: { type: 'integer' },
          flag: { type: 'boolean' },
          at: { type: 'string', format: 'date-time' },
          kind: { enum: ['a', 'b'] },
          maybe: { type: ['string', 'null'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      Loop: { type: 'object', properties: { next: { $ref: '#/components/schemas/Loop' } } },
    },
  },
};

describe('exampleFor', () => {
  it('builds a value from the type, format, minimum and enum, and prefers a written example', () => {
    expect(exampleFor({ $ref: '#/components/schemas/Item' }, doc)).toEqual({
      id: '3f6c7f0e-5d2b-4f0a-9f3e-0b9a6a1d2c11',
      name: 'llama',
      score: 10,
      count: 0,
      flag: true,
      at: '2026-10-21T08:30:00.000Z',
      kind: 'a',
      maybe: 'string',
      tags: ['string'],
    });
  });

  it('uses examples, default and const, and the first non-null variant', () => {
    expect(exampleFor({ type: 'string', examples: ['x'] }, doc)).toBe('x');
    expect(exampleFor({ type: 'integer', default: 7 }, doc)).toBe(7);
    expect(exampleFor({ const: 'ok' }, doc)).toBe('ok');
    expect(exampleFor({ anyOf: [{ type: 'null' }, { type: 'integer' }] }, doc)).toBe(0);
  });

  it('merges allOf objects and stops on a reference cycle or an unknown reference', () => {
    expect(
      exampleFor(
        {
          allOf: [
            { type: 'object', properties: { a: { type: 'integer' } } },
            { type: 'object', properties: { b: { type: 'boolean' } } },
          ],
        },
        doc,
      ),
    ).toEqual({ a: 0, b: true });
    expect(JSON.stringify(exampleFor({ $ref: '#/components/schemas/Loop' }, doc))).toContain(
      'null',
    );
    expect(exampleFor({ $ref: '#/components/schemas/Missing' }, doc)).toBeNull();
    expect(exampleFor({ $ref: 'https://elsewhere/x' }, doc)).toBeNull();
  });
});
