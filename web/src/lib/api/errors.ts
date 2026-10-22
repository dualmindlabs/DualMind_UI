/**
 * The one error model of the API layer. Every failure a caller can see (network, timeout, abort,
 * an HTTP error status, a body that does not match its schema) is an `ApiError` with a `kind`.
 * UI code branches on `kind`, shows `getUserMessage(error)` and logs `error.toJSON()`.
 *
 * The API answers errors in several shapes (docs/api/endpoints.md, "Error model observed"); the
 * normaliser below reads all of them, plus empty bodies, so the rest of the app never has to.
 */

export const API_ERROR_KINDS = [
  'network',
  'timeout',
  'aborted',
  'auth',
  'forbidden',
  'not_found',
  'validation',
  'rate_limited',
  'server',
  'bad_response',
] as const;

export type ApiErrorKind = (typeof API_ERROR_KINDS)[number];

/** Kinds worth another attempt for an idempotent request. Everything else fails fast. */
const RETRYABLE_KINDS: ReadonlySet<ApiErrorKind> = new Set([
  'network',
  'timeout',
  'rate_limited',
  'server',
]);

/** Default `code` per kind, used when the body has none. */
const DEFAULT_CODES: Readonly<Record<ApiErrorKind, string>> = {
  network: 'NETWORK_ERROR',
  timeout: 'TIMEOUT',
  aborted: 'ABORTED',
  auth: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  not_found: 'NOT_FOUND',
  validation: 'INVALID_REQUEST',
  rate_limited: 'RATE_LIMITED',
  server: 'SERVER_ERROR',
  bad_response: 'BAD_RESPONSE',
};

export interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  /** HTTP status; 0 when no response arrived (network, timeout, abort, a local check). */
  status?: number | undefined;
  /** Machine-readable code from the body (`INVALID_REQUEST`, `API_ERROR`...) or a client code. */
  code?: string | undefined;
  /** The `x-request-id` this client sent. */
  requestId?: string | undefined;
  /** The `x-correlation-id` the API returned, when there was a response. */
  correlationId?: string | undefined;
  /** From `Retry-After`, in milliseconds. */
  retryAfterMs?: number | undefined;
  /** Extra data for logs: validation errors, schema issues, a snippet of a non-JSON body. */
  details?: unknown;
  method?: string | undefined;
  path?: string | undefined;
  cause?: unknown;
}

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly correlationId: string | undefined;
  readonly retryAfterMs: number | undefined;
  readonly details: unknown;
  readonly method: string | undefined;
  readonly path: string | undefined;

  constructor(init: ApiErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.kind = init.kind;
    this.status = init.status ?? 0;
    this.code = init.code ?? DEFAULT_CODES[init.kind];
    this.requestId = init.requestId;
    this.correlationId = init.correlationId;
    this.retryAfterMs = init.retryAfterMs;
    this.details = init.details;
    this.method = init.method;
    this.path = init.path;
  }

  /**
   * True when the same request may succeed if sent again (for an idempotent call): network
   * failures, timeouts (including 408), 429 and 5xx except 501 Not Implemented.
   */
  get retryable(): boolean {
    return RETRYABLE_KINDS.has(this.kind) && this.status !== 501;
  }

  /** A log-safe summary (no token, no request body). */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      kind: this.kind,
      status: this.status,
      code: this.code,
      message: this.message,
      method: this.method,
      path: this.path,
      requestId: this.requestId,
      correlationId: this.correlationId,
      retryAfterMs: this.retryAfterMs,
      details: this.details,
    };
  }
}

// --- Type guards -------------------------------------------------------------------------------

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** `isApiErrorKind(error, 'auth', 'forbidden')`: an ApiError of one of these kinds. */
export function isApiErrorKind<K extends ApiErrorKind>(
  error: unknown,
  ...kinds: K[]
): error is ApiError & { readonly kind: K } {
  return error instanceof ApiError && (kinds as ApiErrorKind[]).includes(error.kind);
}

/** Signed out, session expired or no token: send the user to sign in. */
export const isAuthError = (error: unknown) => isApiErrorKind(error, 'auth');
/** The request never got an answer: offline, DNS, the connection dropped, or it took too long. */
export const isConnectivityError = (error: unknown) => isApiErrorKind(error, 'network', 'timeout');
/** The caller cancelled the request (navigation, unmount, a new prompt). Usually not shown. */
export const isAbortError = (error: unknown) => isApiErrorKind(error, 'aborted');
export const isRateLimitError = (error: unknown) => isApiErrorKind(error, 'rate_limited');
export const isNotFoundError = (error: unknown) => isApiErrorKind(error, 'not_found');

/** Codes of the 503 the API sends when neither the model nor its backup answered. */
const UPSTREAM_UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  'MODEL_UNAVAILABLE',
  'UPSTREAM_UNAVAILABLE',
]);

