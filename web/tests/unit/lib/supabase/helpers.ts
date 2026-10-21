import type { Session, User } from '@supabase/supabase-js';

/** A Storage stand-in backed by a Map, with the members the auth layer uses. */
export function memoryStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

export function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    email: 'ada@example.com',
    phone: '',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: 'Ada Lovelace' },
    created_at: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

export function fakeSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4_102_444_800,
    user: fakeUser(),
    ...overrides,
  };
}
