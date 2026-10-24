// The text routes of BE-5, answered by the Worker outside /api/: /leaderboard.md, /llms.txt,
// /problems/ and /problems/<slug>. worker.js calls serveDocRoute() for isDocRoute() paths,
// after the pre-launch gate. GET and HEAD only; ETag and 304 on all of them.

import type { ExecutionContext } from 'hono';
import { PROBLEM_TYPES } from '../../problem-types.js';
import { resolveRequestId } from '../../request-id.js';
import type { Env } from '../env.ts';
import { ifNoneMatchHits } from '../leaderboard/etag.ts';
import { cacheStatus, getLeaderboard } from '../leaderboard/service.ts';
import { log } from '../log.ts';
import { problem, ProblemError, type ProblemSlug } from '../problems.ts';
import { renderLeaderboardMarkdown } from './leaderboard-md.ts';
import { renderLlmsTxt } from './llms.ts';
import { problemSlugFromPath, renderProblemIndex, renderProblemPage } from './problems.ts';
import { prefersHtml, renderProblemIndexHtml, renderProblemPageHtml } from './problems-html.ts';

export const LEADERBOARD_MD_PATH = '/leaderboard.md';
export const LLMS_PATH = '/llms.txt';
export const PROBLEMS_PATH = '/problems';

const CACHE_LEADERBOARD = 'public, max-age=60, stale-while-revalidate=600';
const CACHE_STATIC = 'public, max-age=3600, stale-while-revalidate=86400';

export function isDocRoute(pathname: string): boolean {
  return pathname === LEADERBOARD_MD_PATH || pathname === LLMS_PATH || pathname === PROBLEMS_PATH || pathname.startsWith(`${PROBLEMS_PATH}/`);
}

async function shortHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 8), byte => byte.toString(16).padStart(2, '0')).join('');
}

type RouteName = 'leaderboard.md' | 'llms.txt' | 'problems';

async function textResponse(
  request: Request,
  requestId: string,
  route: RouteName,
  options: { body: string; type: string; cacheControl: string; etagPrefix: string; extra?: Record<string, string> },
): Promise<Response> {
  const etag = `"${options.etagPrefix}-${await shortHash(options.body)}"`;
  const headers = new Headers({
    'Content-Type': options.type,
    'Cache-Control': options.cacheControl,
    ETag: etag,
    'X-Request-Id': requestId,
    ...options.extra,
  });
  const notModified = ifNoneMatchHits(request.headers.get('if-none-match'), etag);
  const status = notModified ? 304 : 200;
  log({ event: 'doc_route', requestId, route, status, cache: notModified ? '304' : '200' });
  if (notModified || request.method === 'HEAD') {
    return new Response(null, { status, headers });
  }
  return new Response(options.body, { status, headers });
}

/** Answers a doc route. Never throws: failures are problem+json responses. */
export async function serveDocRoute(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const requestId = resolveRequestId(request.headers.get('x-request-id'));
  const fail = (slug: ProblemSlug, detail: string, extra: { retryAfter?: number; headers?: Record<string, string> } = {}) => {
    log({ event: 'doc_route', requestId, route: url.pathname, status: PROBLEM_TYPES[slug]!.status, cache: 'none' });
    return problem(slug, { detail, ...extra }, requestId, url.pathname);
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return fail('method_not_allowed', 'Use GET or HEAD on this path.', { headers: { Allow: 'GET, HEAD' } });
  }
  const origin = url.origin;

  if (url.pathname === LLMS_PATH) {
    return textResponse(request, requestId, 'llms.txt', {
      body: renderLlmsTxt(origin),
      type: 'text/plain; charset=utf-8',
      cacheControl: CACHE_STATIC,
      etagPrefix: 'llms',
    });
  }

  if (url.pathname === LEADERBOARD_MD_PATH) {
    try {
      const result = await getLeaderboard(env, ctx, requestId, request.url);
      return await textResponse(request, requestId, 'leaderboard.md', {
        body: renderLeaderboardMarkdown(result.data, origin),
        type: 'text/markdown; charset=utf-8',
        cacheControl: CACHE_LEADERBOARD,
        etagPrefix: 'lbmd',
        extra: { 'Cache-Status': cacheStatus(result) },
      });
    } catch (error) {
      if (error instanceof ProblemError) return problem(error.slug, error.options, requestId, url.pathname);
      log({ event: 'api_error', requestId, type: 'internal_error', status: 500, error: String(error) });
      return problem('internal_error', { detail: 'Something went wrong on our side.' }, requestId, url.pathname);
    }
  }

  // /problems, /problems/ and /problems/<slug>: a styled page for a browser (Accept names
  // text/html), Markdown for everything else. Vary: Accept keeps caches from mixing the two.
  const html = prefersHtml(request.headers.get('accept'));
  const problemsOptions = (body: string) => ({
    body,
    type: html ? 'text/html; charset=utf-8' : 'text/markdown; charset=utf-8',
    cacheControl: CACHE_STATIC,
    etagPrefix: html ? 'problems-html' : 'problems',
    extra: { Vary: 'Accept' },
  });
  if (url.pathname === PROBLEMS_PATH || url.pathname === `${PROBLEMS_PATH}/`) {
    return textResponse(
      request,
      requestId,
      'problems',
      problemsOptions(html ? renderProblemIndexHtml(origin) : renderProblemIndex(origin)),
    );
  }
  const slug = problemSlugFromPath(url.pathname);
  if (slug) {
    return textResponse(
      request,
      requestId,
      'problems',
      problemsOptions(html ? renderProblemPageHtml(slug, origin) : renderProblemPage(slug, origin)),
    );
  }
  return fail('not_found', 'No such problem type.');
}
