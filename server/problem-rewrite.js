// Opt-in RFC 9457 problem+json for v1 error responses (docs/backend/designs/BE-1-error-shape.md).
//
// A caller that sends `Accept: application/problem+json` gets one error body for every non-2xx
// answer of /api/*, whatever shape the DualMind API used (rows 1 to 9 of the design's mapping
// table). Callers that do not send it (the legacy app, curl) are never touched.
//
// Plain JS, no dependencies. The problem type registry lives here until the platform's shared
// registry (server/problem-types.js, BE-0) lands; the slugs are the ones that registry will use.

export const PROBLEM_TYPE_BASE = 'https://arena.dualmindlab.tech/problems/';
export const PROBLEM_CONTENT_TYPE = 'application/problem+json; charset=utf-8';
export const MAX_UPSTREAM_BODY_BYTES = 64 * 1024;
export const MAX_DETAIL_LENGTH = 300;

/** slug -> { title, detail } (detail is the fixed sentence used when upstream text is not shown). */
export const PROBLEM_TYPES = Object.freeze({
  validation_error: { title: 'Invalid request', detail: 'The request was not accepted.' },
  unauthorized: { title: 'Unauthorized', detail: 'Sign in again.' },
  forbidden: { title: 'Forbidden', detail: 'You do not have access to this resource.' },
  not_found: { title: 'Not found', detail: 'No such resource.' },
  conflict: { title: 'Conflict', detail: 'The request conflicts with the current state.' },
  payload_too_large: { title: 'Payload too large', detail: 'The request is too large.' },
  unsupported_media_type: {
    title: 'Unsupported media type',
    detail: 'The request content type is not supported.',
  },
  rate_limited: { title: 'Too many requests', detail: 'Too many requests. Try again later.' },
  internal_error: { title: 'Internal error', detail: 'The service failed.' },
  bad_gateway: { title: 'Bad gateway', detail: 'The API could not be reached.' },
  gateway_timeout: { title: 'Gateway timeout', detail: 'The API did not answer in time.' },
});

const MODEL_FAILED_DETAIL = 'The model service failed.';
const KEPT_HEADERS = ['www-authenticate', 'retry-after', 'x-correlation-id', 'allow'];

/** Problem type slug for a status when the body says nothing better (row 9). */
export function typeForStatus(status) {
  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 408:
    case 504:
      return 'gateway_timeout';
    case 409:
      return 'conflict';
    case 413:
      return 'payload_too_large';
    case 415:
      return 'unsupported_media_type';
    case 429:
      return 'rate_limited';
    case 502:
      return 'bad_gateway';
    default:
      return status >= 500 ? 'internal_error' : 'validation_error';
  }
}

/**
 * True when a media range in Accept names application/problem+json with q > 0.
 * `*\/*` and `application/json` alone do not opt in.
 * @param {Request} request
 */
export function wantsProblemJson(request) {
  const accept = request.headers.get('accept');
  if (!accept) return false;
  return accept.split(',').some(range => {
    const [type, ...params] = range.split(';').map(part => part.trim());
    if (type.toLowerCase() !== 'application/problem+json') return false;
    for (const param of params) {
      const match = /^q\s*=\s*([0-9.]+)$/i.exec(param);
      if (match && Number(match[1]) === 0) return false;
    }
    return true;
  });
}

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isStatus5xx = status => status >= 500;

