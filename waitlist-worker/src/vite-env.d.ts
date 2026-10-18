/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional signup endpoint. Unset in production: signups stay in the browser (see lib/waitlist.ts). */
  readonly VITE_WAITLIST_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
