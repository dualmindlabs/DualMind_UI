// The same-origin /api/* proxy to the DualMind API (ADR 0006, docs/architecture.md "API proxy").
//
// - Forwards only Authorization, Content-Type, Accept, Accept-Language and X-Request-Id; cookies,
//   client hints and everything else stay on the Arena origin.
// - Every request has an id: the caller's X-Request-Id when it looks sane, otherwise a new UUID.
//   It goes to the backend and comes back on the response, so logs on both sides line up.
// - No CORS: the Arena calls its own origin. The Worker sends no Access-Control-* headers and
//   strips the backend's, so other sites cannot read API responses through arena.dualmindlab.tech.
//   OPTIONS requests are proxied like any other method.
// - Upstream failure: 502 {"error":"bad_gateway","requestId"}; no upstream response within
//   the route's timeout: 504 {"error":"gateway_timeout","requestId"}. No error details leak.
//   The timeout is 30 s, except for the calls that wait on model answers (a battle runs two
//   models in parallel), which get 65 s so the client's own 60 s timeout fires first.
// - Bodies stream through untouched. Server-sent events (text/event-stream) are never cut by
//   the timeout once the stream has started; other responses must finish within it.
// - /api/health maps to the backend's /health.
// - Opt-in errors: a request whose Accept names application/problem+json gets RFC 9457 problem
//   bodies for every non-2xx answer, including the 502 and 504 above (server/problem-rewrite.js,
//   docs/backend/designs/BE-1-error-shape.md). Everyone else sees the v1 bodies byte for byte;
//   error responses add `Vary: Accept` either way.
// - /api/audio/tts is a deprecated alias of /api/speech/generate (server/audio-alias.js, BE-2).

import {
  ALIAS_ACCEPT,
  AUDIO_ALIAS,
  audioFromUpstream,
  DEPRECATION,
  isAudioAlias,
  parseAliasBody,
} from './audio-alias.js';
import { rewriteErrorResponse, workerProblemResponse, wantsProblemJson } from './problem-rewrite.js';

import { sanitizeRequestId } from './request-id.js';

export const DEFAULT_BACKEND_URL = 'https://api.dualmindlab.tech';
export const UPSTREAM_TIMEOUT_MS = 30_000;
export const MODEL_CALL_TIMEOUT_MS = 65_000;
/** Non-streaming calls that wait for model output. */
export const MODEL_CALL_PATHS = Object.freeze(['/api/arena/dualchat', '/api/arena/chat']);

/** @param {string} pathname */
export function upstreamTimeoutFor(pathname) {
  return MODEL_CALL_PATHS.includes(pathname) ? MODEL_CALL_TIMEOUT_MS : UPSTREAM_TIMEOUT_MS;
}
export const FORWARDED_REQUEST_HEADERS = Object.freeze([
  'authorization',
  'content-type',
  'accept',
  'accept-language',
  'x-request-id',
]);

// The rule lives in server/request-id.js, shared with the v2 router; re-exported for v1 callers.
export { sanitizeRequestId };

/** @param {string} pathname */
export function backendPathFor(pathname) {
  return pathname === '/api/health' ? '/health' : pathname;
}

/**
 * The Worker's own error answers: the v1 body, or a problem for callers that opted in.
 * @param {Request} request
 * @param {number} status
 * @param {string} error
 * @param {string} requestId
 * @param {Record<string, string>} [extraHeaders]
 */
function errorResponse(request, status, error, requestId, extraHeaders = {}) {
  if (wantsProblemJson(request)) {
    return workerProblemResponse({ status, request, requestId, headers: extraHeaders });
  }
  return new Response(JSON.stringify({ error, requestId }), {
    status,
    headers: {
      ...extraHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Accept',
      'X-Request-Id': requestId,
    },
  });
}

const defaultLog = event => console.log(JSON.stringify(event));

/** Adds `Accept` to Vary without dropping what the upstream already listed. */
function varyOnAccept(headers) {
  const current = headers.get('vary');
  if (current === null) headers.set('Vary', 'Accept');
  else if (!/(^|,)\s*(accept|\*)\s*(,|$)/i.test(current)) headers.set('Vary', `${current}, Accept`);
}

/**
 * @param {Request} request
 * @param {{ BACKEND_URL?: string }} env
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, newId?: () => string, log?: (event: object) => void }} [options]
 * @returns {Promise<Response>}
 */
