import { describe, expect, it } from 'vitest';

import {
  accountSwitchPending,
  AUTH_CLIENT_OPTIONS,
  readsUrlTokens,
  readSwitchConfirmed,
  shouldDetectSessionInUrl,
  SWITCH_CONFIRM_KEY,
  writeSwitchConfirmed,
} from '@/lib/supabase';

import { memoryStorage } from './helpers';

const TOKENS = '#access_token=a&refresh_token=b&expires_in=3600&token_type=bearer&type=magiclink';
const SIGNED_IN = { 'sb-abcdefghijkl-auth-token': '{"access_token":"x","refresh_token":"y"}' };
const url = (pathname: string, hash = TOKENS, search = '') => ({ pathname, search, hash });

describe('where tokens are read', () => {
  it('only on the two auth pages', () => {
    expect(readsUrlTokens('/auth-callback.html')).toBe(true);
    expect(readsUrlTokens('/update-password.html')).toBe(true);
    for (const path of [
      '/',
      '/leaderboard/',
      '/login/',
      '/share/abc',
      '/auth-callback',
      '/auth-callback.html/x',
    ]) {
      expect(readsUrlTokens(path), path).toBe(false);
    }
  });

  it('supabase-js is configured with a function, not a plain true', () => {
    expect(typeof AUTH_CLIENT_OPTIONS.detectSessionInUrl).toBe('function');
    expect(AUTH_CLIENT_OPTIONS.flowType).toBe('implicit');
  });

  it('never detects tokens on other pages, whatever is stored', () => {
    for (const local of [memoryStorage(), memoryStorage(SIGNED_IN)]) {
      for (const path of ['/', '/leaderboard/', '/models/', '/share/abc', '/login/']) {
        expect(shouldDetectSessionInUrl(url(path), local, memoryStorage()), path).toBe(false);
      }
    }
  });

  it('detects them on the reset page even when someone is signed in', () => {
    expect(
      shouldDetectSessionInUrl(
        url('/update-password.html'),
        memoryStorage(SIGNED_IN),
        memoryStorage(),
      ),
    ).toBe(true);
  });

  it('detects them on the callback page when nobody is signed in', () => {
    expect(
      shouldDetectSessionInUrl(url('/auth-callback.html'), memoryStorage(), memoryStorage()),
    ).toBe(true);
  });

  it('waits for a yes on the callback page when another account is signed in', () => {
    const tab = memoryStorage();
    const local = memoryStorage(SIGNED_IN);
    expect(shouldDetectSessionInUrl(url('/auth-callback.html'), local, tab)).toBe(false);
    writeSwitchConfirmed(tab, true);
    expect(shouldDetectSessionInUrl(url('/auth-callback.html'), local, tab)).toBe(true);
  });
});

describe('accountSwitchPending', () => {
  it('needs the callback page, tokens, a stored session and no answer yet', () => {
    const local = memoryStorage(SIGNED_IN);
    const tab = memoryStorage();
    expect(accountSwitchPending(url('/auth-callback.html'), local, tab)).toBe(true);
    expect(accountSwitchPending(url('/auth-callback.html'), memoryStorage(), tab)).toBe(false);
    expect(accountSwitchPending(url('/auth-callback.html', ''), local, tab)).toBe(false);
    expect(
      accountSwitchPending(url('/auth-callback.html', '#error=access_denied'), local, tab),
    ).toBe(false);
    expect(accountSwitchPending(url('/update-password.html'), local, tab)).toBe(false);
    expect(accountSwitchPending(url('/'), local, tab)).toBe(false);
  });

  it('counts the legacy session key as a stored session', () => {
    const local = memoryStorage({ 'dualmind.auth.supabase': '{"access_token":"x"}' });
    expect(accountSwitchPending(url('/auth-callback.html'), local, memoryStorage())).toBe(true);
  });

  it('survives storage that throws', () => {
    const broken = {
      length: 1,
      key: () => {
        throw new Error('blocked');
      },
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(accountSwitchPending(url('/auth-callback.html'), broken, broken)).toBe(false);
    expect(readSwitchConfirmed(broken)).toBe(false);
    expect(() => writeSwitchConfirmed(null, true)).not.toThrow();
  });

  it('stores the answer under one tab key and clears it', () => {
    const tab = memoryStorage();
    writeSwitchConfirmed(tab, true);
    expect(tab.getItem(SWITCH_CONFIRM_KEY)).toBe('1');
    writeSwitchConfirmed(tab, false);
    expect(readSwitchConfirmed(tab)).toBe(false);
  });
});
