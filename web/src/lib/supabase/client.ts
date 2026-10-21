/**
 * The app's one Supabase client (docs/redesign/migration-plan.md, section 4).
 *
 * - supabase-js is loaded with a dynamic import, so it is its own chunk: pages fetch it only
 *   when someone signs in, holds a session, or arrives with auth parameters in the URL.
 * - `flowType: 'implicit'`: the email templates and the links already in inboxes return tokens in
 *   the #hash, and PKCE email links only work in the browser that asked for them.
 * - The storage key stays supabase-js's default (`sb-<project ref>-auth-token`), which the legacy
 *   pages also write, so old and new pages share one session during the migration.
 * - `detectSessionInUrl`: the client reads the tokens from the URL on /auth-callback.html,
 *   /update-password.html and OAuth returns, then removes them from the address bar.
 */
import type { createClient } from '@supabase/supabase-js';

import { type SupabaseConfig, supabaseConfig } from '@/config/supabase';

/** The client type, as createClient() returns it (no generated database types: auth only). */
export type AuthClient = ReturnType<typeof createClient>;

/** The client's auth options; unit-tested so a change here is deliberate. */
export const AUTH_CLIENT_OPTIONS = Object.freeze({
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
} as const);

/** Thrown when this build has no Supabase settings (sign-in unavailable). */
export class SupabaseUnavailableError extends Error {
  constructor() {
    super('Sign-in is not configured for this build');
    this.name = 'SupabaseUnavailableError';
  }
}

export function createAuthClient(create: typeof createClient, config: SupabaseConfig): AuthClient {
  return create(config.url, config.anonKey, { auth: { ...AUTH_CLIENT_OPTIONS } });
}

let loading: Promise<AuthClient> | null = null;

/**
 * Loads supabase-js and creates the client, once per page. Rejects with
 * SupabaseUnavailableError when the build has no Supabase settings.
 */
export function loadSupabaseClient(config: SupabaseConfig | null = supabaseConfig) {
  if (!config) return Promise.reject(new SupabaseUnavailableError());
  loading ??= import('@supabase/supabase-js').then(module =>
    createAuthClient(module.createClient, config),
  );
  return loading;
}

/** True once loadSupabaseClient() has been called on this page. */
export function isSupabaseClientLoading(): boolean {
  return loading !== null;
}
