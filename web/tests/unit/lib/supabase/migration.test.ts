import { describe, expect, it, vi } from 'vitest';

import {
  hasDefaultSession,
  migrateLegacySession,
  readLegacyTokens,
} from '@/lib/supabase/migration';

import { fakeSession, memoryStorage } from './helpers';

const STORAGE_KEY = 'sb-abcd-auth-token';
const LEGACY = 'dualmind.auth.supabase';

/** The shape js/auth/supabase-auth.js and the old /login/ page wrote. */
const legacyFixture = JSON.stringify({
  user: { id: 'user-1', email: 'ada@example.com' },
  session: { access_token: 'old-access', refresh_token: 'old-refresh', expires_at: 1 },
});

function clientWith(result: { data: { session: unknown }; error: unknown } | Error) {
  const setSession = vi.fn(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  );
  return { client: { auth: { setSession } } as never, setSession };
}

describe('readLegacyTokens', () => {
  it('reads { user, session } and a bare session', () => {
    expect(readLegacyTokens(memoryStorage({ [LEGACY]: legacyFixture }))).toEqual({
      access_token: 'old-access',
      refresh_token: 'old-refresh',
    });
    expect(
      readLegacyTokens(memoryStorage({ [LEGACY]: '{"access_token":"a","refresh_token":"r"}' })),
    ).toEqual({ access_token: 'a', refresh_token: 'r' });
  });

  it('ignores missing, broken and incomplete values', () => {
    for (const value of ['', 'null', '{', '[]', '{"session":{"access_token":"a"}}', '"x"']) {
      expect(readLegacyTokens(memoryStorage({ [LEGACY]: value })), value).toBeNull();
    }
    expect(readLegacyTokens(memoryStorage())).toBeNull();
    expect(readLegacyTokens(null)).toBeNull();
  });
});

describe('migrateLegacySession', () => {
  it('adopts the legacy session when the default key is empty, and keeps the copy', async () => {
    const storage = memoryStorage({ [LEGACY]: legacyFixture });
    const session = fakeSession();
    const { client, setSession } = clientWith({ data: { session }, error: null });
    await expect(migrateLegacySession(client, storage, STORAGE_KEY)).resolves.toEqual({
      status: 'migrated',
      session,
    });
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'old-access',
      refresh_token: 'old-refresh',
    });
    // The legacy arena still reads it until slice S8.
    expect(storage.getItem(LEGACY)).toBe(legacyFixture);
  });

  it('does nothing when supabase-js already has a session, or there is no copy', async () => {
    const { client, setSession } = clientWith({ data: { session: null }, error: null });
    const both = memoryStorage({ [LEGACY]: legacyFixture, [STORAGE_KEY]: '{"a":1}' });
    expect(hasDefaultSession(both, STORAGE_KEY)).toBe(true);
    await expect(migrateLegacySession(client, both, STORAGE_KEY)).resolves.toEqual({
      status: 'none',
    });
    await expect(migrateLegacySession(client, memoryStorage(), STORAGE_KEY)).resolves.toEqual({
      status: 'none',
    });
    expect(setSession).not.toHaveBeenCalled();
  });

  it('removes a copy the auth server rejects, so it is tried only once', async () => {
    const storage = memoryStorage({ [LEGACY]: legacyFixture });
    const { client } = clientWith({
      data: { session: null },
      error: { status: 400, message: 'Invalid Refresh Token' },
    });
    await expect(migrateLegacySession(client, storage, STORAGE_KEY)).resolves.toEqual({
      status: 'rejected',
    });
    expect(storage.getItem(LEGACY)).toBeNull();
  });

  it('keeps the copy after a network failure, for the next visit', async () => {
    const storage = memoryStorage({ [LEGACY]: legacyFixture });
    const offline = clientWith(new TypeError('Failed to fetch'));
    await expect(migrateLegacySession(offline.client, storage, STORAGE_KEY)).resolves.toEqual({
      status: 'error',
    });
    const serverError = clientWith({ data: { session: null }, error: { status: 503 } });
    await expect(migrateLegacySession(serverError.client, storage, STORAGE_KEY)).resolves.toEqual({
      status: 'error',
    });
    expect(storage.getItem(LEGACY)).toBe(legacyFixture);
  });
});
