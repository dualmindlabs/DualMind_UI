/**
 * Launch feature flags and the analytics token, from Vite env variables (see web/.env.example).
 * Every flag is OFF unless its variable is set, so a build without them behaves like before:
 *
 * - `VITE_FEATURE_PHONE_SIGNIN`: shows the "Phone code" sign-in tab (SMS pumping risk: needs
 *   captcha and Twilio geo-permissions first).
 * - `VITE_FEATURE_GUEST_BATTLE`: "try one battle without an account" on the landing page. Also
 *   needs the backend's `guestBattle` flag and Turnstile site key (`GET /api/config/public`).
 * - `VITE_FEATURE_PRIVATE_ARENA`: the `/private/` page. Also needs the backend's `privateArena`.
 * - `VITE_ANALYTICS_TOKEN`: the Cloudflare Web Analytics site token. Unset means no analytics at
 *   all; set, the beacon still loads only after the visitor agrees (src/lib/analytics).
 *
 * Public values only, never a secret.
 */

export interface FeatureFlags {
  phoneSignIn: boolean;
  guestBattle: boolean;
  privateArena: boolean;
}

export interface FeatureConfig {
  flags: FeatureFlags;
  /** The Cloudflare Web Analytics token, or null (analytics off). */
  analyticsToken: string | null;
}

type EnvSource = Readonly<Record<string, string | boolean | undefined>>;

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

/** Lenient on purpose: anything that is not clearly "on" is off, so a typo never opens a feature. */
function isOn(env: EnvSource, key: string): boolean {
  const raw = env[key];
  if (typeof raw === 'boolean') return raw;
  return typeof raw === 'string' && TRUE_VALUES.has(raw.trim().toLowerCase());
}

/** Cloudflare Web Analytics tokens are 32 hex characters; anything else is ignored. */
const TOKEN_RE = /^[A-Za-z0-9]{16,64}$/;

export function parseFeatures(env: EnvSource): FeatureConfig {
  const token = env.VITE_ANALYTICS_TOKEN;
  return {
    flags: {
      phoneSignIn: isOn(env, 'VITE_FEATURE_PHONE_SIGNIN'),
      guestBattle: isOn(env, 'VITE_FEATURE_GUEST_BATTLE'),
      privateArena: isOn(env, 'VITE_FEATURE_PRIVATE_ARENA'),
    },
    analyticsToken: typeof token === 'string' && TOKEN_RE.test(token.trim()) ? token.trim() : null,
  };
}

export const featureConfig: FeatureConfig = parseFeatures(import.meta.env);
export const buildFlags: FeatureFlags = featureConfig.flags;
