import { describe, expect, it } from 'vitest';

import { DEFAULT_SITE_URL, parseConfig } from '@/config/env';

describe('parseConfig', () => {
  it('falls back to the production origin', () => {
    expect(parseConfig({})).toEqual({ siteUrl: DEFAULT_SITE_URL });
    expect(parseConfig({ VITE_SITE_URL: '   ' })).toEqual({ siteUrl: DEFAULT_SITE_URL });
  });

  it('normalises the site URL to an origin', () => {
    expect(parseConfig({ VITE_SITE_URL: 'https://preview.example.dev/some/path/' }).siteUrl).toBe(
      'https://preview.example.dev',
    );
    expect(parseConfig({ VITE_SITE_URL: 'http://localhost:5173' }).siteUrl).toBe(
      'http://localhost:5173',
    );
  });

  it('rejects values that are not http(s) URLs', () => {
    expect(() => parseConfig({ VITE_SITE_URL: 'arena.dualmindlab.tech' })).toThrow(
      /absolute URL/,
    );
    expect(() => parseConfig({ VITE_SITE_URL: 'javascript:alert(1)' })).toThrow(/http or https/);
  });
});
