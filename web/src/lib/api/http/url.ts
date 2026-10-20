import { ApiError } from '../errors';

export type QueryParams = Readonly<Record<string, string | number | boolean | undefined>>;

/**
 * Normalises the configured base URL: '' (same-origin, the default) or an absolute http(s) URL
 * without a trailing slash. Endpoint paths always start with `/api/`, so the same paths work
 * same-origin through the Worker and against the API directly (it answers `/api/health` too).
 */
export function normalizeBaseUrl(baseUrl: string | undefined): string {
  const value = (baseUrl ?? '').trim();
  if (value === '') return '';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`API base URL must be empty or an absolute URL, got "${value}"`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError(`API base URL must use http or https, got "${value}"`);
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return `${baseUrl}${path}${qs === '' ? '' : `?${qs}`}`;
}

/**
 * One path segment from a caller-supplied id. Rejects empty ids locally (a request to
 * `/api/threads/` would hit the list route instead) and encodes the rest.
 */
export function pathSegment(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError({
      kind: 'validation',
      code: 'INVALID_ARGUMENT',
      message: `${name} must be a non-empty string`,
    });
  }
  return encodeURIComponent(value.trim());
}
