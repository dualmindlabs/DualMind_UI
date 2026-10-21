# src/lib/supabase

The auth layer (slice S6): one Supabase client and everything around the session, framework-free. Import from `@/lib/supabase` (`index.ts`). The design is in [docs/architecture.md](../../../../docs/architecture.md#31-auth-supabase) and [migration-plan.md section 4](../../../../docs/redesign/migration-plan.md#4-auth-port-supabase).

| File                           | What it does                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client.ts`                    | `loadSupabaseClient()`: supabase-js (pinned, its own lazy chunk) with `AUTH_CLIENT_OPTIONS` (implicit flow, default storage key, `detectSessionInUrl`)                                                     |
| `auth-store.ts`                | `authReducer` (the state machine: `loading`, `signed-in`, `signed-out`, `unavailable`) and `createAuthStore()` (reads the session only when there is one, migrates, mirrors, syncs the profile, signs out) |
| `migration.ts`                 | The one-time adoption of a session stored only under `dualmind.auth.supabase`                                                                                                                              |
| `storage.ts`                   | The keys this layer owns, the legacy session copy, and what sign-out clears (legacy keys, `dm.voteQueue.v1`, the cached profile)                                                                           |
| `profile.ts`                   | The `POST /api/users/sync` body from a Supabase user, and the per-tab profile cache                                                                                                                        |
| `access-token.ts`              | The API client's token provider                                                                                                                                                                            |
| `redirect.ts`                  | `safeRedirect()` (same-origin path or `/`), `loginUrl()`, the auth page paths                                                                                                                              |
| `guard.ts`                     | The route guard rule with the legacy loop guard (used by `useRequireAuth()`)                                                                                                                               |
| `validation.ts`, `password.ts` | Field checks, the password rules and the k-anonymity breach check                                                                                                                                          |
| `errors.ts`                    | Plain-language messages for Supabase errors                                                                                                                                                                |
| `auth-email.ts`                | Welcome and sign-in notice emails through the `email-wel-safe` edge function                                                                                                                               |

**Rules:** no React here (the provider is `components/layout/auth-provider.tsx`, the hooks are `hooks/use-auth.ts` and `hooks/use-require-auth.ts`); only the public URL and anon key ever reach the browser, from `src/config/supabase.ts`; tests in `tests/unit/lib/supabase/`.

Owner: @harshbhx
