# src/config

Typed, validated build-time configuration. `env.ts` reads `import.meta.env` (only `VITE_` variables reach the browser), checks the values and exports `config`. Placeholders are in `web/.env.example`; real values come from Workers Builds build variables and GitHub Actions variables. Public values only, never a secret.

Owner: @harshbhx
