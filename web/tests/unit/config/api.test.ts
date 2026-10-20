import { describe, expect, it } from 'vitest';

import { apiConfig, parseApiConfig } from '@/config/api';

describe('parseApiConfig', () => {
  it('defaults to same-origin calls without the mock', () => {
    expect(parseApiConfig({})).toEqual({ baseUrl: '', mock: false });
    expect(parseApiConfig({ VITE_API_BASE_URL: '  ', VITE_API_MOCK: '' })).toEqual({
      baseUrl: '',
      mock: false,
    });
  });

  it('normalises an absolute base URL, keeping a path prefix', () => {
    expect(parseApiConfig({ VITE_API_BASE_URL: 'http://localhost:5079/' }).baseUrl).toBe(
      'http://localhost:5079',
    );
    expect(parseApiConfig({ VITE_API_BASE_URL: 'https://example.dev/proxy//' }).baseUrl).toBe(
      'https://example.dev/proxy',
    );
  });

  it('rejects base URLs that are relative, not http(s), or carry a query', () => {
    expect(() => parseApiConfig({ VITE_API_BASE_URL: '/api' })).toThrow(/absolute URL/);
    expect(() => parseApiConfig({ VITE_API_BASE_URL: 'ftp://example.dev' })).toThrow(/http or https/);
    expect(() => parseApiConfig({ VITE_API_BASE_URL: 'https://example.dev/?x=1' })).toThrow(
      /query or a hash/,
    );
  });

  it('reads the mock flag strictly', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
      expect(parseApiConfig({ VITE_API_MOCK: value }).mock, value).toBe(true);
    }
    for (const value of ['0', 'false', 'no', 'off']) {
      expect(parseApiConfig({ VITE_API_MOCK: value }).mock, value).toBe(false);
    }
    expect(parseApiConfig({ VITE_API_MOCK: true }).mock).toBe(true);
    expect(() => parseApiConfig({ VITE_API_MOCK: 'maybe' })).toThrow(/VITE_API_MOCK/);
  });

  it('is off in the test build', () => {
    expect(apiConfig).toEqual({ baseUrl: '', mock: false });
  });
});
