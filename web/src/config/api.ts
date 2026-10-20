/**
 * API client configuration from Vite env variables (see web/.env.example):
 *
 * - `VITE_API_BASE_URL`: where `/api/*` calls go. Empty (the default) means same-origin, through
 *   the Worker proxy (ADR 0006). Set an absolute http(s) URL only for local work against another
 *   API, for example `http://localhost:5079`.
 * - `VITE_API_MOCK`: `1` or `true` answers every call from the in-memory mock adapter
 *   (src/lib/api/mock) instead of the network: demo and offline mode, Playwright runs. Off unless
 *   set, so a production build never uses it by accident.
 *
 * Public values only, never a secret. Kept apart from env.ts so each concern parses on its own.
 */

export interface ApiConfig {
  /** Origin (and optional path prefix) for API calls, without a trailing slash. '' = same-origin. */
  baseUrl: string;
  /** True when the mock adapter answers every call. */
  mock: boolean;
}

type EnvSource = Readonly<Record<string, string | boolean | undefined>>;

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', '']);

function readFlag(env: EnvSource, key: string): boolean {
  const raw = env[key];
  if (raw === undefined || typeof raw === 'boolean') return raw ?? false;
  const value = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  throw new Error(`${key} must be 1/true or 0/false, got "${raw}"`);
}

function readBaseUrl(env: EnvSource): string {
  const raw = env.VITE_API_BASE_URL;
  if (typeof raw !== 'string' || raw.trim() === '') return '';
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `VITE_API_BASE_URL must be empty (same-origin) or an absolute URL, got "${value}"`,
    );
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`VITE_API_BASE_URL must use http or https, got "${value}"`);
  }
  if (url.search !== '' || url.hash !== '') {
    throw new Error(`VITE_API_BASE_URL must not have a query or a hash, got "${value}"`);
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

export function parseApiConfig(env: EnvSource): ApiConfig {
  return { baseUrl: readBaseUrl(env), mock: readFlag(env, 'VITE_API_MOCK') };
}

export const apiConfig: ApiConfig = parseApiConfig(import.meta.env);
