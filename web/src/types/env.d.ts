/// <reference types="vite/client" />

/** Vite env variables the app reads (validated in src/config/env.ts). Public values only. */
interface ImportMetaEnv {
  /** Public origin of the site, e.g. https://arena.dualmindlab.tech (the default). */
  readonly VITE_SITE_URL?: string;
  /** API origin for `/api/*` calls; empty means same-origin through the Worker (the default). */
  readonly VITE_API_BASE_URL?: string;
  /** `1` or `true` answers API calls from the in-memory mock adapter (demo, offline, e2e). */
  readonly VITE_API_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