/** Both models failed (503 `upstream_unavailable`): nothing was stored, trying again is fine. */
export const isUpstreamUnavailableError = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 503 &&
  UPSTREAM_UNAVAILABLE_CODES.has(error.code.toUpperCase());

/** A vote the API already counted (409 `ALREADY_VOTED`): the user's vote stands, not an error. */
export const isAlreadyVotedError = (error: unknown) =>
  error instanceof ApiError && error.status === 409;

export function isRetryableError(error: unknown): boolean {
  return error instanceof ApiError && error.retryable;
}

// --- Status and body normalisation ------------------------------------------------------------

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404 || status === 410) return 'not_found';
  // 408 from the API; 504 from the Worker when the API did not answer within its 30 s limit.
  if (status === 408 || status === 504) return 'timeout';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  if (status >= 400) return 'validation';
  // A non-2xx status outside 4xx/5xx (a redirect that was not followed, or no status at all).
  return 'bad_response';
}

export interface ParsedErrorBody {
  message: string | undefined;
  code: string | undefined;
  details: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Error or DOMException, from this realm or another (jsdom, a worker). */
const isErrorLike = (value: unknown): value is { name: string; message: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { name?: unknown }).name === 'string' &&
  typeof (value as { message?: unknown }).message === 'string';

/** Problem type URIs the Worker proxy sends (server/problem-rewrite.js). */
export const PROBLEM_TYPE_PREFIX = 'https://arena.dualmindlab.tech/problems/';

const ERROR_CODE_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/**
 * Reads an error body in any of the shapes the API and the Worker send today, or might send:
 *
 * 1. Arena routes: `{ object: "ai.error", code, message, timestamp }`.
 * 2. Other routes: `{ success: false, error: "text", code }`.
 * 3. The hardened Worker proxy (502/504): `{ error: "bad_gateway" | "gateway_timeout", requestId }`;
 *    the error is a code, not a sentence.
 * 4. The legacy Worker's 502: `{ success: false, message: "Backend API Error: ...", error: "..." }`.
 * 5. ASP.NET Core validation (ProblemDetails): `{ title, status, detail?, errors: { field: [...] } }`.
 * 6. The proposed single shape (endpoints.md, gap 6): `{ error: { code, message, details? } }`.
 * 7. Empty body (401, 404) or a non-JSON body: no message, no code.
 * 8. RFC 9457 `application/problem+json` from the Worker proxy (BE-1), sent to callers that ask
 *    for it: `{ type: ".../problems/<slug>", title, status, detail, requestId, code?, errors? }`.
 */
export function parseErrorBody(body: unknown): ParsedErrorBody {
  if (!isRecord(body)) return { message: undefined, code: undefined, details: undefined };

  // 8. problem+json from the proxy: the retained `code` wins over the type slug.
  if (typeof body.type === 'string' && body.type.startsWith(PROBLEM_TYPE_PREFIX)) {
    const slug = body.type.slice(PROBLEM_TYPE_PREFIX.length);
    const requestId = asText(body.requestId);
    const retryAfter = body.retryAfter;
    const errors = Array.isArray(body.errors) ? body.errors : undefined;
    const details: Record<string, unknown> = {};
    if (errors !== undefined) details.errors = errors;
    if (requestId !== undefined) details.requestId = requestId;
    if (retryAfter !== undefined) details.retryAfter = retryAfter;
    return {
      message: asText(body.detail) ?? asText(body.title),
      code: asText(body.code) ?? (slug === '' ? undefined : slug.toUpperCase()),
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  }

  // 6. Nested error object.
  if (isRecord(body.error)) {
    const nested = body.error;
    return {
      message: asText(nested.message),
      code: asText(nested.code),
      details: nested.details,
    };
  }

  // 5. ProblemDetails: field errors are the useful part.
  if (asText(body.title) !== undefined && ('errors' in body || 'traceId' in body)) {
    return {
      message: asText(body.detail) ?? asText(body.title),
      code: asText(body.code),
      details: isRecord(body.errors) ? { fields: body.errors } : undefined,
    };
  }

  // 3. A snake_case `error` with no message is a code (`bad_gateway`, `gateway_timeout`).
  const error = asText(body.error);
  const message = asText(body.message);
  const requestId = asText(body.requestId);
  if (error !== undefined && message === undefined && ERROR_CODE_RE.test(error)) {
    return {
      message: undefined,
      code: asText(body.code) ?? error.toUpperCase(),
      details: requestId === undefined ? undefined : { requestId },
    };
  }

  // 1, 2 and 4. Prefer `message`; the legacy Worker's `error` is a stack-like toString(), so it
  // only serves as the message when there is nothing better (shape 2 has no `message`).
  const timestamp = asText(body.timestamp);
  return {
    message: message ?? error,
    code: asText(body.code),
    details: timestamp === undefined ? undefined : { timestamp },
  };
}

/**
 * Parses `Retry-After` (delay in seconds, or an HTTP date) into milliseconds from `now`.
 * Returns undefined when the header is missing or invalid.
 */
export function parseRetryAfter(
  value: string | null | undefined,
  now = Date.now(),
): number | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 1000);
  // An HTTP date always has a day or month name; this keeps "-5" from parsing as a year.
  if (!/[a-z]/i.test(trimmed)) return undefined;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}

