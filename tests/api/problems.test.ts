import { describe, expect, it } from 'vitest';
import { PROBLEM_BASE_URL, PROBLEM_TYPES } from '../../server/problem-types.js';
import { problem, ProblemError, type ProblemSlug } from '../../server/v2/problems.ts';

describe('problem+json', () => {
  for (const [slug, entry] of Object.entries(PROBLEM_TYPES)) {
    it(`builds ${slug}`, async () => {
      const response = problem(slug as ProblemSlug, { detail: 'safe text' }, 'req-12345678', '/api/v2/x');
      expect(response.status).toBe(entry.status);
      expect(response.headers.get('content-type')).toBe('application/problem+json; charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-request-id')).toBe('req-12345678');
      expect(await response.json()).toEqual({
        type: `${PROBLEM_BASE_URL}${slug}`,
        title: entry.title,
        status: entry.status,
        detail: 'safe text',
        instance: '/api/v2/x',
        requestId: 'req-12345678',
      });
    });
  }

  it('carries the extension members and headers only when given', async () => {
    const response = problem(
      'rate_limited',
      { retryAfter: 7, errors: [{ path: 'limit', message: 'too big' }], feature: 'f', headers: { Allow: 'GET' } },
      'req-12345678',
      '/api/v2/x',
    );
    expect(response.headers.get('retry-after')).toBe('7');
    expect(response.headers.get('allow')).toBe('GET');
    expect(await response.json()).toMatchObject({ retryAfter: 7, feature: 'f', errors: [{ path: 'limit', message: 'too big' }] });
  });

  it('ProblemError keeps its slug and options', () => {
    const error = new ProblemError('forbidden', { detail: 'no' });
    expect(error).toBeInstanceOf(Error);
    expect(error.slug).toBe('forbidden');
    expect(error.options.detail).toBe('no');
  });
});
