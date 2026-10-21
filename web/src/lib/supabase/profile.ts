/**
 * The API profile of the signed-in user: `POST /api/users/sync` creates or updates the
 * `public.users` row and answers with it (role, credits). It is called once per user per browser
 * tab and cached in sessionStorage (`dm.profile.v1`), not on every page.
 */
import type { User } from '@supabase/supabase-js';

import type { UserProfile, UserSyncInput } from '@/lib/api';

import { type KeyValueStorage, PROFILE_CACHE_KEY } from './storage';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** The sync body from a Supabase user (the fields the legacy app sent). */
export function toUserSyncInput(user: User): UserSyncInput {
  const meta: Record<string, unknown> = user.user_metadata ?? {};
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    name:
      text(meta.full_name) ?? text(meta.name) ?? text(meta.user_name) ?? email.split('@')[0] ?? '',
    provider: text(user.app_metadata?.provider) ?? 'email',
    phone: text(user.phone),
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
  };
}

interface CachedProfile {
  userId: string;
  profile: UserProfile;
}

export function readCachedProfile(
  storage: KeyValueStorage | null,
  userId: string,
): UserProfile | null {
  try {
    const raw = storage?.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedProfile> | null;
    return cached?.userId === userId && cached.profile ? cached.profile : null;
  } catch {
    return null;
  }
}

export function writeCachedProfile(
  storage: KeyValueStorage | null,
  userId: string,
  profile: UserProfile,
): void {
  try {
    storage?.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ userId, profile } satisfies CachedProfile),
    );
  } catch {
    // Full or blocked storage: the next page syncs again.
  }
}
