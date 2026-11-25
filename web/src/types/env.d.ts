/// <reference types="vite/client" />

/** Vite env variables the app reads (validated in src/config/env.ts). Public values only. */
interface ImportMetaEnv {
  /** Public origin of the site, e.g. https://arena.dualmindlab.tech (the default). */
  readonly VITE_SITE_URL?: string;
  /** API origin for `/api/*` calls; empty means same-origin through the Worker (the default). */
  readonly VITE_API_BASE_URL?: string;
  /** `1` or `true` answers API calls from the in-memory mock adapter (demo, offline, e2e). */
  readonly VITE_API_MOCK?: string;
  /** Supabase project URL, https://<project ref>.supabase.co (public; from the build variables). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase public anon key (public by design; from the build variables, never committed). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** `1` shows the phone-code sign-in tab (off by default; see src/config/features.ts). */
  readonly VITE_FEATURE_PHONE_SIGNIN?: string;
  /** `1` enables the guest battle on the landing page (also needs the backend flag). */
  readonly VITE_FEATURE_GUEST_BATTLE?: string;
  /** `1` enables the /private/ arena page (also needs the backend flag). */
  readonly VITE_FEATURE_PRIVATE_ARENA?: string;
  /** Cloudflare Web Analytics site token; unset means no analytics. */
  readonly VITE_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