/** Upstream text that is safe to show: plain, short. Longer text is cut. Otherwise undefined. */
function safeText(value) {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  // eslint-disable-next-line no-control-regex
  if (text === '' || /[\u0000-\u001f\u007f]/.test(text)) return undefined;
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH - 1)}…` : text;
}

/** ASP.NET `errors` field map to `[{ path, message }]`. */
function convertFieldErrors(errors) {
  const list = [];
  for (const [path, messages] of Object.entries(errors)) {
    const items = Array.isArray(messages) ? messages : [messages];
    for (const message of items) {
      const text = safeText(message);
      if (text !== undefined) list.push({ path, message: text });
    }
  }
  return list.slice(0, 50);
}

/**
 * Maps a parsed upstream body (or null) to a problem description. Pure.
 * @param {number} status
 * @param {unknown} body parsed JSON, or null when empty, not JSON or too large
 * @returns {{ row: number, type: string, detail?: string, extra?: Record<string, unknown>, upstreamDetail?: string }}
 */
export function classifyUpstream(status, body) {
  const fixed = type => ({ type, detail: undefined });
  if (!isRecord(body)) {
    if (body === null && status === 401) return { row: 3, ...fixed('unauthorized') };
    if (body === null && status === 404) return { row: 4, ...fixed('not_found') };
    return { row: 9, ...fixed(typeForStatus(status)) };
  }

  const code = safeText(body.code);
  const extra = code === undefined ? undefined : { code };

  // Row 8: the legacy Worker's 502, whose `error` is an exception string. Never forwarded.
  if (
    body.success === false &&
    typeof body.message === 'string' &&
    body.message.startsWith('Backend API Error')
  ) {
    return {
      row: 8,
      type: 'bad_gateway',
      upstreamDetail: safeText(body.error ?? body.message),
    };
  }

  // Row 1 and 1b: Arena routes.
  if (body.object === 'ai.error') {
    if (isStatus5xx(status)) {
      const type = [500, 502, 504].includes(status) ? typeForStatus(status) : 'internal_error';
      return {
        row: 1,
        type,
        detail: MODEL_FAILED_DETAIL,
        extra,
        upstreamDetail: safeText(body.message),
      };
    }
    if (status === 400) {
      return { row: 1, type: 'validation_error', detail: safeText(body.message), extra };
    }
    return { row: 1, type: typeForStatus(status), detail: safeText(body.message), extra };
  }

  // Row 2: the other routes.
  if (body.success === false && typeof body.error === 'string') {
    if (isStatus5xx(status)) {
      return { row: 2, type: 'internal_error', extra, upstreamDetail: safeText(body.error) };
    }
    const type = status === 422 ? 'validation_error' : typeForStatus(status);
    return { row: 2, type, detail: safeText(body.error), extra };
  }

  // Row 7: ASP.NET ProblemDetails (the field map is the useful part).
  if (
    typeof body.title === 'string' &&
    (isRecord(body.errors) || typeof body.traceId === 'string')
  ) {
    const errors = isRecord(body.errors) ? convertFieldErrors(body.errors) : [];
    return {
      row: 7,
      type: typeForStatus(status),
      detail: isStatus5xx(status) ? undefined : (safeText(body.detail) ?? safeText(body.title)),
      extra: errors.length > 0 ? { errors } : undefined,
      upstreamDetail: isStatus5xx(status) ? safeText(body.detail ?? body.title) : undefined,
    };
  }

  // Rows 5 and 6 are the Worker's own bodies and never come through here (they are built
  // directly); anything else is row 9.
  return { row: 9, ...fixed(typeForStatus(status)) };
}

/**
 * Builds the problem body. 5xx and unknown shapes always get the fixed sentence.
 * @param {{ status: number, type: string, detail?: string, instance: string, requestId: string, extra?: Record<string, unknown> }} input
 */
export function buildProblemBody({ status, type, detail, instance, requestId, extra }) {
  const entry = PROBLEM_TYPES[type] ?? PROBLEM_TYPES.internal_error;
  return {
    type: `${PROBLEM_TYPE_BASE}${type}`,
    title: entry.title,
    status,
    detail: status >= 500 ? entry.detail : (detail ?? entry.detail),
    instance,
    requestId,
    ...extra,
  };
}

/**
 * A problem response for an error the Worker itself raised (502, 504, alias validation).
 * @param {{ status: number, type?: string, request: Request, requestId: string, headers?: HeadersInit }} input
 */
export function workerProblemResponse({ status, type, request, requestId, headers }) {
  const slug = type ?? typeForStatus(status);
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', PROBLEM_CONTENT_TYPE);
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('Vary', 'Accept');
  responseHeaders.set('X-Request-Id', requestId);
  const instance = new URL(request.url).pathname;
  const body = buildProblemBody({ status, type: slug, instance, requestId });
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

/** Reads at most 64 KiB and parses JSON; null when empty, huge, not JSON or unreadable. */
async function readUpstreamJson(response) {
  if (!response.body) return { json: null, empty: true };
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_UPSTREAM_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { json: null, empty: false };
      }
      chunks.push(value);
    }
  } catch {
    return { json: null, empty: false };
  }
  if (total === 0) return { json: null, empty: true };
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  const type = response.headers.get('content-type') || '';
  if (!/json/i.test(type) && !text.trimStart().startsWith('{')) return { json: null, empty: false };
  try {
    return { json: JSON.parse(text), empty: false };
  } catch {
    return { json: null, empty: false };
  }
}

/**
 * Rewrites a non-2xx upstream response into a problem response. Reads (and so consumes) the
 * upstream body; the caller passes a clone when it wants the original back on failure.
 * @param {{ response: Response, request: Request, requestId: string, log?: (event: object) => void }} input
 * @returns {Promise<Response>}
 */
export async function rewriteErrorResponse({ response, request, requestId, log }) {
  const status = response.status;
  const path = new URL(request.url).pathname;
  const { json, empty } = await readUpstreamJson(response);

  const headers = new Headers();
  for (const name of KEPT_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set('Content-Type', PROBLEM_CONTENT_TYPE);
  headers.set('Cache-Control', 'no-store');
  headers.set('Vary', 'Accept');
  headers.set('X-Request-Id', requestId);

  // Already one of our problems: pass through, with the request id added when missing. (ASP.NET
  // ProblemDetails is problem+json too, but its `type` is not ours, so it goes through row 7.)
  if (isRecord(json) && typeof json.type === 'string' && json.type.startsWith(PROBLEM_TYPE_BASE)) {
    const body = typeof json.requestId === 'string' ? json : { ...json, requestId };
    log?.({ event: 'problem_rewrite', requestId, route: path, status, row: 0, type: 'passthrough' });
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
      status,
      headers,
    });
  }

  const classified = classifyUpstream(status, empty ? null : json);
  const problem = buildProblemBody({
    status,
    type: classified.type,
    detail: classified.detail,
    instance: path,
    requestId,
    extra: classified.extra,
  });
  log?.({
    event: 'problem_rewrite',
    requestId,
    route: path,
    status,
    row: classified.row,
    type: classified.type,
    upstreamCode: classified.extra?.code,
    ...(classified.upstreamDetail === undefined
      ? {}
      : { upstreamDetail: classified.upstreamDetail.slice(0, MAX_DETAIL_LENGTH) }),
  });
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(problem), {
    status,
    headers,
  });
}
