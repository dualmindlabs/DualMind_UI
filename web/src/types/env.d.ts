/// <reference types="vite/client" />

/** Vite env variables the app reads (validated in src/config/env.ts). Public values only. */
interface ImportMetaEnv {
  /** Public origin of the site, e.g. https://arena.dualmindlab.tech (the default). */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