export interface ResponseErrorInput {
  status: number;
  body: unknown;
  headers: Headers;
  requestId?: string | undefined;
  method?: string | undefined;
  path?: string | undefined;
}

/** Builds the ApiError for a non-2xx response. */
export function errorFromResponse({
  status,
  body,
  headers,
  requestId,
  method,
  path,
}: ResponseErrorInput): ApiError {
  const kind = kindFromStatus(status);
  const parsed = parseErrorBody(body);
  const details =
    parsed.details ??
    (typeof body === 'string' && body !== '' ? { body: body.slice(0, 300) } : undefined);
  return new ApiError({
    kind,
    status,
    message: parsed.message ?? `Request failed with status ${status}`,
    code: parsed.code,
    details,
    requestId,
    correlationId: headers.get('x-correlation-id') ?? undefined,
    retryAfterMs: parseRetryAfter(headers.get('retry-after')),
    method,
    path,
  });
}

/** Kind for an `ai.error` code (sent in a body or as a stream event). */
export function kindFromAiErrorCode(code: string | undefined): ApiErrorKind {
  if (code === 'INVALID_REQUEST') return 'validation';
  if (code === 'UNAUTHORIZED') return 'auth';
  if (code === 'RATE_LIMITED') return 'rate_limited';
  return 'server';
}

/** True for an `{ object: "ai.error" }` body, which can arrive with a 2xx status. */
export function isAiErrorBody(body: unknown): body is Record<string, unknown> {
  return isRecord(body) && body.object === 'ai.error';
}

// --- User-facing messages ---------------------------------------------------------------------

const MAX_SERVER_MESSAGE_LENGTH = 160;

/** A short server message that reads like a sentence for a person (not a stack or a dump). */
function isPresentable(message: string): boolean {
  return (
    message.length <= MAX_SERVER_MESSAGE_LENGTH &&
    !/[{}<>]|\bat\s+\S+\s*\(|Exception|Error:/.test(message)
  );
}

function seconds(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

/**
 * The message to show a person for any error. Only validation errors may pass the server's own
 * text through (it says what to fix), and only when it is short and plain.
 */
export function getUserMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  switch (error.kind) {
    case 'network':
      return 'Cannot reach DualMind right now. Check your connection and try again.';
    case 'timeout':
      return 'This is taking longer than it should. Please try again.';
    case 'aborted':
      return 'The request was canceled.';
    case 'auth':
      return 'Please sign in to continue.';
    case 'forbidden':
      return 'You do not have access to this.';
    case 'not_found':
      return 'We could not find that. It may have been deleted or made private.';
    case 'validation':
      return isPresentable(error.message) && !error.message.startsWith('Request failed')
        ? error.message
        : 'That request was not accepted. Check it and try again.';
    case 'rate_limited':
      return error.retryAfterMs === undefined
        ? 'Too many requests. Wait a moment and try again.'
        : `Too many requests. Try again in ${seconds(error.retryAfterMs)} seconds.`;
    case 'server':
      return isUpstreamUnavailableError(error)
        ? 'Both models are busy right now. Try again in a moment.'
        : 'Something went wrong on our side. Please try again.';
    case 'bad_response':
      return 'The server sent an answer we could not read. Please try again.';
  }
}

/** Wraps anything thrown into an ApiError (already-normalised errors pass through). */
export function toApiError(
  error: unknown,
  context: {
    requestId?: string | undefined;
    method?: string | undefined;
    path?: string | undefined;
  } = {},
): ApiError {
  if (error instanceof ApiError) return error;
  const name = isErrorLike(error) ? error.name : undefined;
  if (name === 'AbortError') {
    return new ApiError({
      kind: 'aborted',
      message: 'The request was aborted',
      cause: error,
      ...context,
    });
  }
  if (name === 'TimeoutError') {
    return new ApiError({
      kind: 'timeout',
      message: 'The request timed out',
      cause: error,
      ...context,
    });
  }
  // fetch rejects with a TypeError for offline, DNS, CORS and dropped connections.
  if (error instanceof TypeError) {
    return new ApiError({
      kind: 'network',
      message: `Network error: ${error.message}`,
      cause: error,
      ...context,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ApiError({
    kind: 'network',
    message: message || 'Unknown error',
    cause: error,
    ...context,
  });
}
