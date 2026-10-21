// Registry of problem types (RFC 9457) for the Arena API. One entry per type; the v2 router
// (server/v2/problems.ts) builds every error from it, docs/api/problems.md is generated from it
// (scripts/generate-openapi.ts), and BE-1 can reuse it for v1 errors. Data only, plain JS, so
// the JS proxy and the TypeScript router import the same file.
// The URL is an identifier; clients must not depend on it resolving.

export const PROBLEM_BASE_URL = 'https://arena.dualmindlab.tech/problems/';

/**
 * @typedef {{ status: number, title: string, usedFor: string }} ProblemTypeEntry
 */

/** @type {Readonly<Record<string, ProblemTypeEntry>>} */
export const PROBLEM_TYPES = Object.freeze({
  validation_error: { status: 400, title: 'Invalid request', usedFor: 'body, query or header failed its schema; `errors[]` lists the issues' },
  unauthorized: { status: 401, title: 'Unauthorized', usedFor: 'no token or a bad token; sends `WWW-Authenticate: Bearer`' },
  forbidden: { status: 403, title: 'Forbidden', usedFor: 'the verified user may not do this' },
  not_found: { status: 404, title: 'Not found', usedFor: 'unknown path or resource' },
  method_not_allowed: { status: 405, title: 'Method not allowed', usedFor: 'the path exists for other methods; sets `Allow`' },
  not_acceptable: { status: 406, title: 'Not acceptable', usedFor: '`Accept` cannot be satisfied' },
  conflict: { status: 409, title: 'Conflict', usedFor: 'state conflict (for example a reused idempotency key with another body)' },
  payload_too_large: { status: 413, title: 'Payload too large', usedFor: 'JSON body over 1 MiB' },
  unsupported_media_type: { status: 415, title: 'Unsupported media type', usedFor: 'a body that is not `application/json`' },
  rate_limited: { status: 429, title: 'Too many requests', usedFor: 'rate limit hit; carries `retryAfter` and `Retry-After`' },
  internal_error: { status: 500, title: 'Internal error', usedFor: 'unexpected exception' },
  not_enabled: { status: 501, title: 'Feature not enabled', usedFor: 'the route needs a binding or secret this deployment does not have; carries `feature`' },
  bad_gateway: { status: 502, title: 'Bad gateway', usedFor: 'the DualMind API is unreachable or answered nonsense' },
  gateway_timeout: { status: 504, title: 'Gateway timeout', usedFor: 'the DualMind API did not answer in time' },
  service_unavailable: { status: 503, title: 'Service unavailable', usedFor: 'the v2 router could not be loaded (answered by worker.js)' },
});

/** @param {string} slug */
export function problemTypeUrl(slug) {
  return `${PROBLEM_BASE_URL}${slug}`;
}
