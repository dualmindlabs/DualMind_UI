/**
 * Share links (slice S11): `/share/<threadId>` is the canonical form. Links made before the
 * redesign may carry the id as `?threadId=`, `?thread=` or `?id=` (on `/share/` or
 * `/share/index.html`); they keep working. The Worker reads ids with the same rules
 * (`shareIdFromUrl` in ../../../../server/share.js; a test keeps the two in step).
 */

/** Thread ids: the API's UUIDs, kept loose (letters, digits, - and _) for other id formats. */
export const SHARE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/** Query parameters of old share links, in the order the legacy page read them. */
export const SHARE_QUERY_KEYS = ['threadId', 'thread', 'id'] as const;

export function isShareId(value: unknown): value is string {
  return typeof value === 'string' && SHARE_ID_PATTERN.test(value);
}

/**
 * The thread id of a share page address: the path segment after /share/ when it is an id, else
 * the first id in the old query parameters. Null when there is none.
 */
export function shareIdFromLocation(pathname: string, search = ''): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'share' && segments[1] !== undefined) {
    let candidate = '';
    try {
      candidate = decodeURIComponent(segments[1]);
    } catch {
      candidate = '';
    }
    if (isShareId(candidate)) return candidate;
  }
  const params = new URLSearchParams(search);
  for (const key of SHARE_QUERY_KEYS) {
    const value = params.get(key)?.trim();
    if (isShareId(value)) return value;
  }
  return null;
}

/** `/share/<id>`: the canonical path of a share page. */
export function sharePath(threadId: string): string {
  return `/share/${encodeURIComponent(threadId)}`;
}

/**
 * The full share link on this site's origin (the page the visitor is on, so preview deployments
 * share preview links), or on `origin` when given.
 */
export function shareUrl(threadId: string, origin?: string): string {
  const base = origin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  return `${base}${sharePath(threadId)}`;
}
