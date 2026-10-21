import { describe, expect, it, vi } from 'vitest';

import {
  authErrorMessage,
  guardRedirect,
  sendAuthEmail,
  sendLoginNotice,
  sendWelcomeOnce,
} from '@/lib/supabase';
import { GENERIC_AUTH_ERROR, NETWORK_AUTH_ERROR } from '@/lib/supabase/errors';

import { fakeSession, memoryStorage } from './helpers';

const ORIGIN = 'https://arena.dualmindlab.tech';
const LOCATION = { pathname: '/settings/', search: '?tab=1', hash: '' };

describe('guardRedirect', () => {
  it('sends a signed-out visitor to sign-in once, then stays (loop guard)', () => {
    const tab = memoryStorage();
    expect(guardRedirect('signed-out', LOCATION, ORIGIN, tab)).toBe(
      '/login/?redirect=%2Fsettings%2F%3Ftab%3D1',
    );
    expect(tab.getItem('auth_redirect_attempted')).toBe('true');
    expect(guardRedirect('signed-out', LOCATION, ORIGIN, tab)).toBeNull();
    expect(tab.getItem('auth_redirect_attempted')).toBeNull();
  });

  it('waits while loading, and clears the flag once signed in', () => {
    const tab = memoryStorage({ auth_redirect_attempted: 'true' });
    expect(guardRedirect('loading', LOCATION, ORIGIN, tab)).toBeNull();
    expect(tab.getItem('auth_redirect_attempted')).toBe('true');
    expect(guardRedirect('signed-in', LOCATION, ORIGIN, tab)).toBeNull();
    expect(tab.getItem('auth_redirect_attempted')).toBeNull();
    expect(guardRedirect('unavailable', LOCATION, ORIGIN, null)).toBeNull();
  });
});

describe('authErrorMessage', () => {
  it('maps codes, statuses and legacy messages to plain language', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'x' })).toMatch(/do not match/);
    expect(authErrorMessage({ code: 'otp_expired' })).toMatch(/expired/);
    expect(authErrorMessage({ status: 429, message: '' })).toMatch(/Too many attempts/);
    expect(authErrorMessage({ message: 'Email not confirmed' })).toMatch(/Confirm your email/);
    expect(authErrorMessage({ message: 'Token has expired or is invalid' })).toMatch(/expired/);
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_AUTH_ERROR);
    expect(authErrorMessage({ name: 'AuthRetryableFetchError' })).toBe(NETWORK_AUTH_ERROR);
  });

  it('never shows a raw message it does not know', () => {
    expect(authErrorMessage({ message: 'pq: relation "x" does not exist' })).toBe(
      GENERIC_AUTH_ERROR,
    );
    expect(authErrorMessage(undefined)).toBe(GENERIC_AUTH_ERROR);
  });
});

describe('auth emails (the email-wel-safe function contract)', () => {
  const okFetch = () =>
    vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(new Response('{"success":true}', { status: 200 })),
    );

  it('posts the type with the bearer token, kept alive across navigation', async () => {
    const fetcher = okFetch();
    await expect(
      sendAuthEmail('welcome', {
        supabaseUrl: 'https://abcd.supabase.co',
        session: fakeSession(),
        fetch: fetcher as unknown as typeof fetch,
        extra: { redirectUrl: 'https://arena.dualmindlab.tech/' },
      }),
    ).resolves.toBe(true);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://abcd.supabase.co/functions/v1/email-wel-safe');
    expect(init).toMatchObject({
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer access-1' },
    });
    expect(JSON.parse(init?.body as string)).toMatchObject({
      type: 'welcome',
      redirectUrl: 'https://arena.dualmindlab.tech/',
    });
  });

  it('sends the welcome once per user and tab, and the sign-in notice at most every 30 s', async () => {
    const fetcher = okFetch();
    const options = {
      supabaseUrl: 'https://abcd.supabase.co',
      session: fakeSession(),
      fetch: fetcher as unknown as typeof fetch,
    };
    const tab = memoryStorage();
    expect(await sendWelcomeOnce(options, tab)).toBe(true);
    expect(await sendWelcomeOnce(options, tab)).toBe(false);
    expect(tab.getItem('dualmind.auth.welcome-confirmed:user-1')).toBe('1');

    const local = memoryStorage();
    expect(await sendLoginNotice(options, local, 1_000_000)).toBe(true);
    expect(await sendLoginNotice(options, local, 1_010_000)).toBe(false);
    expect(await sendLoginNotice(options, local, 1_031_000)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('never throws when the function is down', async () => {
    const fetcher = vi.fn(() => Promise.reject(new TypeError('offline')));
    await expect(
      sendAuthEmail('login', {
        supabaseUrl: 'https://abcd.supabase.co',
        session: fakeSession(),
        fetch: fetcher,
      }),
    ).resolves.toBe(false);
  });
});