export async function proxyApi(request, env, options = {}) {
  const {
    fetchImpl = fetch,
    timeoutMs: timeoutOverride,
    newId = () => crypto.randomUUID(),
    log = defaultLog,
  } = options;
  const url = new URL(request.url);
  const timeoutMs = timeoutOverride ?? upstreamTimeoutFor(url.pathname);
  const backend = env?.BACKEND_URL || DEFAULT_BACKEND_URL;
  const requestId = sanitizeRequestId(request.headers.get('x-request-id')) ?? newId();
  const startedAt = Date.now();

  // BE-2: the deprecated text-to-speech alias. A failure of the alias code itself falls back to
  // the plain v1 call (the old 404) instead of a crash.
  let alias = null;
  if (isAudioAlias(url.pathname)) {
    try {
      const parsed = await parseAliasBody(request.clone());
      if (!parsed.ok) {
        return errorResponse(request, parsed.status, parsed.error, requestId, parsed.headers);
      }
      alias = parsed.body;
    } catch {
      log({ event: 'tts_alias_failed', requestId });
    }
  }
  const backendPath = alias ? AUDIO_ALIAS.to : backendPathFor(url.pathname);
  const target = new URL(backendPath + (alias ? '' : url.search), backend);

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  headers.set('x-request-id', requestId);
  if (alias) {
    headers.set('content-type', 'application/json');
    headers.set('accept', ALIAS_ACCEPT);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let upstream;
  try {
    upstream = await fetchImpl(target.toString(), {
      method: request.method,
      headers,
      body: alias
        ? JSON.stringify(alias)
        : request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : request.body,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    if (alias) logAlias(log, requestId, alias, timedOut ? 504 : 502, startedAt);
    return timedOut
      ? errorResponse(request, 504, 'gateway_timeout', requestId)
      : errorResponse(request, 502, 'bad_gateway', requestId);
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const name of [...responseHeaders.keys()]) {
    if (name.startsWith('access-control-') || name.startsWith('x-dualmind-proxy-')) {
      responseHeaders.delete(name);
    }
  }
  responseHeaders.set('X-Request-Id', requestId);

  const isEventStream = (upstream.headers.get('content-type') || '').includes('text/event-stream');

  // BE-1: opt-in problem+json for error answers (never for streams or redirects).
  if (upstream.status >= 400 && !isEventStream && wantsProblemJson(request)) {
    try {
      const rewritten = await rewriteErrorResponse({
        response: upstream.clone(),
        request,
        requestId,
        log,
      });
      clearTimeout(timer);
      upstream.body?.cancel().catch(() => {});
      if (alias) logAlias(log, requestId, alias, upstream.status, startedAt);
      return rewritten;
    } catch {
      log({ event: 'problem_rewrite_failed', requestId, status: upstream.status });
    }
  }
  if (upstream.status >= 400) varyOnAccept(responseHeaders);

  const status = upstream.status;
  let body = upstream.body;
  if (alias && upstream.ok) {
    // The real route must answer audio; anything else is an upstream fault.
    let audio = null;
    try {
      audio = await audioFromUpstream(upstream);
    } catch {
      audio = null;
    }
    if (audio === null) {
      clearTimeout(timer);
      logAlias(log, requestId, alias, 502, startedAt);
      return errorResponse(request, 502, 'bad_gateway', requestId);
    }
    body = audio.body;
    responseHeaders.set('Content-Type', audio.contentType);
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set('Deprecation', DEPRECATION);
    responseHeaders.set('Link', `<${AUDIO_ALIAS.to}>; rel="successor-version"`);
  }
  if (alias) logAlias(log, requestId, alias, status, startedAt);
  if (isEventStream || !body) {
    // A started event stream may run as long as it needs; an empty body is already complete.
    clearTimeout(timer);
  } else {
    // Other bodies must finish within the timeout; the timer stops once the last chunk passes.
    body = body.pipeThrough(new TransformStream({ flush: () => clearTimeout(timer) }));
  }

  return new Response(body, {
    status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/** @param {(event: object) => void} log */
function logAlias(log, requestId, alias, status, startedAt) {
  log({
    event: 'tts_alias_used',
    requestId,
    textLength: alias.text.length,
    hasVoice: alias.voice !== undefined,
    status,
    durationMs: Date.now() - startedAt,
  });
}
