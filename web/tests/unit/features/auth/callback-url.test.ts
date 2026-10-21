import { describe, expect, it } from 'vitest';

import { readCallbackUrl, recoveryForward } from '@/features/auth';

describe('readCallbackUrl', () => {
  it('reads tokens and the type from the hash', () => {
    expect(
      readCallbackUrl({
        search: '?redirect=%2Fleaderboard%2F',
        hash: '#access_token=a&refresh_token=r&expires_in=3600&type=signup',
      }),
    ).toEqual({
      type: 'signup',
      hasTokens: true,
      hasCode: false,
      error: null,
      welcome: false,
      redirect: '/leaderboard/',
    });
  });

  it('reads errors from the hash or the query', () => {
    expect(
      readCallbackUrl({
        search: '',
        hash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      }).error,
    ).toEqual({ code: 'otp_expired', description: 'Email link is invalid or has expired' });
    expect(readCallbackUrl({ search: '?error=server_error', hash: '' }).error).toEqual({
      code: 'server_error',
      description: '',
    });
  });

  it('names unknown types "other" and notes PKCE codes and ?welcome=1', () => {
    expect(readCallbackUrl({ search: '?code=x&welcome=1', hash: '#type=weird' })).toMatchObject({
      type: 'other',
      hasCode: true,
      welcome: true,
      hasTokens: false,
    });
  });
});

describe('recoveryForward', () => {
  it('sends a recovery link from the callback page to the reset page with its hash', () => {
    expect(
      recoveryForward({
        pathname: '/auth-callback.html',
        search: '?x=1',
        hash: '#access_token=a&refresh_token=r&type=recovery',
      }),
    ).toBe('/update-password.html?x=1#access_token=a&refresh_token=r&type=recovery');
  });

  it('leaves every other link alone', () => {
    expect(
      recoveryForward({ pathname: '/auth-callback.html', search: '', hash: '#type=signup' }),
    ).toBeNull();
    expect(
      recoveryForward({ pathname: '/update-password.html', search: '', hash: '#type=recovery' }),
    ).toBeNull();
  });
});
