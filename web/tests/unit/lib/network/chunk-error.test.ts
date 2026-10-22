import { describe, expect, it } from 'vitest';

import { isChunkLoadError } from '@/lib/network/chunk-error';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x.test/assets/a-1.js',
    'error loading dynamically imported module: https://x.test/assets/a-1.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/a.css',
    'Loading chunk 12 failed.',
  ])('recognises %s', message => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
    expect(isChunkLoadError(message)).toBe(true);
  });

  it('recognises a ChunkLoadError by name', () => {
    const error = new Error('x');
    error.name = 'ChunkLoadError';
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(404)).toBe(false);
  });
});
