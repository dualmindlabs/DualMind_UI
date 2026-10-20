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

const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

/** @param {string | null} value */
export function sanitizeRequestId(value) {
  return value && REQUEST_ID_RE.test(value) ? value : null;
}

/** @param {string} pathname */
export function backendPathFor(pathname) {
  return pathname === '/api/health' ? '/health' : pathname;
}

/**
 * @param {number} status
 * @param {'bad_gateway' | 'gateway_timeout'} error
 * @param {string} requestId
 */
function errorResponse(status, error, requestId) {
  return new Response(JSON.stringify({ error, requestId }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
  });
}

/**
 * @param {Request} request
 * @param {{ BACKEND_URL?: string }} env
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, newId?: () => string }} [options]
 * @returns {Promise<Response>}
 */
export async function proxyApi(request, env, options = {}) {
  const {
    fetchImpl = fetch,
    timeoutMs: timeoutOverride,
    newId = () => crypto.randomUUID(),
  } = options;
  const url = new URL(request.url);
  const timeoutMs = timeoutOverride ?? upstreamTimeoutFor(url.pathname);
  const backend = env?.BACKEND_URL || DEFAULT_BACKEND_URL;
  const target = new URL(backendPathFor(url.pathname) + url.search, backend);
  const requestId = sanitizeRequestId(request.headers.get('x-request-id')) ?? newId();

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  headers.set('x-request-id', requestId);

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
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return timedOut
      ? errorResponse(504, 'gateway_timeout', requestId)
      : errorResponse(502, 'bad_gateway', requestId);
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const name of [...responseHeaders.keys()]) {
    if (name.startsWith('access-control-') || name.startsWith('x-dualmind-proxy-')) {
      responseHeaders.delete(name);
    }
  }
  responseHeaders.set('X-Request-Id', requestId);

  const isEventStream = (upstream.headers.get('content-type') || '').includes('text/event-stream');
  let body = upstream.body;
  if (isEventStream || !body) {
    // A started event stream may run as long as it needs; an empty body is already complete.
    clearTimeout(timer);
  } else {
    // Other bodies must finish within the timeout; the timer stops once the last chunk passes.
    body = body.pipeThrough(new TransformStream({ flush: () => clearTimeout(timer) }));
  }

  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
