import { describe, expect, it } from 'vitest';

import { loginUrl, redirectFromSearch, safeRedirect, withRedirect } from '@/lib/supabase';

const ORIGIN = 'https://arena.dualmindlab.tech';

describe('safeRedirect', () => {
  it.each([
    ['/leaderboard/', '/leaderboard/'],
    ['/?thread=abc#top', '/?thread=abc#top'],
    ['/legacy-app.html', '/legacy-app.html'],
    ['/models/gpt-x/?tab=1', '/models/gpt-x/?tab=1'],
    ['  /about/  ', '/about/'],
  ])('keeps the same-origin path %s', (raw, expected) => {
    expect(safeRedirect(raw, ORIGIN)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    'leaderboard',
    'https://evil.example/',
    `${ORIGIN}/leaderboard/`,
    '//evil.example/x',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    '/a\u0000b',
    '/login/',
    '/login',
    '/login-modern.html?redirect=/',
    '/signup/',
    '/forgot-password/',
    '/auth-callback.html',
    '/update-password.html#access_token=x',
  ])('falls back to / for %s', raw => {
    expect(safeRedirect(raw, ORIGIN)).toBe('/');
  });

  it('reads ?redirect= from a query string', () => {
    expect(redirectFromSearch('?redirect=%2Fleaderboard%2F', ORIGIN)).toBe('/leaderboard/');
    expect(redirectFromSearch('?redirect=https%3A%2F%2Fevil.example', ORIGIN)).toBe('/');
    expect(redirectFromSearch('', ORIGIN)).toBe('/');
  });
});

describe('loginUrl and withRedirect', () => {
  it('builds the sign-in URL for a guarded page, without a redirect for /', () => {
    expect(loginUrl('/settings/?tab=profile', ORIGIN)).toBe(
      '/login/?redirect=%2Fsettings%2F%3Ftab%3Dprofile',
    );
    expect(loginUrl('/', ORIGIN)).toBe('/login/');
    expect(loginUrl('https://evil.example/', ORIGIN)).toBe('/login/');
  });

  it('carries a valid redirect between the sign-in and sign-up pages', () => {
    expect(withRedirect('/signup/', '?redirect=%2Fmodels%2F', ORIGIN)).toBe(
      '/signup/?redirect=%2Fmodels%2F',
    );
    expect(withRedirect('/signup/', '?redirect=%2F%2Fevil', ORIGIN)).toBe('/signup/');
  });
});
