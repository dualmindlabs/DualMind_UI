// Request ids shared by the v1 proxy (server/api-proxy.js) and the v2 router (server/v2/).
// A caller's X-Request-Id is reused when it is 8 to 128 characters of [A-Za-z0-9._:-];
// anything else is replaced, so a log line can never be forged through the header.

const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

/** @param {string | null | undefined} value */
export function sanitizeRequestId(value) {
  return value && REQUEST_ID_RE.test(value) ? value : null;
}

/**
 * The caller's id when it passes sanitizeRequestId(), else a new UUID.
 * @param {string | null | undefined} value
 * @param {() => string} [newId]
 */
export function resolveRequestId(value, newId = () => crypto.randomUUID()) {
  return sanitizeRequestId(value) ?? newId();
}
