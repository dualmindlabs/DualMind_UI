import { describe, expect, it } from 'vitest';

import { rateLimits } from '@/features/developers/lib/content';
import { buildReference, operationId } from '@/features/developers/lib/reference';
import { openApiDocument } from '@/features/developers/lib/spec';

import { PROBLEM_TYPES } from '../../../../../server/problem-types.js';
import { RATE_LIMIT_GROUPS } from '../../../../../server/rate-limit.js';

const reference = buildReference(openApiDocument);

describe('buildReference on the committed OpenAPI document', () => {
  it('has every operation of the document exactly once, with a unique anchor', () => {
    const expected = Object.entries(openApiDocument.paths).flatMap(([path, item]) =>
      Object.keys(item).map(method => `${method.toUpperCase()} ${path}`),
    );
    expect(reference.operations.map(operation => `${operation.method} ${operation.path}`)).toEqual(
      expected,
    );
    const ids = reference.operations.map(operation => operation.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('get-api-v2-leaderboard');
    expect(ids).toContain('get-api-v2-health');
  });

  it('lists every parameter and every declared response of every operation', () => {
    for (const operation of reference.operations) {
      const source = openApiDocument.paths[operation.path]?.[operation.method.toLowerCase()];
      expect(operation.parameters.length, operation.id).toBe(source?.parameters?.length ?? 0);
      expect(operation.responses.map(response => response.status).sort(), operation.id).toEqual(
        Object.keys(source?.responses ?? {}).sort(),
      );
    }
  });

  it('gives every JSON response a valid JSON example, and no body none', () => {
    for (const operation of reference.operations) {
      for (const response of operation.responses) {
        if (response.contentType) {
          expect(response.example, `${operation.id} ${response.status}`).not.toBeNull();
          expect(
            () => {
              JSON.parse(response.example ?? '');
            },
            `${operation.id} ${response.status}`,
          ).not.toThrow();
        } else {
          expect(response.example).toBeNull();
        }
      }
    }
  });

  it('shows a realistic leaderboard example from the schema examples', () => {
    const leaderboard = reference.operations.find(
      operation => operation.id === 'get-api-v2-leaderboard',
    );
    const ok = leaderboard?.responses.find(response => response.status === '200');
    const body = JSON.parse(ok?.example ?? '{}') as {
      items: { modelName: string; winRate: number }[];
      meta: { provisionalBelow: number };
    };
    expect(body.items[0]?.modelName).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(body.items[0]?.winRate).toBe(64.58);
    expect(body.meta.provisionalBelow).toBe(5);
    expect(leaderboard?.requiresAuth).toBe(false);
    expect(
      reference.operations.find(operation => operation.id === 'get-api-v2-me')?.requiresAuth,
    ).toBe(true);
  });

  it('builds problem examples from the registry', () => {
    const me = reference.operations.find(operation => operation.id === 'get-api-v2-me');
    const unauthorized = me?.responses.find(response => response.status === '401');
    expect(JSON.parse(unauthorized?.example ?? '{}') as unknown).toMatchObject({
      status: 401,
      title: 'Unauthorized',
      type: 'https://arena.dualmindlab.tech/problems/unauthorized',
    });
  });

  it('lists every problem type of the registry with its status and help text', () => {
    expect(reference.problems.map(problem => problem.slug)).toEqual(Object.keys(PROBLEM_TYPES));
    for (const problem of reference.problems) {
      expect(problem.help.length, problem.slug).toBeGreaterThan(20);
      expect(problem.url).toBe(`https://arena.dualmindlab.tech/problems/${problem.slug}`);
    }
  });

  it('carries the title, version and base URL of the document', () => {
    expect(reference.title).toBe(openApiDocument.info.title);
    expect(reference.version).toBe(openApiDocument.info.version);
    expect(reference.baseUrl).toBe('https://arena.dualmindlab.tech');
  });
});

describe('operationId', () => {
  it('makes a lower-case kebab-case anchor', () => {
    expect(operationId('get', '/api/v2/health')).toBe('get-api-v2-health');
    expect(operationId('post', '/api/v2/things/{id}')).toBe('post-api-v2-things-id');
  });
});

describe('rate limit copy', () => {
  it('matches RATE_LIMIT_GROUPS in server/rate-limit.js', () => {
    const groups = RATE_LIMIT_GROUPS as Record<string, { limit: number; period: number }>;
    expect(rateLimits.map(row => row.group).sort()).toEqual(Object.keys(groups).sort());
    for (const row of rateLimits) {
      const group = groups[row.group];
      expect(row.limit, row.group).toBe(`${group?.limit} per ${group?.period} seconds`);
    }
  });
});
