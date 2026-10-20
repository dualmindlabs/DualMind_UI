/**
 * Build-time configuration from Vite env variables (VITE_ prefix only, so nothing else reaches
 * the browser bundle). Values are validated once here; the rest of the app imports `config`.
 * Placeholders live in web/.env.example. Only public values belong here, never a secret.
 */

export interface AppConfig {
  /** Public origin of the site, for canonical and Open Graph URLs. No trailing slash. */
  siteUrl: string;
}

export const DEFAULT_SITE_URL = 'https://arena.dualmindlab.tech';

type EnvSource = Readonly<Record<string, string | boolean | undefined>>;

function readString(env: EnvSource, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function parseConfig(env: EnvSource): AppConfig {
  const rawSiteUrl = readString(env, 'VITE_SITE_URL') ?? DEFAULT_SITE_URL;
  let siteUrl: URL;
  try {
    siteUrl = new URL(rawSiteUrl);
  } catch {
    throw new Error(`VITE_SITE_URL must be an absolute URL, got "${rawSiteUrl}"`);
  }
  if (siteUrl.protocol !== 'https:' && siteUrl.protocol !== 'http:') {
    throw new Error(`VITE_SITE_URL must use http or https, got "${rawSiteUrl}"`);
  }
  return { siteUrl: siteUrl.origin };
}

export const config: AppConfig = parseConfig(import.meta.env);
