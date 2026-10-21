import type { z } from 'zod';

import {
  ApiError,
  errorFromResponse,
  isAiErrorBody,
  kindFromAiErrorCode,
  parseErrorBody,
  toApiError,
} from '../errors';
import { abortedError, type ErrorContext, linkSignal, sleep } from './abort';
import { CORRELATION_ID_HEADER, createRequestId, REQUEST_ID_HEADER } from './request-id';
import { isIdempotent, resolveRetryPolicy, retryDelay, shouldRetry } from './retry';
import type {
  AccessTokenProvider,
  AuthMode,
  CallOptions,
  FetchLike,
  HttpMethod,
  RequestEvent,
  ResponseEvent,
  RetryPolicy,
} from './types';
import { buildUrl, normalizeBaseUrl, type QueryParams } from './url';

/** Default timeout for calls whose endpoint sets none (reads and small writes). */
export const DEFAULT_TIMEOUT_MS = 15_000;

export interface TransportOptions {
  /** '' (default) = same-origin `/api/*` through the Worker; or an absolute http(s) URL. */
  baseUrl?: string | undefined;
  /** Supabase access token provider. No provider means every `required` call fails with `auth`. */
  getAccessToken?: AccessTokenProvider | undefined;
  /** A fetch implementation: the browser's by default, the mock adapter's in demo mode and tests. */
  fetch?: FetchLike | undefined;
  /** Timeout for endpoints without their own, in milliseconds. */
  timeoutMs?: number | undefined;
  /** Overrides for the GET retry policy (`DEFAULT_RETRY_POLICY`). */
  retry?: Partial<RetryPolicy> | undefined;
  /** Called before every attempt. Must not throw (errors are ignored). Never sees the token. */
  onRequest?: ((event: RequestEvent) => void) | undefined;
  /** Called after every attempt, failed or not. Must not throw (errors are ignored). */
  onResponse?: ((event: ResponseEvent) => void) | undefined;
  /** Request id factory (UUID v4 by default). */
  createRequestId?: (() => string) | undefined;
  /** Random source for retry jitter (tests pass a constant). */
  random?: (() => number) | undefined;
}

export interface RequestSpec {
  method: HttpMethod;
  /** Starts with `/api/`. Path params must already be encoded (see `pathSegment`). */
  path: string;
  query?: QueryParams | undefined;
  /** JSON-encoded when present. */
  body?: unknown;
  auth: AuthMode;
  /** The endpoint's default timeout; `CallOptions.timeoutMs` overrides it. */
  timeoutMs?: number | undefined;
}

export interface JsonRequestSpec<T> extends RequestSpec {
  /** Validates and normalises the 2xx body (an empty body is passed as `null`). */
  schema: z.ZodType<T>;
}

export interface BinaryRequestSpec extends RequestSpec {
  accept: string;
}

/** An open streaming response. Call `close()` when done reading (also after an error). */
export interface StreamHandle {
  response: Response;
  requestId: string;
  correlationId: string | undefined;
  /** Aborts when the caller's signal does, or when `close()` is called. */
  signal: AbortSignal;
  close: () => void;
}

export interface Transport {
  readonly baseUrl: string;
  /** A JSON call, validated by `spec.schema`. GETs retry by the policy; nothing else does. */
  json: <T>(spec: JsonRequestSpec<T>, options?: CallOptions) => Promise<T>;
  /** A binary call (text to speech). */
  blob: (spec: BinaryRequestSpec, options?: CallOptions) => Promise<Blob>;
  /**
   * Opens a streaming call (SSE). The timeout covers the wait for the response headers only;
   * idle timeouts while reading belong to the stream reader. Never retried.
   */
  openStream: (spec: BinaryRequestSpec, options?: CallOptions) => Promise<StreamHandle>;
}

/** Headers a caller cannot set or replace through `CallOptions.headers`. */
const RESERVED_HEADERS = new Set(['authorization', 'accept', 'content-type', REQUEST_ID_HEADER]);

/** The attempt's abort controller, and how to detach it from the caller's signal. */
interface AttemptLink {
  controller: AbortController;
  unlink: () => void;
}

interface ResponseMeta extends ErrorContext {
  status: number;
  correlationId: string | undefined;
}

const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

function emit<E>(hook: ((event: E) => void) | undefined, event: E): void {
  if (hook === undefined) return;
  try {
    hook(event);
  } catch {
    // Hooks are for logging and metrics; they must never break a request.
  }
}

function isRedirect(response: Response): boolean {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
}

