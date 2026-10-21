import { describe, expect, it } from 'vitest';
import { resolveRequestId, sanitizeRequestId } from '../../server/request-id.js';
import { sanitizeRequestId as proxySanitize } from '../../server/api-proxy.js';

describe('request ids', () => {
  it('keeps a sane id and rejects the rest', () => {
    expect(sanitizeRequestId('trace:abc.def_123')).toBe('trace:abc.def_123');
    for (const bad of [null, undefined, '', 'short', 'x'.repeat(129), 'has space 12345', 'new\nline-12345', 'ünïcode-12345']) {
      expect(sanitizeRequestId(bad as string | null), String(bad)).toBeNull();
    }
  });

  it('generates a UUID when the caller sent nothing usable', () => {
    expect(resolveRequestId('nope')).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
    expect(resolveRequestId(null, () => 'fixed-id-123')).toBe('fixed-id-123');
  });

  it('is the same rule the v1 proxy uses', () => {
    expect(proxySanitize).toBe(sanitizeRequestId);
  });
});
