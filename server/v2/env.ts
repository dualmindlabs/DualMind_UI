// The Worker environment as the v2 router sees it. Bindings are typed loosely on purpose: the
// router only checks that they exist (the not_enabled guard); the features that use them (W2+)
// narrow the types themselves.

export type Env = {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  BACKEND_URL?: string;
  /** Public Supabase project URL (a plain var in wrangler.jsonc). */
  SUPABASE_URL?: string;
  /** Legacy HS256 signing secret. Optional Worker secret. */
  SUPABASE_JWT_SECRET?: string;
  /** Salt for hashed ids in logs. Optional Worker secret. */
  PRIVACY_SALT?: string;
  DB?: unknown;
  DB_PREVIEW?: unknown;
  CACHE?: unknown;
  CACHE_PREVIEW?: unknown;
  EVENTS?: unknown;
  EVENTS_PREVIEW?: unknown;
  PUBLIC_BUCKET?: unknown;
  PUBLIC_BUCKET_PREVIEW?: unknown;
  [key: string]: unknown;
};
