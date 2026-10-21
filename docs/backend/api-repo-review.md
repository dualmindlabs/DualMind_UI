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

---

## 3. Endpoints

Source: every `[Route]`/`[Http*]` attribute under `src/DualMind.API/Controllers/` (MVC controllers; there are no minimal-API routes). "Auth" is the effective policy: `[Authorize]` on the class unless an action says `[AllowAnonymous]`. There is **no fallback policy**, so a controller without an attribute is public (the audit's SEC-04).

### 3.1 Public and user routes

| Method | Path | Auth | Request | Response | File |
| --- | --- | --- | --- | --- | --- |
| GET | `/health`, `/api/health` | anonymous | none | health object | `HealthController.cs:11-32` |
| GET | `/api/ping`, `/api/ping/health` | **none (no attribute)** | none | `{ ... }` | `PingController.cs:10-32` |
| GET | `/api/arena/ping` | anonymous | none | `{ success, message, timestamp, version }` | `ArenaController.cs:70` |
| GET | `/api/arena/test` | Bearer | none | `{ success, status, timestamp, endpoints }` (the CI auth probe) | `ArenaController.cs:53` |
| POST | `/api/arena/chat` | **anonymous** | `ChatRequest` | `ChatResponse` (200), `ai.error` (400/500) | `ArenaController.cs:84-190` |
| POST | `/api/arena/dualchat` | Bearer | `ChatRequest` | `{ success, agent1, agent2, comparisonId, arena{...}, timestamp, totalResponseTimeMs }` | `ArenaController.cs:193-448` |
| POST | `/api/arena/chat/stream` | Bearer | `ChatRequest` | `text/event-stream`, `ai.stream.delta` / `ai.stream.done` / `ai.error` | `ArenaController.cs:450-530` |
| POST | `/api/arena/model-vote` | Bearer | `VoteRequest { comparisonId, voteChoice, voteDurationMs?, winnerModelName? }` | `{ success, message }` | `VotesController.cs:21-82` |
| GET | `/api/arena/model-stats` | anonymous | none | `{ success, items: ModelStatsDto[] }` (every field repeated, see 3.3) | `VotesController.cs:84-103` |
| POST | `/api/arena/blind-battle` | **none (`[ApiController]`, no `[Authorize]`)** | `{ prompt, model1?, model2? }` | `{ battleId, response1{message, modelName, provider, error}, response2 }` | `BlindBattleController.cs:26-90` |
| GET | `/api/models` | Bearer | none | `{ items: [{ modelId, modelName, displayName, providerName, isFree, status }] }` | `ModelsController.cs:23` |
| POST | `/api/speech/generate` | **none (no attribute)** | `{ text, voice? }` | `audio/wav` file | `SpeechController.cs:18-47` |
| POST | `/api/users/sync` | **none (`[ApiController]`, no `[Authorize]`)** | `{ id, email, phone?, name?, avatarUrl?, provider? }` | `{ id, email, synced }` | `UsersController.cs:20-44` |
| GET | `/api/threads?limit=` | Bearer | query `limit` (default 20) | `ThreadDto[]` as `{ items }` | `ThreadsController.cs:32` |
| POST | `/api/threads` | Bearer | `{ title?, mode? }` (a `userId` in the body is ignored) | `ThreadDto` | `ThreadsController.cs:65` |
| GET | `/api/threads/{id}` | anonymous, then checked in code (`public_sharing` flag and visibility, else owner) | none | `ThreadDto` | `ThreadsController.cs:114` |
| GET | `/api/threads/{id}/messages` | same | none | `{ items: ThreadMessageDto[] }` | `ThreadsController.cs:196` |
| PATCH | `/api/threads/{id}` | Bearer, owner | `{ title }` | `{ success, message }` | `ThreadsController.cs:269` |
| PATCH | `/api/threads/{id}/visibility` | Bearer, owner | `{ visibility }` | `{ success, message, visibility }` | `ThreadsController.cs:338` |
| DELETE | `/api/threads/{id}` | Bearer, owner | none | `{ success, message }` | `ThreadsController.cs:422` |
| GET | `/api/settings/feature-flag/{key}` | anonymous | none | `{ key, enabled }` | `SettingsController.cs:29` |
| POST | `/api/telegram/webhook` | secret header (own check) | Telegram update | 200/401/404 | `TelegramWebhookController.cs:37` |

### 3.2 Admin routes (all `[Authorize(Policy = "AdminOnly")]`, role read from `users.role`)

| Group | Routes | File |
| --- | --- | --- |
| Models | `GET/POST /api/admin/models`, `GET/PUT/DELETE /api/admin/models/{id}`, `PATCH .../{id}/status`, `GET .../active` | `Admin/AdminAIModelsController.cs` |
| Comparisons | `GET /api/admin/comparisons`, `GET/DELETE .../{id}` | `Admin/AdminComparisonsController.cs` |
| Votes | `GET/POST /api/admin/votes`, `GET/DELETE .../{id}`, `GET .../stats` | `Admin/AdminModelVotesController.cs` |
| Threads | `GET/POST /api/admin/threads`, `GET/PUT/DELETE .../{id}`, `PATCH .../{id}/visibility` | `Admin/AdminThreadsController.cs` |
| Messages | `GET/POST /api/admin/messages`, `GET/DELETE .../{id}` | `Admin/AdminThreadMessagesController.cs` |
| Users | `GET/POST /api/admin/users`, `GET/PUT/DELETE .../{id}`, `PATCH .../{id}/role` | `Admin/AdminUsersController.cs` |
| Providers | `GET/POST /api/admin/providers`, `GET/PUT/DELETE .../{name}` | `Admin/ProvidersController.cs` |
| Keys | `GET/POST /api/admin/keys`, `GET/PUT/DELETE .../{keyId}`, `PATCH .../{keyId}/toggle`, `POST .../{keyId}/reset-cooldown` | `Admin/AdminKeysController.cs` |
| Dashboard | `GET /api/admin/dashboard`, `/stats`, `/health` | `Admin/AdminDashboardController.cs` |

Admin votes `POST` lets an admin create a vote for any user and comparison, bypassing the vote path.

### 3.3 Diff against `docs/api/endpoints.md` (UI) and the API's own `docs/openapi.yaml`

| Route | UI doc says | Code says | Verdict |
| --- | --- | --- | --- |
| `GET /api/models/{id}` | unused, 404 live | **No such action.** `ModelsController` has only `GET ""` | Confirmed missing. Delete the UI client method or add the route |
| `GET /api/users/me` | unused, 404 live (empty body) | **No such action.** `UsersController` has only `POST sync` | Confirmed missing (the 404 is the framework's empty one) |
| `GET /api/version` | unused, 404 | No such action | Confirmed missing |
| `POST /api/users/sync` | token, request mixes `avatar_url` with camelCase | **No `[Authorize]`**; `SyncUserRequest` has `AvatarUrl`/`Provider`/`Phone` that `UserSyncService` **ignores** (it only stores id, email, name, role). Response is `{ id, email, synced }`: **no `role` and no `energy_balance`**, which is why `feature-flags.js` falls back to a Supabase REST read | **Mismatch**: the doc says "token", the code is public. Response shape is now known (document it) |
| `POST /api/speech/generate` | "token" | **No `[Authorize]`**; no `[ApiController]`; error body has no `code` on 500 | **Mismatch** on auth. Works unauthenticated (KNOWN_ISSUES N6) |
| `POST /api/audio/tts` | 404 on the API; Worker alias (BE-2) | No such route in this repo, no history of one in `master` (the string appears only in docs added later) | Confirmed. The Worker alias is the only place it exists |
| `POST /api/arena/chat` | token | `[AllowAnonymous]` (`ArenaController.cs:86`) | **Mismatch**: public, calls a paid provider |
| `POST /api/arena/blind-battle` | not listed | exists, unauthenticated, not logged to `comparisons`, returns model names immediately | **Missing from the UI doc and from OpenAPI** |
| `GET /api/ping`, `/api/ping/health`, `GET /api/arena/ping`, `GET /api/arena/test`, `GET /api/health` | only `/health` and `/api/health` listed | five health-like routes | Extra routes; `arena/test` is used by the deploy probe, keep it |
| `POST /api/telegram/webhook` | not listed (not a UI route) | exists | Fine, document under "not for the UI" |
| `GET /api/settings/feature-flag/{key}` | listed | matches | OK |
| Threads (7 routes) | listed | match, including owner checks | OK. Note `POST /api/threads` ignores a body `userId` |
| `POST /api/arena/model-vote` | `{ success, message }` | matches. Rejects an empty `comparisonId` and empty `voteChoice` with 400; **accepts any other `voteChoice` string** | Shape OK, validation weaker than the doc implies |
| `GET /api/arena/model-stats` | camelCase plus snake_case plus aliases | `ModelStatsDto` emits `elo`, `elo_rating`, `eloScore`, `matches`, `total_matches`, `wins`, `totalWins`, `win_rate`, `winRate`, `model_id`, ... (`Core/Models/VoteModels.cs:19-60`) | Confirmed, it is intentional code, not an accident |
| `/api/admin/*` | not in the UI doc (admin only) | 9 controllers | Out of scope for the Arena UI |

`docs/openapi.yaml` in `DualMind_Back` disagrees with the code in at least four places, so it should not be treated as the contract:

| OpenAPI path | Real route |
| --- | --- |
| `/api/votes/model-vote`, `/api/votes/model-stats` | `/api/arena/model-vote`, `/api/arena/model-stats` |
| `/api/speech/synthesize` | `/api/speech/generate` |
| `/api/admin/providers/{name}/keys`, `/api/admin/keys/{id}/status` | `/api/admin/keys` (with `?provider=`), `/api/admin/keys/{keyId}/toggle` |
| `/api/admin/dashboard/recent-activity`, `/model-performance`, `/user-stats`, `/provider-stats`, `/api/admin/users/search` | not found in the controllers (only `/`, `/stats`, `/health`) |
| (absent) | `/api/users/sync`, `/api/arena/blind-battle`, `/api/settings/feature-flag/{key}`, `/api/threads/{id}/messages`, `/api/threads/{id}/visibility`, `/api/models` filter params |

The fix is to generate the document from the code (Swashbuckle is already referenced, `Program.cs:25`) and diff it in CI, instead of hand-writing it.

---

## 4. Contract problems

### 4.1 Duplicate battles on retry

| Question | Answer (with evidence) |
| --- | --- |
| Is there idempotency? | **No.** No `Idempotency-Key` handling, no request id column, no unique constraint on anything the client controls. Search the repo for `Idempotency`: only the UI docs |
| How is `comparisonId` created? | `var comparisonId = Guid.NewGuid();` at the top of the action (`ArenaController.cs:202`), generated per HTTP request, never derived from the request |
| What happens on retry? | The UI client retries POSTs on 408/429/5xx/timeouts (UI `endpoints.md`, "Timeouts and retries"). Each retry re-runs the whole action: new `comparisonId`, two new provider calls, a new `comparisons` row (`ComparisonLogger.cs:34`) and a new `thread_messages` row (`ThreadMessagesService.LogDualAsync`), so the thread shows the same prompt twice and provider quota is spent twice |
| Why does a timeout cause it? | The action holds the HTTP request open until both providers answered (up to 60 s each, `ArenaController.cs:544`) and only then writes `comparisons`. Cloudflare/Worker timeouts (30 s before the UI fix, 65 s now) end the client call while the container keeps working and still writes the row |
| Side effect | `ComparisonLogger` swallows all exceptions (`ComparisonLogger.cs:43-46`) and the action still returns `comparisonId`, so a vote can later fail with "Comparison not found" (HTTP 500) |
| Same issue elsewhere | `POST /api/threads` (new thread per retry), `POST /api/arena/model-vote` (second insert fails only if the unique constraint exists, and then as a 500) |

**Root cause:** the server mints the identity of the battle after the work is done. **Fix direction:** accept a client-generated `Idempotency-Key` (or the client creates the `comparisonId`), insert a `pending` comparison row first with a unique index on `(user_id, idempotency_key)`, then fill it; a replay returns the stored result. See section 5.

### 4.2 Three or more error body shapes

| # | Shape | Produced by | Evidence |
| --- | --- | --- | --- |
| 1 | `{ object: "ai.error", code, message, timestamp }` | the three arena chat actions | `ArenaController.cs` (400 at `:96`, `:211`, 500 at `:179`, `:431`, `:443`) |
| 2 | `{ success: false, error, code }` | votes, models, threads, settings controllers | `VotesController.cs:37-79`, `ModelsController.cs:52`, `ThreadsController.cs`, `SettingsController.cs` |
| 3 | `{ error }` only (no `code`, no `success`) | `UsersController` (400, 500), `BlindBattleController` 500, thread create `Unauthorized(new { error })` | `UsersController.cs:30,41`, `BlindBattleController.cs:84`, `ThreadsController.cs:47,80` |
| 3b | a **bare string** body | `BlindBattleController.cs:50` (`BadRequest("One or more ...")`) | same |
| 3c | `{ success: false, error }` with no `code` | `SpeechController.cs:44` | |
| 4 | RFC 9457 `ProblemDetails` | the global exception handler (`Program.cs:204-231`, 500 only, but nearly unreachable because every controller catches its own exceptions) and `[ApiController]` automatic 400 model-state errors (Users, BlindBattle, Telegram) | |
| 5 | **empty body** | `[Authorize]` challenge 401 (JwtBearer default), `AdminOnly` 403, unknown route 404, and route-constraint misses | `OnChallenge` only logs (`Program.cs:90-95`) |
| 6 | SSE `data: {object:"ai.error", code, message}` | `chat/stream` | `ArenaController.cs:455-520` |

Two further problems: the 500 bodies of shapes 1-2 carry **`ex.Message`** (for example "Supabase error: <PostgREST body>"), leaking internals (`VotesController.cs:77`, `ModelsController.cs:54`, `ArenaController.cs:179`). Status codes are also used loosely: a failed vote insert, a duplicate vote and a missing comparison are all 500.

**Root cause:** no shared error type, filter or middleware; each controller hand-writes an anonymous object; the one global handler is bypassed by the `try/catch` in every action. **Fix direction:** one `ProblemDetails`-based error factory, `AddProblemDetails()` plus an `IExceptionHandler`, `JwtBearerEvents.OnChallenge`/`OnForbidden` writing problem+json, typed exceptions (`NotFound`, `Conflict`, `Validation`) mapped centrally, and remove the `try/catch` blocks.

### 4.3 TTS route

| Item | Finding |
| --- | --- |
| Route in this repo | `POST /api/speech/generate` (`SpeechController.cs:8,19`), returns `audio/wav` through Groq `playai-tts` (`GroqService.GenerateSpeechAsync`, `GroqService.cs:207`). Also `api/speech` in the 4.8 `Backup/` code |
| `/api/audio/tts` | Never existed in `master` of this repo. `git log -S'api/audio/tts'` finds only the commit that added `KNOWN_ISSUES.md` |
| API's own OpenAPI | says `/api/speech/synthesize`, a third name that exists nowhere in code |
| Auth | none (no `[Authorize]` and no `[ApiController]`) |
| Other defects | no length limit on `text` (cost), `voice` is passed through to Groq with a default of `Celeste-PlayAI`, errors return `ex.Message` |

**Root cause:** the UI was written against an imagined route name and the API docs were never generated from code. **Fix direction:** keep `/api/speech/generate` as the single route, add `[Authorize]`, a 5,000-character limit and a voice allow-list (the Worker alias already enforces these at the edge, so the API change is defence in depth), and publish the route in generated OpenAPI.

### 4.4 Non-streamed battles

| Question | Answer |
| --- | --- |
| How does `dualchat` call providers? | `ExecuteWithFallbackAsync` twice (`ArenaController.cs:258-259`), `Task.WhenAll` (`:261`), each calls `provider.ChatAsync(...)` which returns the **whole completion** (`IChatProvider.ChatAsync`, `IChatProvider.cs:9`), raced against `Task.Delay(60000)` (`:544`). The HTTP response is one JSON body written after both finished. The "streaming" in the UI is cosmetic |
| Does streaming exist at all? | Yes, for a single model. `IChatProvider` already has `SupportsStreaming` and `StreamAsync(request, onEvent, ct)`, implemented in `GroqService.cs:240`, `GoogleService.cs:204`, `CloudflareWorkersAiService.cs:65`, emitting `ai.stream.delta` and `ai.stream.done` events. `POST /api/arena/chat/stream` uses it |
| Bugs in the existing stream route | It passes the original `request` (so `request.Model` may be `auto` or a UUID) instead of the selected model: `StreamAsync(request, ...)` (`:509`) while the provider was chosen from `selectedModel` (`:471-483`). With `model: auto`, Groq gets its default model even if a Google model was selected. The route has **no fallback and no timeout**, and writes errors only with `Debug.WriteLine` |
| Could two providers stream concurrently over one SSE response? | **Yes, with modest work.** Start both `StreamAsync` calls with `Task.WhenAll`, tag each event with `side: "a" or "b"`, and serialise writes to `Response` with a `SemaphoreSlim` (`HttpResponse` is not thread-safe). Send an initial `meta` event with `comparisonId`, then `delta` per side, then `done` per side with latency and usage, then one final `complete`. Insert the pending `comparisons` row **before** streaming and finalise it on completion. Constraints: (1) the fallback logic lives in the controller and works on whole responses, so mid-stream failure needs a rule (emit `error` for that side, keep the other going, mark the comparison `failed` and exclude it from ratings); (2) set `Cache-Control: no-cache`, `X-Accel-Buffering: no`, and flush after each event; (3) Cloudflare Container and Worker proxy must not buffer (the UI Worker already never cuts event streams); (4) `HttpContext.RequestAborted` must cancel both providers; (5) the 45 s `HttpClient` timeout in `Program.cs:131-142` applies to the whole response, not time-to-first-byte, and must be raised or replaced with an idle timeout for streams |

### 4.5 Counting, Elo and votes

**Why wins + losses + ties does not equal battles (`totalResponses`).** The counts come from the `v_leaderboard` view (`ModelStatsService.cs:22-49`), whose SQL is not in the repo. The API does no counting of its own. What the code does show:

| Fact | Consequence |
| --- | --- |
| `total_comparisons` is mapped to `TotalResponses` (`:41-42`) and is the denominator of the UI's "matches" | The view counts comparisons the model **appeared in**, whether or not anyone voted |
| Wins, losses, ties come from votes; a `both-bad` vote stores `winner_model_id = null` and `vote_choice = both-bad` (`ModelStatsService.cs:122-124`) | If the view counts a tie only as `vote_choice = tie`, a both-bad vote adds to neither wins, losses nor ties, and unvoted comparisons add to none |
| `dualchat` writes a comparison even when both answers are fallback text (4.6 below) | `total_comparisons` rises with no genuine vote |
| Duplicate battles on retry (4.1) | each duplicate is a comparison with no vote |
| KNOWN_ISSUES #1 | for 34 seeded models "wins + losses + ties does not equal `totalResponses`", Elo is a multiple of 5 and never moves, and some have 0 wins, 7 losses and exactly 1000 Elo, so the Elo update path does not reach them |

That is an **inference**: confirm by reading the view definition in the Supabase dashboard (read-only) or by asking Harsh for `pg_get_viewdef('v_leaderboard')`. Until then, treat all leaderboard numbers as unreliable (the data is test data anyway).

**Elo update logic.** There is none in this repository: no K-factor, no tie handling, no both-bad handling, no rating history. The API inserts a vote row and reveals the comparison; anything that updates `elo_score` is a database trigger, function or the view itself, and is not under version control. What can be said from the code: ties and both-bad votes both produce `winner_model_id = null`, so a rating function that keys on `winner_model_id` alone cannot tell them apart (it must read `vote_choice`). KNOWN_ISSUES #1 suggests the update only reaches older rows.

**Vote validation.**

| Check | Present? | Where |
| --- | --- | --- |
| Authenticated, voter = token `sub` | Yes (body user id ignored) | `VotesController.cs:44-55` |
| `comparisonId` and `voteChoice` non-empty | Yes | `:25-41` |
| `voteChoice` in {left, right, tie, both-bad} | **No.** Any string is lower-cased and stored; an unknown value silently becomes `winner_model_id = null` (looks like a tie) | `:62`, `ModelStatsService.cs:120-124` |
| Comparison exists | Yes, via the masked view, but failure is HTTP 500 with a message, not 404 | `ModelStatsService.cs:99-110` |
| Comparison belongs to the voter | **No.** Any signed-in user can vote on any known `comparisonId` (ids are UUIDs, but they are returned in shared thread messages) | not checked |
| One vote per comparison per user | **Only if the database has the unique constraint**, which is not in the repo. The code never reads before writing. A duplicate surfaces as HTTP 500 with the PostgREST error text | `ModelStatsService.cs:130` |
| Reveal and vote written atomically | No: insert vote, update `comparisons.is_revealed` (global, not per user), update `model_votes.revealed_at` by `user_id` (null `userId` would produce `user_id=eq.` in the filter) | `:130-139` |
| Vote on a comparison made from fallback output | Allowed | 4.6 |
| `winnerModelName` path (`RecordVoteAsync`) | Dead code in the controller but still public on the service; it looks the model up by name and inserts with no `vote_choice` | `ModelStatsService.cs:55-91` |

### 4.6 Additional findings from the code read

These were not on the brief but affect the redesign and are worth fixing first.

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| A | **Fallback output is recorded as the original model's answer.** When a provider fails or times out, `FallbackToBasicModelAsync` calls a basic Groq model, prefixes `[System Note]: ...` to the text, relabels the result with the **original** model name (`:628`), and `dualchat` logs it to `comparisons` as a genuine answer. A user can then vote for or against a model that never answered, and the rating is wrong. If the fallback fails too, a fake "unavailable" message is returned with `success: true` and also logged (`:633-640`) | `ArenaController.cs:616-641`, `:356` | High (data integrity) |
| B | **Anyone can append to any thread.** `dualchat` and `chat` write `thread_messages` for a `threadId` from the body with the service key and no ownership check | `ArenaController.cs:358-363`, `:162-169` | High |
| C | `POST /api/users/sync` is unauthenticated and writes a `users` row for any `id` and `email` (role is preserved, so no direct privilege escalation, but it creates rows and can overwrite `email` and `full_name` of a real user) | `UsersController.cs:20`, `UserSyncService.cs:33-45` | High |
| D | `chat`, `speech` and `blind-battle` can be called without signing in; they cost provider quota | see 3.1 | Medium |
| E | Model names are returned before the vote (KNOWN_ISSUES #2) | `ArenaController.cs:286-291,319-324,413-417`; `BlindBattleController.cs:63-80` | High (blind voting is defeated) |
| F | Manual `dualchat` accepts `model1 == model2` | `ArenaController.cs:231-234` | Low |
| G | `dualchat` returns a "winner by length / tokens" verdict, which looks like a ranking signal but is not; the UI should ignore it | `:373-405` | Low |
| H | A role lookup (PostgREST call) runs on every authenticated request, and a failure silently drops the role | `RoleClaimsTransformation.cs:38-52` | Medium (latency) |
| I | Filter strings are interpolated unencoded | `ComparisonLogger.cs:47`, `ModelStatsService.cs:71`, `SystemSettingsService.cs:23` | Medium |
| J | `StreamChat` ignores the selected model (4.4) | `:509` | Medium |
| K | `GetNextPositionAsync` read-then-insert races; unique `(thread_id, position)` is not guaranteed | `ThreadMessagesService.cs:147-165` | Low |
| L | `CORS` is `AllowAnyOrigin` on every route (`Program.cs:174-184`); fine behind the same-origin proxy, wrong for direct callers | | Low |
| M | `UpgradeLog.htm`, `Backup/`, `Backup/Legacy_v4.8/`, three `.sln` files and scratch scripts are dead weight, and `seed_db.py` carries a credential | 1.1 | Housekeeping |

---

## 5. Proposal

This section is a **proposal only**. Nothing here is approved or applied. **The database holds TEST data (Harsh, 2026-10-21), which makes it the right moment to change schema, but every migration and every deploy still needs Harsh's go**, and the order below keeps each step small and reversible.

### 5.1 Where each piece of state belongs

The backend roadmap (`docs/backend/feature-roadmap.md`) puts the analytics and idempotency features at the Cloudflare edge (D1) in the Worker. The API repo owns the source of truth for battles and votes. A split that avoids two writers:

| Concern | System of record | Why |
| --- | --- | --- |
| Users, models, providers, keys, threads, messages | **Postgres (DualMind_Back)** | existing, relational, joined by admin and the UI |
| Comparisons, votes (the facts) | **Postgres (DualMind_Back)** | a vote must be transactional with the comparison and with uniqueness; the API owns the write |
| Idempotency record for retries | **Both, different jobs.** The Worker's D1 key (BE-6) stops a replay before it reaches the API and saves the provider cost; a **unique column in Postgres** is the last line of defence if the Worker is bypassed (Telegram bot, direct callers) | belt and braces |
| Append-only ledger/events (BE-7) | **Cloudflare D1** (no text, hashed user id, as designed) | analytics scale, edge-local, privacy-minimised |
| Rating runs and snapshots (BE-8, BE-9, BE-14) | **D1**, computed from an export of Postgres votes, plus a `rating_runs` copy in Postgres only if the API must serve ratings itself | the fit is a batch job, not a request path |
| Categories (BE-12), side and position (BE-16) | **Postgres columns on `comparisons`** (the fact is written once, at battle time); D1 holds the aggregates | needed by the vote path and the rating job |
| Energy or credits | **Postgres ledger** (a balance without a ledger is a bug magnet) | needs transactions; the UI currently reads a bare `users.energy_balance` |

### 5.2 Schema changes (additive, with a migration sketch and rollback)

All migrations are numbered SQL files in a new `database/migrations/` folder (remove `*.sql` from `.gitignore`), applied to a **copy or a branch database first**, never to the live project without Harsh's go. Because the data is test data, a `TRUNCATE` of `comparisons`, `model_votes`, `thread_messages` is an option Harsh can approve, which would make the constraints below trivial to add.

| # | Change | Migration sketch | Rollback | Lives in |
| --- | --- | --- | --- | --- |
| M1 | **Put the existing schema under version control** (baseline) | `pg_dump --schema-only` of tables, views, triggers, functions, policies, committed as `0000_baseline.sql`. Capture `v_leaderboard`, `v_comparisons_masked` and every Elo trigger | none needed (documentation) | Postgres |
| M2 | **Vote integrity** | `ALTER TABLE model_votes ADD CONSTRAINT model_votes_one_per_user UNIQUE (comparison_id, user_id); ADD CONSTRAINT model_votes_choice CHECK (vote_choice IN ('left','right','tie','both-bad')); ALTER user_id SET NOT NULL` (first delete or fix offending rows) | `DROP CONSTRAINT` | Postgres |
| M3 | **Idempotency on battles** | `ALTER TABLE comparisons ADD COLUMN idempotency_key text, ADD COLUMN request_hash text, ADD COLUMN status text NOT NULL DEFAULT 'complete' CHECK (status IN ('pending','complete','failed','fallback')); CREATE UNIQUE INDEX comparisons_user_idem ON comparisons (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;` The same two columns on `threads` for `POST /api/threads` | `DROP INDEX`, `DROP COLUMN` | Postgres (plus D1 in the Worker, BE-6) |
| M4 | **Side, position, provenance** | `ALTER TABLE comparisons ADD COLUMN selection_mode text, ADD COLUMN left_is_model1 boolean NOT NULL DEFAULT true, ADD COLUMN model1_served_by text, ADD COLUMN model2_served_by text, ADD COLUMN model1_tokens int, ADD COLUMN model2_tokens int;` `served_by` records which model **really** answered (fixes 4.6 A); `status = 'fallback'` excludes the row from ratings | `DROP COLUMN` | Postgres |
| M5 | **Atomic vote** | A Postgres function `submit_vote(p_comparison uuid, p_user uuid, p_choice text, p_ms int)` that checks ownership and status, inserts the vote, sets the reveal, returns the revealed model ids and ratings before and after, in one transaction, called with `RpcAsync` | `DROP FUNCTION` | Postgres |
| M6 | **Categories** | `ALTER TABLE comparisons ADD COLUMN category text, ADD COLUMN category_confidence real;` set by the Worker's classifier (BE-12) or null | `DROP COLUMN` | Postgres columns, aggregates in D1 |
| M7 | **Model identity in thread messages** | `ALTER TABLE thread_messages ADD COLUMN model1_id uuid REFERENCES ai_models, ADD COLUMN model2_id uuid REFERENCES ai_models;` backfill from names; add `UNIQUE (thread_id, position)` | drop columns and constraint | Postgres |
| M8 | **Ledger / events** | **D1** (not Postgres): `events(id, ts, kind, comparison_id, user_hash, model1, model2, left_is_model1, latency_ms, vote_choice, request_id)` per BE-7. If the API must emit events itself, add a Postgres `outbox(id, kind, payload jsonb, created_at, sent_at)` written in the same transaction as M5 and drained by a Worker cron | drop table | D1 (+ optional Postgres outbox) |
| M9 | **Rating runs** | **D1**: `rating_runs(id, method, version, started_at, finished_at)` and `rating_scores(run_id, model_id, score, ci_low, ci_high, n)`. The API reads the latest run through the Worker (or a materialised view) instead of `elo_score` | drop tables | D1 |
| M10 | **Energy ledger** (only if energy ships) | `energy_ledger(id, user_id, delta, reason, ref_id, created_at)` plus a function that debits inside the battle transaction; `users.energy_balance` becomes a derived value | drop table | Postgres |
| M11 | **Indexes** from 2.4 and a `UNIQUE (model_name)` on `ai_models` | `CREATE INDEX CONCURRENTLY ...` | `DROP INDEX` | Postgres |

### 5.3 API changes

| Change | Detail | Notes |
| --- | --- | --- |
| **problem+json everywhere** | `AddProblemDetails()`, an `IExceptionHandler`, `OnChallenge` and `OnForbidden` writing problem+json, one `ApiProblem` factory with `type`, `title`, `status`, `detail`, `instance`, `requestId`, `code`; remove `ex.Message` from bodies. Keep the old shapes behind `Accept: application/json` only for one release, or let the Worker's BE-1 rewrite keep covering legacy clients | Aligns with `docs/api/problems.md` (`validation_error`, `conflict`, ...). The `type` URLs are the Worker's |
| **Idempotency header** | `Idempotency-Key` (UUID) accepted on `dualchat`, `chat`, `model-vote`, `POST /api/threads`; same key and same body returns the stored response with `Idempotent-Replayed: true`; same key and different body returns 409 `conflict`. Backed by M3 | The Worker (BE-6) does the first check; the API enforces the unique index |
| **Create the battle first** | `POST /api/arena/battles` returns `201 { comparisonId, status: "pending" }` in under 100 ms; `GET /api/arena/battles/{id}` returns the result when ready; `dualchat` stays as a compatibility wrapper | Removes the long-held request that causes duplicates |
| **Streaming dualchat** | `POST /api/arena/dualchat/stream`, SSE, events `meta` (comparisonId), `delta` and `done` per `side` (`a`/`b`), `error` per side, `complete`; two concurrent `StreamAsync` calls, serialised writes; falls back by marking the side `failed`, not by relabelling another model | 4.4. The UI doc already proposes this endpoint (B-1) |
| **Blind by default** | `dualchat` and thread messages return `agentA`/`agentB` handles; model identity only in the `model-vote` response (and in a read after voting) | Fixes KNOWN_ISSUES #2 |
| **Consistent casing and envelopes** | camelCase only (drop the snake_case and alias duplicates in `ModelStatsDto` after the UI moves to the canonical names, with a one-release overlap behind `?legacy=1`); `{ items, nextCursor? }` for every list; `users/sync` accepts both `avatarUrl` and `avatar_url` for one release | UI doc gap 4 and 5 |
| **Auth on every route** | `FallbackPolicy = RequireAuthenticatedUser`, then `[AllowAnonymous]` only on health, ping, model-stats, feature flags, the public thread reads and the Telegram webhook | Closes 4.6 B, C, D |
| **Missing routes** | Either implement `GET /api/models/{id}` and `GET /api/users/me` (returning `{ userId, email, role, energyBalance? }`), or delete the UI callers. `users/sync` should return the role | UI gap 8 |
| **Generated OpenAPI** | Publish `swagger.json` from the code in CI, fail the build if it differs from the committed copy, delete the hand-written `docs/openapi.yaml` | 3.3 |
| **Vote response** | `{ comparisonId, revealed: { model1, model2 }, ratingBefore, ratingAfter }` | UI gap 2, BE-10; needs M5 and M9 |

### 5.4 A small, safe first PR list for DualMind_Back

Each PR is one commit-sized change, branch plus PR, CI-verified, no schema change unless stated. Merging to `master` triggers the Cloudflare deploy, so **every merge needs Harsh's go** and a look at the post-deploy auth probe.

| # | Change | Files | Tests | Risk |
| --- | --- | --- | --- | --- |
| 1 | **Require sign-in on `users/sync`, `speech/generate`, `arena/chat`, `arena/blind-battle`; take identity from the token in `sync`; add a deny-by-default fallback policy** | `Program.cs`, `Controllers/UsersController.cs`, `SpeechController.cs`, `Api/ArenaController.cs`, `Api/BlindBattleController.cs` | endpoint-enumeration test (every endpoint not on an allow-list returns 401 without a token), `users/sync` ignores a body id | Low-medium: the UI must send the token on `sync` (it already does) and on `chat` (it does for `dualchat`). The Telegram bot only calls `dualchat`, `model-vote` and `model-stats` (`Bot/DualMindBotApiClient.cs:30-52`), so it is not affected by closing `chat` |
| 2 | **Vote validation and honest errors**: whitelist `voteChoice`, 400 for unknown, 409 for a duplicate, 404 for an unknown comparison, 403 for another user's comparison; stop returning `ex.Message` | `VotesController.cs`, `ModelStatsService.cs`, `VoteModels.cs`, new `ApiProblem` helper | extend `VotesControllerTests` (6 existing): unknown choice, duplicate, wrong owner, unknown comparison | Low. Behaviour change only for invalid input. Ownership check needs a read of `comparisons.user_id` through the existing service |
| 3 | **Do not record fallback answers as genuine comparisons**: return which model really answered (`servedBy`), skip the `comparisons` insert (or mark it) when a fallback was used, never return `success: true` for the "both unavailable" text, and surface a 503 problem instead | `Api/ArenaController.cs` (`ExecuteWithFallbackAsync`, `FallbackToBasicModelAsync`), `ComparisonLogger.cs` | unit tests with fake providers: timeout, exhausted key, fallback failure | Medium: changes what the UI sees on failure (it must show an error state, not fake text). No schema change. Highest data-quality payoff |
| 4 | **One error body** (`ProblemDetails`): exception handler, `OnChallenge`/`OnForbidden`, remove per-action `try/catch` that only wrap errors | `Program.cs`, controllers | contract test per status class; keep the Worker's BE-1 rewrite working | Medium (touches every controller). Do after 1-3 |
| 5 | **Fix `chat/stream`**: use the selected model, add a timeout and a typed error event | `Api/ArenaController.cs` | stream test with a fake provider | Low |
| 6 | **Ownership check on thread writes from `dualchat`/`chat`**; encode filter values (`Uri.EscapeDataString`) in `ComparisonLogger`, `ModelStatsService`, `SystemSettingsService` | `Api/ArenaController.cs`, three services | thread-ownership test, filter-encoding test | Low |
| 7 | **Baseline schema and migrations folder (M1) plus M2 constraints** | `database/migrations/*.sql`, `.gitignore`, a CI job that applies them to a scratch Postgres | migration applies on an empty database | **Needs Harsh's go before M2 touches Supabase**; M1 is documentation only |
| 8 | **Idempotency and `status` (M3, M4) with `Idempotency-Key` handling** | migrations, `Api/ArenaController.cs`, `ComparisonLogger.cs` | replay returns the same `comparisonId`, concurrent replays create one row | Medium: schema change, **needs Harsh's go** |
| 9 | **Repo hygiene**: delete `Backup/`, extra `.sln` files, `UpgradeLog.htm`, `WeatherForecast.cs`, `warnings_full.txt`, `stats.json`, `seed_db.py` (after the credential is rotated), remove the duplicate CI job, generate OpenAPI in CI | many deletions, `.github/workflows/*` | CI green | Low. Rotate the committed credential **first** (audit runbook `02`); history still contains it |
| 10 | **Streaming dualchat (4.4)** | `Api/ArenaController.cs` (or a new `ArenaStreamController`), `ComparisonLogger.cs` | two fake streaming providers, ordering, cancellation, one failing side | Medium-high: new endpoint, additive, behind a feature flag |

**Recommended order:** 1, 2, 3 first (each independent, no schema, closes the worst integrity and cost problems), then 6, 5, 9, then 4, then the schema PRs 7 and 8 once Harsh approves a migration window, then 10.

### 5.5 What this review could not check

- The live schema, views, triggers and Elo function (not in the repo); section 2 is reconstructed from code.
- Whether the unique constraint on `model_votes` exists.
- Whether the live host runs `e23c37f` (KNOWN_ISSUES #9 says an earlier deploy failed; I did not call the live API).
- The values in `appsettings*.json`, `.env*` and any user secrets (deliberately not opened).

