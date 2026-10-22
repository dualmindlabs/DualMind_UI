// Registry of problem types (RFC 9457) for the Arena API. One entry per type; the v2 router
// (server/v2/problems.ts) builds every error from it, docs/api/problems.md is generated from it
// (scripts/generate-openapi.ts), and BE-1 can reuse it for v1 errors. Data only, plain JS, so
// the JS proxy and the TypeScript router import the same file.
// The URL is an identifier; clients must not depend on it resolving.

export const PROBLEM_BASE_URL = 'https://arena.dualmindlab.tech/problems/';

/**
 * @typedef {{ status: number, title: string, usedFor: string, help: string }} ProblemTypeEntry
 */

/** @type {Readonly<Record<string, ProblemTypeEntry>>} */
export const PROBLEM_TYPES = Object.freeze({
  validation_error: { status: 400, title: 'Invalid request', usedFor: 'body, query or header failed its schema; `errors[]` lists the issues', help: 'Read `errors[]` in the response: each entry names the field (`path`) and what is wrong with it. Fix the request and send it again; repeating it unchanged fails the same way.' },
  unauthorized: { status: 401, title: 'Unauthorized', usedFor: 'no token or a bad token; sends `WWW-Authenticate: Bearer`', help: 'Send `Authorization: Bearer <access token>` with a valid, unexpired token. Sign in again to get a new one.' },
  forbidden: { status: 403, title: 'Forbidden', usedFor: 'the verified user may not do this', help: 'The token is valid, but this account may not do this. Use an account that owns the resource, or do not retry.' },
  not_found: { status: 404, title: 'Not found', usedFor: 'unknown path or resource', help: 'Check the path and the id. Unknown paths under `/api/v2/` are answered here and never forwarded to v1.' },
  method_not_allowed: { status: 405, title: 'Method not allowed', usedFor: 'the path exists for other methods; sets `Allow`', help: 'Use one of the methods listed in the `Allow` response header.' },
  not_acceptable: { status: 406, title: 'Not acceptable', usedFor: '`Accept` cannot be satisfied', help: 'Send an `Accept` header the route can answer, usually `application/json`.' },
  conflict: { status: 409, title: 'Conflict', usedFor: 'state conflict (for example a reused idempotency key with another body)', help: 'The request clashes with the current state. Read the current state and decide again; for idempotency keys, use a new key for a different body.' },
  payload_too_large: { status: 413, title: 'Payload too large', usedFor: 'JSON body over 1 MiB', help: 'Send a body of at most 1 MiB.' },
  unsupported_media_type: { status: 415, title: 'Unsupported media type', usedFor: 'a body that is not `application/json`', help: 'Send the body as `application/json` with a matching `Content-Type` header.' },
  rate_limited: { status: 429, title: 'Too many requests', usedFor: 'rate limit hit; carries `retryAfter` and `Retry-After`', help: 'Wait the number of seconds in the `Retry-After` header, then try again. Do not retry battle, chat or vote requests automatically.' },
  internal_error: { status: 500, title: 'Internal error', usedFor: 'unexpected exception', help: 'Nothing you can fix. Try again shortly; if it keeps happening, quote the `requestId` from the response when you contact support.' },
  not_enabled: { status: 501, title: 'Feature not enabled', usedFor: 'the route needs a binding or secret this deployment does not have; carries `feature`', help: 'The feature is not switched on for this deployment yet. `feature` names it. Try the production site, or try again later.' },
  bad_gateway: { status: 502, title: 'Bad gateway', usedFor: 'the DualMind API is unreachable or answered nonsense', help: 'The DualMind API is unreachable or answered with something unusable. Wait `Retry-After` seconds and try again.' },
  gateway_timeout: { status: 504, title: 'Gateway timeout', usedFor: 'the DualMind API did not answer in time', help: 'The DualMind API did not answer in time. Wait `Retry-After` seconds and try again.' },
  upstream_unavailable: { status: 503, title: 'Models unavailable', usedFor: 'neither the requested model nor its backup answered a battle or chat call; nothing was stored, so trying again is safe (`code` `MODEL_UNAVAILABLE`, `Retry-After`)', help: 'Neither the model you asked for nor its backup answered, and nothing was stored. Wait `Retry-After` seconds and send the same request again; with an `Idempotency-Key` the retry cannot create a second battle.' },
  service_unavailable: { status: 503, title: 'Service unavailable', usedFor: 'the v2 router could not be loaded (answered by worker.js)', help: 'The API is starting up or being updated. Try again in a few seconds.' },
});

/** @param {string} slug */
export function problemTypeUrl(slug) {
  return `${PROBLEM_BASE_URL}${slug}`;
}
