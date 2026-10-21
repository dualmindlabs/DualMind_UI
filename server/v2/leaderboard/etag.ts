// Content hash ETag and If-None-Match matching (BE-4 design, sections 4 and 6.4).

import type { LeaderboardItem } from '../../../contract/leaderboard.ts';

/** JSON with object keys sorted at every level, so the hash does not depend on key order. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const parts = Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value);
}

/** `"lb-<16 hex>"`: SHA-256 over the items and the provisional threshold, never `generatedAt`. */
export async function contentEtag(items: readonly LeaderboardItem[], provisionalBelow: number): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson({ items, provisionalBelow }));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest).slice(0, 8), byte => byte.toString(16).padStart(2, '0')).join('');
  return `"lb-${hex}"`;
}

const opaqueTag = (tag: string) => tag.replace(/^W\//, '');

/** Weak comparison: a tag list, `W/` prefixes ignored, `*` matches anything; garbage matches nothing. */
export function ifNoneMatchHits(header: string | null | undefined, etag: string): boolean {
  if (!header) return false;
  const tags = header.match(/(?:W\/)?"[^"]*"|\*/g);
  if (!tags) return false;
  const current = opaqueTag(etag);
  return tags.some(tag => tag === '*' || opaqueTag(tag) === current);
}
