# src/config

Typed, validated build-time configuration. `env.ts` reads `import.meta.env` (only `VITE_` variables reach the browser), checks the values and exports `config`; `api.ts` does the same for the API client (`apiConfig`), and `supabase.ts` for sign-in (`supabaseConfig`: the project URL and public anon key from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, or null when the build has none, which the sign-in pages show as "unavailable"; secret keys are refused). Placeholders are in `web/.env.example`; real values come from Workers Builds build variables and GitHub Actions variables. Public values only, never a secret.

Owner: @harshbhx
