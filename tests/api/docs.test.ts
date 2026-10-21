import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import committed from '../../docs/api/openapi.v2.json';
import { PROBLEM_TYPES } from '../../server/problem-types.js';
import { renderLeaderboardMarkdown, escapeMarkdownCell } from '../../server/v2/docs/leaderboard-md.ts';
import { renderLlmsTxt } from '../../server/v2/docs/llms.ts';
import { renderProblemIndex, renderProblemPage } from '../../server/v2/docs/problems.ts';
import { isDocRoute } from '../../server/v2/docs/routes.ts';
import { resetLeaderboardState } from '../../server/v2/leaderboard/service.ts';
import { problemSchema } from '../../contract/common.ts';
import type { LeaderboardResponse } from '../../contract/leaderboard.ts';
import worker from '../../worker.js';
import { baseEnv } from './helpers.ts';
import { expectedItems, recordedBody } from './fixtures/model-stats.ts';

// BE-5: the OpenAPI document route and the text routes, through the real worker.js.

const cookie = { Cookie: 'dm_preview=1' };
const workerEnv = () => ({ ...env, ...baseEnv, BACKEND_URL: 'https://backend.test' });
let counter = 0;
let host = '';
let clock = 1_800_000_000_000;

function call(path: string, init: RequestInit = {}) {
  const { headers, ...rest } = init;
  return worker.fetch(
    new Request(`https://${host}${path}`, { ...rest, headers: { ...cookie, 'CF-Connecting-IP': `198.51.100.${(counter += 1) % 250}`, ...(headers as Record<string, string> | undefined) } }),
    workerEnv(),
    undefined,
  );
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function upstream(handler: () => Response = () => json(recordedBody)) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => handler());
}

beforeEach(() => {
  counter += 1;
  host = `docs${counter}.arena-test.dualmindlab.tech`;
  clock = 1_800_000_000_000 + counter * 10_000_000;
  resetLeaderboardState();
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(() => vi.restoreAllMocks());

describe('GET /api/v2/openapi.json', () => {
  it('serves the committed document with an ETag and cache headers', async () => {
    const response = await call('/api/v2/openapi.json');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300, stale-while-revalidate=3600');
    expect(response.headers.get('etag')).toMatch(/^"oa-[0-9a-f]{16}"$/);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await response.json()).toEqual(committed);
  });

  it('answers 304, HEAD and 405', async () => {
    const first = await call('/api/v2/openapi.json');
    const etag = first.headers.get('etag')!;
    const notModified = await call('/api/v2/openapi.json', { headers: { 'If-None-Match': etag } });
    expect(notModified.status).toBe(304);
    expect(await notModified.text()).toBe('');
    expect(notModified.headers.get('etag')).toBe(etag);
    const head = await call('/api/v2/openapi.json', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const post = await call('/api/v2/openapi.json', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
  });

  it('is OpenAPI 3.1 with every $ref resolvable and the API version of the health route', async () => {
    const doc = committed as unknown as { openapi: string; info: { version: string }; paths: Record<string, Record<string, { responses: Record<string, unknown> }>>; components?: { schemas?: Record<string, unknown> } };
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths).length).toBeGreaterThan(0);
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        expect(Object.keys(operation.responses).length, `${method} ${path}`).toBeGreaterThan(0);
      }
    }
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)].map(match => match[1]!);
    expect(refs.length).toBeGreaterThan(0);
    for (const name of refs) expect(doc.components?.schemas?.[name], name).toBeDefined();
    const health = (await (await call('/api/v2/health')).json()) as { apiVersion: string };
    expect(doc.info.version).toBe(health.apiVersion);
  });
});

