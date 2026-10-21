/**
 * The API client's token provider (lib/api, `getAccessToken`): the signed-in user's Supabase
 * access token, refreshed by supabase-js when it is about to expire. When nobody is signed in it
 * answers null without loading supabase-js, so public pages stay light.
 */
import { supabaseConfig } from '@/config/supabase';
import { hasStoredSession } from '@/lib/session/handoff';

import { isSupabaseClientLoading, loadSupabaseClient } from './client';
import { browserLocalStorage } from './storage';

function storedSession(): boolean {
  try {
    const storage = browserLocalStorage();
    return storage !== null && hasStoredSession(storage);
  } catch {
    return false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabaseConfig) return null;
  if (!isSupabaseClientLoading() && !storedSession()) return null;
  const client = await loadSupabaseClient(supabaseConfig);
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