/**
 * Opts in to the proxy's problem+json errors (BE-1) next to the media type the call wants. Pre-
 * stream errors of event-stream calls are normal responses, so they get it too.
 */
export function withProblemJson(accept: string): string {
  return /application\/problem\+json/i.test(accept)
    ? accept
    : `${accept}, application/problem+json;q=0.9`;
}

async function readErrorBody(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return null;
  }
  if (text.trim() === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function summarizeIssues(issues: readonly z.core.$ZodIssue[]) {
  return issues.slice(0, 10).map(issue => ({
    path: issue.path.map(segment => String(segment)).join('.'),
    code: issue.code,
    message: issue.message,
  }));
}

async function decodeJson<T>(response: Response, schema: z.ZodType<T>, meta: ResponseMeta) {
  const text = await response.text();
  let data: unknown = null;
  if (text.trim() !== '') {
    try {
      data = JSON.parse(text) as unknown;
    } catch (cause) {
      throw new ApiError({
        kind: 'bad_response',
        code: 'INVALID_JSON',
        message: `The response to ${meta.method} ${meta.path} is not valid JSON`,
        details: {
          contentType: response.headers.get('content-type'),
          body: text.slice(0, 300),
        },
        cause,
        ...meta,
      });
    }
  }
  // Arena routes may report a provider failure as an `ai.error` body; treat it as the error it is.
  if (isAiErrorBody(data)) {
    const parsed = parseErrorBody(data);
    throw new ApiError({
      kind: kindFromAiErrorCode(parsed.code),
      code: parsed.code,
      message: parsed.message ?? 'The model provider returned an error',
      details: parsed.details,
      ...meta,
    });
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError({
      kind: 'bad_response',
      code: 'SCHEMA_MISMATCH',
      message: `Unexpected response shape for ${meta.method} ${meta.path}`,
      details: { issues: summarizeIssues(result.error.issues) },
      ...meta,
    });
  }
  return result.data;
}

export function createTransport(options: TransportOptions = {}): Transport {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  // Resolved per call, so a fetch stubbed after the client was created is still used.
  const fetchImpl: FetchLike = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const policy = resolveRetryPolicy(options.retry);
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const newRequestId = options.createRequestId ?? createRequestId;
  const random = options.random ?? Math.random;

  async function resolveToken(auth: AuthMode, context: ErrorContext): Promise<string | undefined> {
    const missing = () =>
      new ApiError({
        kind: 'auth',
        code: 'NO_ACCESS_TOKEN',
        message: 'This call needs a signed-in user',
        ...context,
      });
    if (auth === 'none') return undefined;
    if (options.getAccessToken === undefined) {
      if (auth === 'required') throw missing();
      return undefined;
    }
    let token: string | null | undefined;
    try {
      token = await options.getAccessToken();
    } catch (cause) {
      throw new ApiError({
        kind: 'auth',
        code: 'TOKEN_UNAVAILABLE',
        message: 'Could not read the access token',
        cause,
        ...context,
      });
    }
    const value = typeof token === 'string' ? token.trim() : '';
    if (value === '') {
      if (auth === 'required') throw missing();
      return undefined;
    }
    return value;
  }

  function buildHeaders(
    spec: RequestSpec,
    accept: string,
    token: string | undefined,
    requestId: string,
    extra: CallOptions['headers'],
  ): Headers {
    const headers = new Headers();
    for (const [name, value] of Object.entries(extra ?? {})) {
      if (!RESERVED_HEADERS.has(name.toLowerCase())) headers.set(name, value);
    }
    headers.set('accept', withProblemJson(accept));
    if (spec.body !== undefined) headers.set('content-type', 'application/json');
    if (token !== undefined) headers.set('authorization', `Bearer ${token}`);
    headers.set(REQUEST_ID_HEADER, requestId);
    return headers;
  }

  /**
   * One call: up to `1 + maxRetries` attempts for a GET, exactly one for anything else.
   * `consume` reads a 2xx response inside the attempt, so the timeout also covers the body.
   */
  async function execute<R>(
    spec: RequestSpec,
    accept: string,
    callOptions: CallOptions,
    consume: (response: Response, meta: ResponseMeta, link: AttemptLink) => Promise<R>,
    mode: 'body' | 'stream',
  ): Promise<R> {
    const requestId = newRequestId();
    const context: ErrorContext = { requestId, method: spec.method, path: spec.path };
    const url = buildUrl(baseUrl, spec.path, spec.query);
    const timeoutMs = callOptions.timeoutMs ?? spec.timeoutMs ?? defaultTimeoutMs;
    const body = spec.body === undefined ? undefined : JSON.stringify(spec.body);
    const retryEnabled =
      mode === 'body' && isIdempotent(spec.method) && callOptions.retry !== false;
    const { signal } = callOptions;

    const attemptOnce = async (attempt: number): Promise<R> => {
      const token = await resolveToken(spec.auth, context);
      const headers = buildHeaders(spec, accept, token, requestId, callOptions.headers);
      const controller = new AbortController();
      const unlink = linkSignal(signal, controller);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const event: RequestEvent = { requestId, method: spec.method, path: spec.path, url, attempt };
      const started = now();
      let response: Response | undefined;
      let keepLinked = false;
      emit(options.onRequest, event);

      try {
        const init: RequestInit = {
          method: spec.method,
          headers,
          signal: controller.signal,
          // A redirect from the API is never expected; while the waitlist gate is on, /api/*
          // answers 302. Report it instead of following it to an HTML page.
          redirect: 'manual',
          credentials: 'same-origin',
        };
        if (body !== undefined) init.body = body;
        response = await fetchImpl(url, init);
        const meta: ResponseMeta = {
          ...context,
          status: response.status,
          correlationId: response.headers.get(CORRELATION_ID_HEADER) ?? undefined,
        };
        if (isRedirect(response)) {
          throw new ApiError({
            kind: 'bad_response',
            code: 'UNEXPECTED_REDIRECT',
            message: `${spec.method} ${spec.path} was redirected (is the waitlist gate on?)`,
            ...meta,
          });
        }
        if (!response.ok) {
          throw errorFromResponse({
            status: response.status,
            body: await readErrorBody(response),
            headers: response.headers,
            ...context,
          });
        }
        if (mode === 'stream') clearTimeout(timer);
        const result = await consume(response, meta, { controller, unlink });
        keepLinked = mode === 'stream';
        emit(options.onResponse, {
          ...event,
          status: response.status,
          correlationId: meta.correlationId ?? null,
          durationMs: now() - started,
          error: null,
        });
        return result;
      } catch (error) {
        const apiError = timedOut
          ? new ApiError({
              kind: 'timeout',
              code: 'TIMEOUT',
              message: `No response to ${spec.method} ${spec.path} within ${timeoutMs} ms`,
              ...context,
            })
          : signal?.aborted
            ? abortedError(context)
            : toApiError(error, context);
        emit(options.onResponse, {
          ...event,
          status: response?.status ?? 0,
          correlationId: response?.headers.get(CORRELATION_ID_HEADER) ?? null,
          durationMs: now() - started,
          error: apiError,
        });
        throw apiError;
      } finally {
        clearTimeout(timer);
        if (!keepLinked) unlink();
      }
    };

    for (let attempt = 0; ; attempt += 1) {
      if (signal?.aborted) throw abortedError(context);
      try {
        return await attemptOnce(attempt);
      } catch (error) {
        const apiError = toApiError(error, context);
        if (!retryEnabled || signal?.aborted || !shouldRetry(apiError, attempt, policy)) {
          throw apiError;
        }
        try {
          await sleep(retryDelay(attempt, apiError, policy, random), signal);
        } catch {
          throw abortedError(context);
        }
      }
    }
  }

  return {
    baseUrl,

    json: (spec, callOptions = {}) =>
      execute(
        spec,
        'application/json',
        callOptions,
        (response, meta) => decodeJson(response, spec.schema, meta),
        'body',
      ),

    blob: (spec, callOptions = {}) =>
      execute(
        spec,
        spec.accept,
        callOptions,
        async (response, meta) => {
          const blob = await response.blob();
          const type = blob.type || (response.headers.get('content-type') ?? '');
          const expected = spec.accept.split('/')[0] ?? '';
          if (blob.size === 0 || !type.startsWith(`${expected}/`)) {
            throw new ApiError({
              kind: 'bad_response',
              code: 'UNEXPECTED_CONTENT',
              message: `Expected ${spec.accept} from ${spec.method} ${spec.path}, got "${type}" (${blob.size} bytes)`,
              ...meta,
            });
          }
          return blob;
        },
        'body',
      ),

    openStream: (spec, callOptions = {}) =>
      execute(
        spec,
        spec.accept,
        callOptions,
        (response, meta, { controller, unlink }) =>
          Promise.resolve<StreamHandle>({
            response,
            requestId: meta.requestId ?? '',
            correlationId: meta.correlationId,
            signal: controller.signal,
            close: () => {
              unlink();
              if (!controller.signal.aborted) controller.abort();
            },
          }),
        'stream',
      ),
  };
}
