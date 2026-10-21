# Review of the DualMind API repository (DualMind_Back)

Status: **review plus proposal** (2026-10-21). Read-only: nothing was changed, built or deployed in `DualMind_Back`, and no database or cloud account was touched.

| | |
| --- | --- |
| Repository | `dualmindlabs/DualMind_Back` (private), default branch `master` |
| Reviewed commit | `e23c37f` (2026-10-19, "test: make the soft-timeout battle test deterministic (#26)") |
| Method | Source read with `cat`, `grep`, `git log`. No `dotnet`, no Docker, no live calls |
| UI repo state compared against | `docs/api/endpoints.md` at UI `master` (`5e09167`) |
| Not verifiable from the repo | The Postgres schema, the `v_leaderboard` and `v_comparisons_masked` views, any trigger or function, row-level security. None is committed (`.gitignore` ignores `*.sql`). Items that depend on them are marked **inferred** |

> **The database currently holds TEST data** (Harsh, 2026-10-21). Nothing in this document was run against it. Every schema change below is a proposal. **Azure deploys and database migrations need Harsh's go**, per change, before anything is applied. Note that the API is not hosted on Azure (section 1): it runs on Cloudflare Containers.

## Contents

1. [Overview](#1-overview)
2. [Data model](#2-data-model)
3. [Endpoints and the diff against the UI contract](#3-endpoints)
4. [The four contract problems, and the counting, Elo and vote questions](#4-contract-problems)
5. [Proposed redesign and migration plan](#5-proposal)

---

## 1. Overview

### 1.1 Layout

| Path | What it is | Live? |
| --- | --- | --- |
| `src/DualMind.API/` | The ASP.NET Core Web API, `net8.0`, controllers (MVC, not minimal APIs), Newtonsoft.Json | **Yes** |
| `src/Dockerfile` | Multi-stage build (SDK 8.0, runtime `aspnet:8.0-alpine`), port 8080 | Yes |
| `cf-worker/` (`src/index.js`, `wrangler.jsonc`, `scripts/*.ps1`) | The `dualmind-api` Cloudflare Worker that owns the container (Durable Object, SQLite class `DualMindContainer`) and a `*/5 * * * *` keep-alive cron | Yes |
| `tests/DualMind.API.Tests/` | xUnit project, `net8.0`, about 90 `[Fact]`/`[Theory]` methods in 17 files | CI |
| `Backup/` and `Backup/Legacy_v4.8/` | The older .NET Framework 4.8 / Web API 2 code (`Global.asax`, `Web.config`, Bytez provider), checked in twice | **Dead** |
| `DualMind.sln`, `DualMind_Back.slnx`, `src/DualMind.API/DualMind.API.sln` | Three solution files for one project | Redundant |
| `docs/openapi.yaml` | Hand-written OpenAPI, out of date (section 3.3) | Docs |
| `docs/2026-10-12-production-readiness/` | A 13-part audit (backlog, runbooks, endpoint inventory) | Docs |
| `KNOWN_ISSUES.md`, `CHANGELOG.md`, `.planning/codebase/*` | Verified bug list (2026-10-18), changelog, older codebase maps | Docs |
| `seed_db.py`, `debug_db.ps1`, `verify_*.py/.ps1`, `stats.json`, `UpgradeLog.htm`, `dotnet-install.sh`, `src/DualMind.API/WeatherForecast.cs`, `warnings_full.txt` | Scratch and template leftovers. `seed_db.py` writes synthetic comparisons and votes and **contains a hard-coded Supabase service-role credential** (value not reproduced here; audit item SEC-01 asks for rotation) | Remove |

Source size: about 5,600 lines in the controllers and services. There is no EF Core, no repository layer and no domain model: every service calls Supabase PostgREST over `HttpClient` (`Infrastructure/Data/SupabaseService.cs`) with filter strings built by interpolation.

### 1.2 Versions and dependencies

| Item | Value | Where |
| --- | --- | --- |
| Target framework | `net8.0` (API and tests) | `src/DualMind.API/DualMind.API.csproj:4` |
| ASP.NET packages | `JwtBearer 8.0.32`, `Mvc.NewtonsoftJson 8.0.32` | same file, lines 13-14 |
| Serialisation | Newtonsoft.Json 13.0.4, camelCase resolver, `NullValueHandling.Ignore`, UTC | `Program.cs:14-19` |
| Docs | Swashbuckle.AspNetCore 6.9.0, Microsoft.OpenApi 1.6.31 (Swagger only if `ENABLE_SWAGGER=true` or Development) | `Program.cs:25-58, 187-194` |
| Telegram | Telegram.Bot 22.10.3.3 (a hosted `BackgroundService` plus webhook controller) | `Bot/` |
| Config loader | DotNetEnv 3.2.0 (`.env` in dev) | `Infrastructure/Configuration/EnvConfig.cs` |
| Tests | xUnit 2.9.3, `Microsoft.AspNetCore.Mvc.Testing 8.0.32`, coverlet | `tests/DualMind.API.Tests/DualMind.API.Tests.csproj` |
| Note | `System.Configuration.ConfigurationManager 10.0.13` is referenced from a `net8.0` project (a leftover of the Framework 4.8 port) | `DualMind.API.csproj:18` |

### 1.3 Hosting and deploy

| Item | Finding (names only, no values) |
| --- | --- |
| Host | **Cloudflare Containers** behind the `dualmind-api` Worker (`cf-worker/wrangler.jsonc`: `instance_type: standard-1`, `max_instances: 3`, Durable Object `DualMindContainer`). Public host `api.dualmindlab.tech`. **There is no Azure deployment, pipeline or config in the repo**: "Azure" appears only in prose: a stale "Azure Deployment (App Service, Key Vault)" section in `ENV_SETUP.md:66-70`, code comments about "Azure secrets" in `GroqService.cs` and `GoogleService.cs`, and the audit docs. Whoever briefed "Azure" should be told the host is Cloudflare. |
| Deploy pipeline | `.github/workflows/deploy-cloudflare.yml`, workflow name "Build & Deploy to Cloudflare Containers". Jobs: `build-and-test`, `docker-build` (builds the image, runs it, probes `/api/arena/test` with no token, unsigned token, signed token), `worker-check`, `deploy` (master pushes and manual runs on master only, `environment: production`, then a post-deploy auth probe). Pull requests run build and test only |
| CI | `.github/workflows/verify.yml` ("Verify": restore, build, test on `master` pushes and PRs) and the first two jobs of the deploy workflow. So **two workflows both build and test every PR** |
| Secrets used by CI (GitHub secret names) | `CLOUDFLARE_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `TELEGRAM__BOTTOKEN`, `CF_AI_GATEWAY_ACCOUNT_ID`, `CF_AI_GATEWAY_ID`, `CF_AI_GATEWAY_TOKEN`, `CF_WORKERS_AI_API_TOKEN` (header of the workflow) |
| Container env | Only names listed in `containerEnvVars()` in `cf-worker/src/index.js` reach the .NET process (the fix for KNOWN_ISSUES N1 arrived in PR #24) |
| Other config files | `docker-compose.yml` (local), `.env.example`, `src/DualMind.API/appsettings.json` and `appsettings.Development.json` (KNOWN_ISSUES N3 says a service key was committed in `appsettings.json`; I did not open the values) |
| Dependabot | `.github/dependabot.yml`: nuget, npm, docker, github-actions |
| Missing | No staging environment (the `staging` choice in `workflow_dispatch` has no separate target), no migration step (there are no migrations), no lint or format check, no OpenAPI generation or contract test, no coverage gate |

### 1.4 Tests

| Area covered | File | Notes |
| --- | --- | --- |
| JWT validation | `JwtAuthenticationTests.cs`, `AuthTestHost.cs` | 23 cases: unsigned, wrong key, wrong audience, expired. Good |
| Vote endpoint | `VotesControllerTests.cs` | 6 cases on `POST /api/arena/model-vote` with a fake `IModelStatsService` |
| Model selection | `ModelSelectorTests.cs` | 3 |
| Telegram bot | six `Telegram*Tests.cs`, `BattleCommandHandlerTests.cs`, `StatsCommandHandlerTests.cs` | the bulk of the suite |
| Supabase client | `SupabaseServiceTests.cs` | 2 |
| Smoke | `SmokeTests.cs` | 6 |
| **Not covered** | `ArenaController` (`dualchat`, `chat`, `chat/stream`), `ThreadsController` ownership, `UserSyncService`, `ComparisonLogger`, `ModelStatsService.RecordVoteByChoiceAsync`, speech, every admin controller, provider key rotation | The paths that create and score battles have no test |

---

## 2. Data model

### 2.1 How the database is accessed

| Question | Answer |
| --- | --- |
| ORM or migrations | **None.** No EF Core `DbContext`, no `Migrations/` folder, no SQL files. Schema lives only in Supabase (Postgres). `.gitignore:141` ignores `*.sql`; the old `database/migrations/` folder was removed from the tree (KNOWN_ISSUES #1 cites commit `6d220a7` for the last Cloudflare leaderboard seed) |
| Access | PostgREST through `SupabaseService` (`Select/SelectSingle/Insert/Upsert/Update/Delete/Rpc`) and `AdminSupabaseClient`, always with the **service-role key**, which bypasses row-level security (`SupabaseService.cs:36-45`, `Program.cs:112-124`) |
| Filters | Built by string interpolation, not encoded: `$"model_name=eq.{modelName}"` (`ComparisonLogger.cs:47`, `ModelStatsService.cs:71`), `$"key=eq.{key}"` (`SystemSettingsService.cs:23`). A model name or flag key containing `&` or PostgREST operators changes the query |
| Transactions | None. Each call is its own request, so multi-step writes (vote insert, reveal, vote update) are not atomic |

### 2.2 Tables and views the code touches (reconstructed)

Columns are only those the code reads or writes. Types are inferred from usage; constraints marked *inferred* are not visible in the repo.

| Object | Columns seen in code | Keys and relations | Written by | Read by |
| --- | --- | --- | --- | --- |
| `users` | `user_id` (uuid, = Supabase auth id), `email`, `full_name`, `role` (`admin`/`user`); the UI also reads `energy_balance` straight from Supabase REST | PK `user_id` (inferred). `role` read on **every authenticated request** (`RoleClaimsTransformation`, one PostgREST call per request) | `UserSyncService` (upsert, merge-duplicates), admin users controller | auth role lookup, admin |
| `ai_models` | `model_id` (uuid), `model_name`, `display_name`, `provider_name`, `is_free`, `status` (`active`/`inactive`/`maintenance`), `created_at` | PK `model_id`; `provider_name` is a FK to `providers` (comment `ComparisonLogger.cs:57`: "provider_name must always be lowercase"). `model_name` uniqueness not enforced in code: `GetOrCreateModelIdAsync` does select-then-insert (race) | `ComparisonLogger` (auto-creates unknown models as `active`), admin | `ModelSelector` (5-minute in-memory cache), `ModelsController`, `ModelStatsService` |
| `providers` | `name`, `enabled`, `priority` | PK `name` (inferred) | admin providers | `ProviderConfigService` |
| `provider_api_keys` | `key_id`, `provider`, `api_key`, display mask, cooldown/usage state, enabled | FK to provider (inferred) | `AdminKeysController`, `ProviderConfigService` (updates cooldown) | `ProviderConfigService` (`select=*`) |
| `threads` | `thread_id`, `user_id`, `title`, `mode` (default `battle`), `visibility` (`private`/`unlisted`/`public`), `message_count`, `created_at`, `updated_at` | PK `thread_id`; `user_id` FK to `users` | `ThreadsService`, admin | threads controller |
| `thread_messages` | `message_id`, `thread_id`, `prompt_text`, `model1_name`, `model2_name`, `model1_response`, `model2_response`, `model1_time_ms`, `model2_time_ms`, `comparison_id`, `position`, `created_at` | FK `thread_id`; `comparison_id` links to `comparisons`. **Stores model names, not ids.** `position` = next integer from `max(position)+1` read by a separate query (race: two concurrent turns get the same position) | `ThreadMessagesService` (`LogSingleAsync`, `LogDualAsync`) | thread messages endpoint |
| `comparisons` | `comparison_id` (uuid, generated by the API), `user_id`, `prompt_text`, `model1_id`, `model2_id`, `model1_response`, `model2_response`, `model1_time_ms`, `model2_time_ms`, `is_revealed`, `created_at` | PK `comparison_id` (the API supplies it, so a duplicate id would be rejected, but the API never reuses one). FKs to `ai_models` | `ComparisonLogger` (insert), `ModelStatsService` (set `is_revealed = true`) | admin; masked view for votes |
| `v_comparisons_masked` (view) | `comparison_id`, `model1_id`, `model2_id` (masked until revealed, **inferred**) | n/a | n/a | `ModelStatsService.RecordVoteByChoiceAsync` |
| `model_votes` | `user_id`, `comparison_id`, `winner_model_id` (null for tie and both-bad), `vote_choice` (`left`/`right`/`tie`/`both-bad`, **not validated by the API**), `vote_duration_ms`, `voted_at`, `revealed_at` | A `UNIQUE(comparison_id, user_id)` is relied on by a code comment (`ModelStatsService.cs:119`) but is not in the repo (the audit calls it "needed", `06-architecture.md`). The API never checks for a prior vote | `ModelStatsService` | thread messages (`vote_choice`), admin, `v_leaderboard` |
| `v_leaderboard` (view) | `model_id`, `model_name`, `display_name`, `provider_name`, `elo_score`, `total_wins`, `total_losses`, `total_ties`, `total_comparisons`, `win_rate`, `elo_rank` | derived | n/a | `ModelStatsService.GetModelStatsAsync` |
| `system_settings` | `key`, `is_enabled` (or `value`) | feature flags (`public_sharing`) | admin or SQL | `SystemSettingsService` |
| `telegram_sessions` | encrypted access and refresh tokens, chat id | n/a | `TelegramSessionStore` | Telegram bot |

### 2.3 How each concept is stored

| Concept | Storage | Gaps |
| --- | --- | --- |
| **Battle / comparison** | One `comparisons` row per `dualchat` call, written by `ComparisonLogger` *after* both providers answered. Model identity is stored as `model1_id`/`model2_id`, which doubles as the left/right side. Responses and latency stored inline | No status (pending, failed, fallback), no prompt hash, no request id or idempotency key, no side flag (the pair order is random for `random`, but the side is not recorded separately), no token counts, no category. The logger swallows every exception (`ComparisonLogger.cs:43-46`), so a failed insert still returns a `comparisonId` to the client |
| **Vote** | One `model_votes` row, then `comparisons.is_revealed = true`, then a second update on the vote row (`revealed_at`). Three separate PostgREST calls | Not atomic. `is_revealed` is global, not per user. A duplicate vote is rejected only if the unique constraint exists, and then surfaces as HTTP 500 with the raw error text |
| **Elo** | **Not in this repo.** The API only reads `elo_score` from `v_leaderboard` (`ModelStatsService.cs:22-49`). Whatever updates ratings (a view, trigger or function) lives in Supabase and is undocumented. KNOWN_ISSUES #1 reports the 34 seeded Workers AI models still sit on hand-seeded ratings | See section 4.5 |
| **Threads and messages** | `threads` plus `thread_messages` (battle-shaped: two responses per row, model **names**) | A direct (single-model) turn is stored with `model2_*` null. Message count is read from `threads.message_count` (maintained by a trigger, **inferred**) |
| **Users** | `users` mirrors `auth.users`; created lazily by `EnsureUserExistsAsync` (upsert) on chat, dualchat and thread create, and by `POST /api/users/sync` | Placeholder email `user_{id}@placeholder.com` when the claim is missing |
| **Models** | `ai_models`, cached for 5 minutes in a singleton `IMemoryCache`; `GetModelInfo` returns null if the cache is cold or the model is unknown | Models can be auto-created as `active` by logging a comparison |
| **Providers and API keys** | `providers` (enabled, priority) and `provider_api_keys` (rotation, cooldown). Keys can also come from environment variables | `EncryptionService` exists and falls back to a **hard-coded default secret** when none is set (`EncryptionService.cs:25`); the audit (SEC-07) says provider keys are stored in plaintext. List endpoints return a mask, not the key |
| **Energy / credits** | **Nothing in the API.** No controller, service or table access mentions energy, credits or balance. The UI reads `users.energy_balance` directly from Supabase REST with the user's token (UI `endpoints.md` 3.12), so the column exists in the database but no backend code spends, grants or validates it | Any "energy" feature needs a server-side ledger first (section 5) |
| **Feature flags** | `system_settings`, public read at `GET /api/settings/feature-flag/{key}` | No cache, one query per request |

### 2.4 Index and constraint review

The repo has no DDL, so indexes cannot be reviewed. From the access patterns, the following **must exist** and should be verified (read-only) in the Supabase dashboard before any change:

| Query (file) | Index it needs |
| --- | --- |
| `thread_messages` by `thread_id` order by `position` (`ThreadMessagesService.cs:96-101`) | `(thread_id, position)`, ideally unique |
| `model_votes` by `(comparison_id, user_id)` (`:131`, `ModelStatsService.cs:119,142`) | `UNIQUE (comparison_id, user_id)` |
| `ai_models` by `model_name` (`ComparisonLogger.cs:47`) | `UNIQUE (model_name)` |
| `comparisons` by `user_id`, by `created_at` (admin lists) | `(user_id, created_at desc)` |
| `threads` by `user_id` order by `created_at` (`ThreadsService.cs:23-31`) | `(user_id, created_at desc)` |
| `users` by `user_id` on every request (`RoleClaimsTransformation.cs:38`) | PK |

