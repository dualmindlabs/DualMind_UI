/**
 * Supabase configuration from Vite env variables (see web/.env.example):
 *
 * - `VITE_SUPABASE_URL`: the project URL, `https://<project ref>.supabase.co`.
 * - `VITE_SUPABASE_ANON_KEY`: the project's public anon (or publishable) key.
 *
 * Both are public by design: they ship to every browser, and row-level security protects the
 * data. They still never live in committed files: production and preview builds read them from
 * the Workers Builds build variables, CI uses dummy values, and local work uses web/.env.local.
 * Never put a service-role or secret key here.
 *
 * Missing or unusable values do not throw: the app builds and runs, and the sign-in pages show
 * a "sign-in unavailable" notice instead of a broken form (`supabaseConfig` is null).
 */

export interface SupabaseConfig {
  /** Project origin, without a trailing slash. */
  url: string;
  anonKey: string;
  /** The first label of the project host (`abcd` for https://abcd.supabase.co). */
  projectRef: string;
  /**
   * supabase-js's default session key for this project, `sb-<project ref>-auth-token`. The
   * legacy pages use the same default, so both share one session during the migration.
   */
  storageKey: string;
}

type EnvSource = Readonly<Record<string, string | boolean | undefined>>;

export type SupabaseConfigResult =
  { status: 'ok'; config: SupabaseConfig } | { status: 'missing' | 'invalid'; reason: string };

function readString(env: EnvSource, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * True for a key that must never reach a browser: a new-style secret key (`sb_secret_...`) or a
 * legacy JWT whose payload says `service_role`. Anon and publishable keys pass.
 */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const payload = key.split('.')[1];
  if (key.split('.').length !== 3 || !payload) return false;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return /"role"\s*:\s*"service_role"/.test(json);
  } catch {
    return false;
  }
}

export function parseSupabaseConfig(env: EnvSource): SupabaseConfigResult {
  const rawUrl = readString(env, 'VITE_SUPABASE_URL');
  const anonKey = readString(env, 'VITE_SUPABASE_ANON_KEY');
  if (!rawUrl || !anonKey) {
    return {
      status: 'missing',
      reason: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set for this build',
    };
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { status: 'invalid', reason: 'VITE_SUPABASE_URL is not an absolute URL' };
  }
  // A local Supabase (supabase start) runs on plain http; everything else must be https.
  const secure =
    url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname));
  if (!secure) {
    return { status: 'invalid', reason: 'VITE_SUPABASE_URL must use https' };
  }
  if (isSecretKey(anonKey)) {
    return { status: 'invalid', reason: 'VITE_SUPABASE_ANON_KEY must be the public anon key' };
  }
  const projectRef = url.hostname.split('.')[0] ?? url.hostname;
  return {
    status: 'ok',
    config: {
      url: url.origin,
      anonKey,
      projectRef,
      storageKey: `sb-${projectRef}-auth-token`,
    },
  };
}

const result = parseSupabaseConfig(import.meta.env);

/** The project's public settings, or null when this build has none (sign-in unavailable). */
export const supabaseConfig: SupabaseConfig | null = result.status === 'ok' ? result.config : null;

/** Why sign-in is unavailable in this build, for the notice and the console; null when it works. */
export const supabaseConfigProblem: string | null = result.status === 'ok' ? null : result.reason;