describe('GET /llms.txt', () => {
  it('lists the entry points with this host as the origin', async () => {
    const response = await call('/llms.txt');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600, stale-while-revalidate=86400');
    expect(response.headers.get('etag')).toMatch(/^"llms-[0-9a-f]{16}"$/);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    const text = await response.text();
    expect(text).toBe(renderLlmsTxt(`https://${host}`));
    expect(text.startsWith('# DualMind Arena\n')).toBe(true);
    for (const path of ['/leaderboard.md', '/api/v2/leaderboard', '/api/v2/openapi.json', '/developers/', '/problems/']) {
      expect(text).toContain(`https://${host}${path}`);
    }
  });

  it('answers 304, HEAD and 405', async () => {
    const etag = (await call('/llms.txt')).headers.get('etag')!;
    expect((await call('/llms.txt', { headers: { 'If-None-Match': etag } })).status).toBe(304);
    const head = await call('/llms.txt', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const post = await call('/llms.txt', { method: 'POST', body: 'x' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
    expect(post.headers.get('content-type')).toContain('application/problem+json');
  });

  it('renders the production origin for production and the preview origin for previews', () => {
    expect(renderLlmsTxt('https://arena.dualmindlab.tech')).toContain('(https://arena.dualmindlab.tech/leaderboard.md)');
    expect(renderLlmsTxt('https://feat-x.example.workers.dev')).toContain('(https://feat-x.example.workers.dev/leaderboard.md)');
  });

  it('only links to the Arena origin through paths the Worker answers, and to well-formed external URLs', async () => {
    upstream();
    const text = await (await call('/llms.txt')).text();
    const links = [...text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(match => new URL(match[1]!));
    expect(links.length).toBeGreaterThanOrEqual(7);
    for (const link of links) {
      if (link.host === host) {
        const response = await call(link.pathname + link.search, { redirect: 'manual' });
        expect(response.status, link.href).toBeLessThan(400);
      } else {
        expect(link.protocol).toBe('https:');
      }
    }
    const markdown = await (await call('/leaderboard.md')).text();
    for (const match of markdown.matchAll(/(https:\/\/[^\s)]+)/g)) {
      const link = new URL(match[1]!);
      if (link.host === host) expect((await call(link.pathname, { redirect: 'manual' })).status, link.href).toBeLessThan(400);
    }
  });
});

describe('GET /problems/', () => {
  it('lists every problem type', async () => {
    const response = await call('/problems/');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    const text = await response.text();
    expect(text).toBe(renderProblemIndex(`https://${host}`));
    for (const slug of Object.keys(PROBLEM_TYPES)) expect(text).toContain(`/problems/${slug})`);
    expect((await call('/problems')).status).toBe(200);
  });

  it('has a page for every slug in the registry, with its status and help text', async () => {
    for (const [slug, entry] of Object.entries(PROBLEM_TYPES)) {
      expect(entry.help.length, slug).toBeGreaterThan(20);
      const response = await call(`/problems/${slug}`);
      expect(response.status, slug).toBe(200);
      const text = await response.text();
      expect(text.startsWith(`# ${slug} (HTTP ${entry.status})\n`), slug).toBe(true);
      expect(text).toContain(`What to do: ${entry.help}`);
      expect(text).toBe(renderProblemPage(slug as keyof typeof PROBLEM_TYPES, `https://${host}`));
    }
  });

  it('answers an unknown slug with a 404 problem and POST with 405', async () => {
    const missing = await call('/problems/nope');
    expect(missing.status).toBe(404);
    expect(problemSchema.parse(await missing.json())).toMatchObject({ status: 404, instance: '/problems/nope' });
    expect((await call('/problems/__proto__')).status).toBe(404);
    expect((await call('/problems/rate_limited', { method: 'POST', body: 'x' })).status).toBe(405);
  });
});

describe('GET /leaderboard.md', () => {
  it('renders the table from the BE-4 data and shares its cache', async () => {
    const fetchSpy = upstream();
    const markdown = await call('/leaderboard.md');
    expect(markdown.status).toBe(200);
    expect(markdown.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(markdown.headers.get('cache-control')).toBe('public, max-age=60, stale-while-revalidate=600');
    expect(markdown.headers.get('etag')).toMatch(/^"lbmd-[0-9a-f]{16}"$/);
    expect(markdown.headers.get('cache-status')).toBe('DualMind; fwd=miss');
    const text = await markdown.text();
    expect(text).toContain('| 1 | llama-3.3-70b-instruct-fp8-fast | cloudflare | 1150.0 | 64.58% | 96 |  |');
    expect(text).toContain('| 2 | llama-3.1-70b-instruct | cloudflare | 1140.0 | 61.60% | 250 |  |');
    expect(text).toContain(`Updated: ${new Date(clock).toISOString()}.`);
    expect(text).toContain('fewer than 5 battles');
    expect(text).toContain(`Data as JSON: https://${host}/api/v2/leaderboard`);
    const api = await call('/api/v2/leaderboard');
    expect(api.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('answers 304 and HEAD', async () => {
    upstream();
    const etag = (await call('/leaderboard.md')).headers.get('etag')!;
    expect((await call('/leaderboard.md', { headers: { 'If-None-Match': etag } })).status).toBe(304);
    const head = await call('/leaderboard.md', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect((await call('/leaderboard.md', { method: 'PUT', body: 'x' })).status).toBe(405);
  });

  it('answers a 502 problem with Retry-After when the source is down and there is no copy', async () => {
    upstream(() => json({ error: 'down' }, 500));
    const response = await call('/leaderboard.md');
    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toBe('application/problem+json; charset=utf-8');
    expect(response.headers.get('retry-after')).toBe('5');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(problemSchema.parse(await response.json()).instance).toBe('/leaderboard.md');
  });

  it('keeps the other doc routes working while the source is down', async () => {
    upstream(() => json({ error: 'down' }, 500));
    expect((await call('/leaderboard.md')).status).toBe(502);
    expect((await call('/llms.txt')).status).toBe(200);
    expect((await call('/problems/bad_gateway')).status).toBe(200);
    expect((await call('/api/v2/openapi.json')).status).toBe(200);
  });
});

describe('renderLeaderboardMarkdown', () => {
  const data = (overrides: Partial<LeaderboardResponse['items'][number]> = {}): LeaderboardResponse => ({
    items: [{ ...expectedItems[0]!, ...overrides }],
    meta: { generatedAt: '2026-10-21T08:30:00.000Z', count: 1, provisionalBelow: 5, source: 'dualmind-api:model-stats' },
  });

  it('escapes pipes, asterisks, backticks, brackets and newlines in model names', () => {
    expect(escapeMarkdownCell('a|b*c`d\ne_[x]')).toBe('a\\|b\\*c\\`d e\\_\\[x\\]');
    const text = renderLeaderboardMarkdown(data({ displayName: 'evil|name*\n# heading', providerName: 'p|q' }), 'https://x.test');
    const row = text.split('\n').find(line => line.startsWith('| 1 |'))!;
    expect(row).toContain('evil\\|name\\* # heading');
    expect(row.split(/(?<!\\)\|/).length).toBe(9);
  });

  it('marks provisional models as preliminary and handles an empty list', () => {
    expect(renderLeaderboardMarkdown(data({ provisional: true, totalResponses: 3 }), 'https://x.test')).toContain('| 3 | preliminary |');
    const empty = renderLeaderboardMarkdown({ items: [], meta: data().meta }, 'https://x.test');
    expect(empty).toContain('| Rank | Model |');
    expect(empty).not.toContain('| 1 |');
  });
});

describe('isDocRoute', () => {
  it('matches exactly the doc paths', () => {
    for (const path of ['/leaderboard.md', '/llms.txt', '/problems', '/problems/', '/problems/rate_limited']) expect(isDocRoute(path), path).toBe(true);
    for (const path of ['/leaderboard/', '/leaderboard.mdx', '/llms.txt/', '/problem', '/api/v2/leaderboard', '/']) expect(isDocRoute(path), path).toBe(false);
  });
});
