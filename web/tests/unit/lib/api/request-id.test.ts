import { describe, expect, it, vi } from 'vitest';

import { createRequestId } from '@/lib/api/http/request-id';

import { UUID_V4 } from './helpers';

describe('createRequestId', () => {
  it('uses crypto.randomUUID when the browser has it', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createRequestId()));
    expect(ids.size).toBe(20);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });

  it('builds a version 4 UUID from getRandomValues when randomUUID is missing', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff) });
    expect(createRequestId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('still returns distinct UUID-shaped ids without Web Crypto', () => {
    vi.stubGlobal('crypto', undefined);
    const ids = new Set(Array.from({ length: 20 }, () => createRequestId()));
    expect(ids.size).toBe(20);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
