import { describe, expect, it } from 'vitest';

import { isShareId, shareIdFromLocation, sharePath, shareUrl } from '@/lib/site/share';

// The legacy forms and the Worker parity are covered with the Worker's parser in
// tests/worker/share.test.ts; these are the web-only helpers.

const ID = '2d1b6f0e-8c3a-4f7e-9b1d-5a6c7e8f9a0b';

describe('share links', () => {
  it('accepts API ids and rejects anything that could break out of a path segment', () => {
    expect(isShareId(ID)).toBe(true);
    expect(isShareId('t-recursion')).toBe(true);
    for (const bad of ['', ' ', 'a/b', 'a.b', '../x', '<x>', '-leading', 'x'.repeat(129), 42, null]) {
      expect(isShareId(bad)).toBe(false);
    }
  });

  it('reads the id from the path first, then from the old query parameters', () => {
    expect(shareIdFromLocation(`/share/${ID}`)).toBe(ID);
    expect(shareIdFromLocation('/share/', `?id=${ID}`)).toBe(ID);
    expect(shareIdFromLocation('/share/', `?thread=${ID}`)).toBe(ID);
    expect(shareIdFromLocation('/share/index.html', `?threadId=${ID}`)).toBe(ID);
    expect(shareIdFromLocation(`/share/${ID}`, '?id=other')).toBe(ID);
    expect(shareIdFromLocation('/share/', '?id=a%2Fb')).toBeNull();
    expect(shareIdFromLocation('/share')).toBeNull();
  });

  it('builds the canonical path and the full link on this origin', () => {
    expect(sharePath(ID)).toBe(`/share/${ID}`);
    expect(shareUrl(ID, 'https://arena.dualmindlab.tech')).toBe(
      `https://arena.dualmindlab.tech/share/${ID}`,
    );
    expect(shareUrl(ID)).toBe(`${window.location.origin}/share/${ID}`);
  });
});
