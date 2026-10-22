# Backend design documents

One design per feature, written before its build PR (rules: [feature-roadmap.md, section 4](../feature-roadmap.md#4-rules-for-every-backend-pr)). Each follows the same template: summary, goals and non-goals, user-visible behaviour, API (requests, responses, problem+json errors), data model, auth, limits and abuse, privacy, failure modes, observability, implementation plan, test plan, rollout, open questions. The .NET designs (BE-8 to BE-11, BE-14, BE-16, BE-25 to BE-34) also use the [conventions for .NET features](#conventions-for-net-features-be-25-to-be-34) below.

## Wave W1: platform and quick wins

| Design | Feature | Needs from Harsh |
| --- | --- | --- |
| [BE-0-platform.md](./BE-0-platform.md) | `/api/v2` Hono router, request context, Supabase JWT verification, problem+json, zod to OpenAPI 3.1, `not_enabled` guard, Miniflare test harness | `SUPABASE_URL` (var), `SUPABASE_JWT_SECRET` only if the project still uses the legacy secret, `PRIVACY_SALT` (secret) |
| [BE-1-error-shape.md](./BE-1-error-shape.md) | Opt-in normalisation of v1 errors to problem+json at the proxy | nothing |
| [BE-2-tts-route.md](./BE-2-tts-route.md) | `/api/audio/tts` alias for `/api/speech/generate`, with a removal plan | nothing |
| [BE-3-rate-limits.md](./BE-3-rate-limits.md) | Rate Limiting binding per route group, `RateLimit-Policy` and 429 with `Retry-After` | `PRIVACY_SALT` (shared with BE-0) |
| [BE-4-leaderboard-cache.md](./BE-4-leaderboard-cache.md) | `GET /api/v2/leaderboard` from the Cache API with stale-while-revalidate and ETag | nothing |
| [BE-5-api-docs.md](./BE-5-api-docs.md) | `/api/v2/openapi.json`, `/developers/`, `/leaderboard.md`, `/llms.txt`, problem pages | nothing |

Suggested build order: BE-0, then BE-1, BE-2, BE-3 (all touch the proxy; one PR each), then BE-4, then BE-5.

## Decisions made in W1 (details in the designs)

- Hono with `@hono/zod-openapi` (zod 4), `jose` for JWTs, `@cloudflare/vitest-plugin` plus `@msw/cloudflare` for Workers tests (BE-0).
- Shared zod schemas in a top-level `contract/` folder, used by the Worker and the web client (BE-0).
- Rate limit headers use the current IETF draft names (`RateLimit-Policy`, `RateLimit`) because the binding cannot report a remaining count (BE-3).
- The human API reference is a prerendered page built from the OpenAPI file, not a third-party renderer (BE-5).

## Wave W2: rankings (BE-14, BE-9, BE-10, BE-8, BE-11, BE-16)

The rankings wave of the [new wave order](../feature-roadmap.md#0-where-each-feature-lives-adr-0008-2026-10-21) (item 3). All six live mainly in the .NET API ([ADR 0008](../../adr/0008-features-in-the-dotnet-api.md)); the Worker adds caches. They build on the .NET safety PRs in [DualMind_Back](https://github.com/dualmindlabs/DualMind_Back), all open and unmerged on 2026-10-22: [#27](https://github.com/dualmindlabs/DualMind_Back/pull/27) (sign-in on write routes), [#28](https://github.com/dualmindlabs/DualMind_Back/pull/28) (vote validation, 409 on duplicates), [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29) (fallback answers not rated, `servedBy`), [#30](https://github.com/dualmindlabs/DualMind_Back/pull/30) (thread ownership), [#31](https://github.com/dualmindlabs/DualMind_Back/pull/31) (baseline schema, migrations folder, CI Postgres job: `0001`, `0002`), [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33) (BE-6 Idempotency-Key and `comparisons.status`, behind a flag: `0003`), [#34](https://github.com/dualmindlabs/DualMind_Back/pull/34) (chat/stream errors) and [#35](https://github.com/dualmindlabs/DualMind_Back/pull/35) (hygiene). Designs only: nothing here is built, and every migration needs Harsh's go (preview first).

| Design | Feature | Lives in | Migration (up and down) | Flag | Effort (backend + web) | Impact |
| --- | --- | --- | --- | --- | --- | --- |
| [BE-14-vote-integrity.md](./BE-14-vote-integrity.md) | Flags, per-user signals, position-skew check, admin review queue, public filter log, one `v_countable_votes` definition, atomic `record_vote` | .NET + `cf-worker` cron + Worker cache + web (admin) | `0004_vote_integrity` | `be14_integrity` | M (3 + 1.5 days) | H |
| [BE-16-position-and-style-control.md](./BE-16-position-and-style-control.md) | Record selection mode and side randomisation, randomise `topper`, style features; position and style terms in the fit | .NET (slice A), fit in GitHub Actions (slice B) + web | `0005_position_style` | `be16_position_style` | M (4 + 1 days, in two slices) | M |
| [BE-9-honest-ratings.md](./BE-9-honest-ratings.md) | Bradley-Terry fit with bootstrap intervals and rank ranges, `rating_runs`, `provisional` rule, methodology page | .NET (tables, endpoints) + GitHub Actions (the fit) + Worker + web | `0006_rating_runs` | `be9_ratings`, `be9_provisional_ci` | H (5 + 2 days) | H |
| [BE-10-rating-change-on-reveal.md](./BE-10-rating-change-on-reveal.md) | Vote response carries each model's rating before and an estimated after | .NET + web | `0007_vote_rating_effects` | `be10_rating_change` | M (2 + 1.5 days) | H |
| [BE-8-leaderboard-history.md](./BE-8-leaderboard-history.md) | Snapshot table and job, movement and history endpoints, chart on the model details sheet | .NET + `cf-worker` cron + Worker cache + web | `0008_leaderboard_snapshots` | `be8_history` | M (1.5 + 2 days) | H |
| [BE-11-head-to-head-matrix.md](./BE-11-head-to-head-matrix.md) | Pairwise aggregate with intervals, heatmap, best and toughest matchups | .NET + `cf-worker` cron + Worker cache + web | `0009_head_to_head` | `be11_head_to_head` | L (1.5 + 2 days) | M |

Total about 17 backend days and 10 web days (estimates, not commitments).

Recommended build order: **BE-14, BE-16 slice A, BE-9, BE-10, BE-8, BE-11, BE-16 slice B.**

1. **BE-14 first.** Every later ratings feature reads `v_countable_votes`, and it creates `job_runs` and the job plumbing.
2. **BE-16 slice A next (small).** It only records facts (selection mode, side randomisation, style features) and fixes the `topper` mode that always puts the strongest model on the left. Its value grows with time, so it should start collecting data before the fit exists.
3. **BE-9.** The core. BE-10, BE-8, BE-11 and the fit half of BE-16 all read its runs.
4. **BE-10, BE-8, BE-11** in any order; BE-10 is the most visible to a voter. BE-8's `v1_view` stage does not need BE-9 and can move up if history should start accumulating early (its build PR then splits `0008`, see its dependencies).
5. **BE-16 slice B** last: it needs about 500 randomised votes before the style variant can be published.

Migration numbers `0004` to `0009` are reserved in that order after #31 (`0001`, `0002`) and #33 (`0003`). The Migrations workflow applies files in name order, so if the build order changes, renumber at merge and keep each file's dependencies in mind (`0006` needs `0004`; `0007` and `0008` need `0006`; `0009` needs `0004`). Each file has a `.down.sql`, and none of the SQL in these designs has been executed: the build PR's CI Postgres job (up, smoke, down, up, up on `postgres:16`) is the proof.

### Shared decisions in W2

- **One definition of a countable vote** (BE-14): `v_countable_votes`. Ratings, head-to-head and history read it; BE-26 and BE-27 add their conditions to it, so the private-arena exclusion of convention 7 lives in one place.
- **The fit runs in GitHub Actions, light jobs on the `cf-worker` cron** (convention 6). The fit (`.github/workflows/rating-fit.yml`, every 3 hours) talks to the API only through guarded internal routes, so the workflow never holds the database key. The hourly SQL jobs (BE-14 scan, BE-8 snapshot, BE-11 refresh) run from one `cf-worker` cron `0 * * * *` that calls `POST /api/internal/jobs/hourly`; a daily cron `30 3 * * *` calls `.../daily` (thinning, retention). Each job records itself in `job_runs` so a repeat is a no-op.
- **Internal routes are guarded twice:** the `X-Job-Secret` header (`JOB_SHARED_SECRET`, compared in constant time) and a Worker rule that refuses `/api/internal/` from outside (the Worker's `fetch` handler forwards every path today; its `scheduled` handler reaches the container directly).
- **Flags, not branches.** Every feature has a `system_settings` flag, default off, so code merges before migrations are applied and before anything is visible.
- **Public payloads stay additive.** `/api/v2/leaderboard` gains optional fields; `eloScore` and `eloRank` keep their v1 meaning until Harsh decides otherwise (BE-9 open question 2).
- **Estimates are labelled.** BE-10's "after" is an estimate from a Newton step on the current run, never presented as the next published number.

### Needs from Harsh for W2 (names only, nothing created yet)

`JOB_SHARED_SECRET` (a GitHub Actions secret and an API setting); a deploy of `cf-worker` for the new cron expressions and the `/api/internal/` rule; approval to apply `0004` to `0009` in order, each on a Supabase branch first; a check that GitHub Actions minutes for about 500 minutes a month of fitting are acceptable on his plan (**not verified**).

### Open questions (W2)

Each design ends with its own list; these block a decision or change what users see, in the order they will matter.

1. **BE-9: what the board's number becomes.** After a week of side-by-side display, does `eloScore` switch to the Bradley-Terry rating, or do both stay? And does `provisional` stay a count of 5 votes, or ever use the interval width?
2. **BE-9: method choices.** Ties as half a win each; both-bad left out of the fit; a weak prior of about 650 Elo points (so undefeated models stay finite).
3. **BE-16: randomise the `topper` mode.** The only visible effect is that the top model is no longer always on the left. Manual battles: keep counting them (proposed) or drop them?
4. **BE-14: shadow week, thresholds and the admin screen.** Shadow mode first (proposed); starting thresholds with only test data to tune on; API only or a web page for the queue; whether the filter log publishes thresholds.
5. **BE-10: estimate or wait.** Show a labelled estimate at reveal (proposed), or wait for the next fit and show the real change.
6. **BE-8: history of test data.** Start hourly snapshots of the legacy board now (it may chart a meaningless number), and clear the history when real traffic begins?
7. **Actions minutes and the secret** (see above).

## Wave W6: product features chosen in the 21 Oct poll (BE-25 to BE-34)

All ten live mainly in the .NET API ([ADR 0008](../../adr/0008-features-in-the-dotnet-api.md)); the Worker adds caching, headers, limiter groups and a few edge pages. Designs only: nothing here is built, and backend implementation is paused until Harsh says so.

| Design | Feature | Lives in | Effort (backend + web) | Impact |
| --- | --- | --- | --- | --- |
| [BE-25-developer-api-keys.md](./BE-25-developer-api-keys.md) | Developer API keys and a usage dashboard | .NET (keys, usage) + Worker (verify, limit, count) + web | H (4 + 2 days) | M |
| [BE-26-private-arenas.md](./BE-26-private-arenas.md) | Private arenas: your own prompt sets and private boards | .NET + web | H (5 + 4) | M |
| [BE-27-multi-turn-battles.md](./BE-27-multi-turn-battles.md) | Multi-turn battles rated as conversations | .NET + web (SSE pass-through in the Worker) | H (5 + 3) | H |
| [BE-28-model-cards.md](./BE-28-model-cards.md) | Per-model pages | .NET (profile, aggregate) + Worker (cache, preview tags) + web | M (2 + 3) | H |
| [BE-29-battle-of-the-day-embed-replays.md](./BE-29-battle-of-the-day-embed-replays.md) | Battle of the day, embed widget, replays | .NET (featuring, consent) + Worker (embed, oEmbed, CSP) + web | M (3 + 3) | M |
| [BE-30-seasons-and-leagues.md](./BE-30-seasons-and-leagues.md) | Monthly seasons, leagues, hall of fame | .NET + Worker cache + web | M (3 + 2) | M |
| [BE-31-cost-quality-view.md](./BE-31-cost-quality-view.md) | Rating against price and latency | .NET (prices, rollup) + Worker cache + web | M (2 + 2) | H |
| [BE-32-profiles-badges-reputation.md](./BE-32-profiles-badges-reputation.md) | Profiles, badges and reputation | .NET + Worker (preview tags) + web | M (3 + 2) | L |
| [BE-33-prompt-gallery.md](./BE-33-prompt-gallery.md) | Curated and community prompts | .NET + Worker cache + web | M (2 + 2) | M |
| [BE-34-collections-exports-dataset.md](./BE-34-collections-exports-dataset.md) | Collections, exports and a Hugging Face dataset | .NET (collections) + GitHub Actions (dataset) + web | H (2.5 + 2, then 1.5 for the dataset) | M |

Total about 33 backend days and 25 web days (estimates, not commitments).

Recommended build order (reasons: dependencies first, cheap and visible early, the two battle-core changes last): **BE-28, BE-31, BE-33, BE-30, BE-25, BE-29, BE-32, BE-34 (collections, then the dataset after BE-21), BE-26, BE-27.** BE-28 and BE-33 can start as soon as the first .NET safety PRs and baseline schema are in; BE-30 and BE-31 need BE-9 (and M4 for honest latency); BE-26 and BE-27 need BE-6 (battle created up front) and the streaming `dualchat`.

### Conventions for .NET features (BE-25 to BE-34)

These apply to every .NET design in this folder (the W2 designs above and BE-25 to BE-34), so they are stated once. Everything here is a proposal until Harsh approves the first migration.

1. **Paths.** New .NET routes are additive, camelCase, in the existing `/api/...` namespace behind the Worker's proxy (BE-0 note: the Worker answers every `/api/v2/...` path itself and never forwards it). Public cacheable reads additionally get a Worker copy at `/api/v2/...` with the [BE-4](./BE-4-leaderboard-cache.md) pattern (Cache API, ETag, stale-while-revalidate, zod schema in `contract/`).
2. **Auth.** Supabase JWT as today ([api-repo-review.md](../api-repo-review.md) section 3). Anonymous routes are marked `[AllowAnonymous]` explicitly, which presumes the deny-by-default fallback policy of the first .NET PRs (api-repo-review 5.4 #1). Admin routes use the existing `AdminOnly` policy. `Idempotency-Key` (BE-6) is required on every endpoint that creates a record, with `unique (owner, idempotency_key)` as the last line of defence.
3. **Errors.** problem+json with the slugs in [problems.md](../../api/problems.md). New slugs proposed by these designs, to be added to `server/problem-types.js` when built: `gone` (410), `unprocessable_content` (422), `quota_exceeded` (429).
4. **Pagination.** Lists return `{ items, nextCursor }`; the cursor is opaque base64url of the sort key and id; `limit` defaults to 20, maximum 100; ordering is stable under inserts.
5. **Database.** The data lives in Supabase Postgres, accessed through PostgREST with the service-role key (api-repo-review 2.1). Migrations are numbered SQL files in `database/migrations/` (the folder proposed as M1 in api-repo-review 5.2; it does not exist yet), each with a rollback script, applied to a scratch or branch database first, never to the live project without Harsh's go. Every new table enables row-level security with no policies, because the API uses the service role and the UI reads some tables directly from Supabase. Multi-step writes are SQL functions called through `Rpc` (PostgREST has no transactions, api-repo-review 2.1).
6. **Jobs.** The .NET API has no scheduler (the only hosted service is the Telegram bot, `Bot/TelegramBotService.cs`) and the container can sleep. The `cf-worker` in the API repository already runs a Cron Trigger every 5 minutes (`cf-worker/wrangler.jsonc`). Proposal: add cron expressions there that call `POST /api/internal/jobs/{name}`, guarded by a shared-secret header, with a `job_runs (name, period_key, status, started_at, finished_at)` table so each job is idempotent per period. Heavy fits can run in GitHub Actions and post results to an internal endpoint.
7. **Privacy.** Public payloads never contain a user id. Anything keyed to a person in public or in a counter uses an HMAC with a .NET-side secret (`PRIVACY_PEPPER`, new, set by Harsh), never a raw id or address. Private-arena battles (`comparisons.arena_id is not null`, BE-26) are excluded from every public statistic, rating, snapshot, dataset, featured selection and export, with a test in each consumer.
8. **Feature flags.** One `system_settings` flag per feature (`be25_...`), default off, read through `SystemSettingsService` (which has no cache today, api-repo-review 2.3: add a 30 second in-memory cache first).
9. **Tests.** .NET tests in `tests/DualMind.API.Tests` (existing project, CI "Verify" workflow, heavy runs only in GitHub Actions); migration up and down against a scratch Postgres in CI; Worker routes on Miniflare with MSW; contract tests against the generated OpenAPI; Playwright e2e on the mock adapter.
10. **Effort scale.** L, M, H as in the roadmap legend (under 1 day, 1 to 3 days, 3 to 5 days per slice), with the backend and web days given in each design.

### Open questions (BE-25 to BE-34)

Each design ends with its own list; these are the ones that block a decision or carry cost or legal weight, in the order they will matter.

1. **BE-32 scope conflict.** [new-features.md](../../redesign/new-features.md) says public profiles are out of scope; the poll picked profiles. Ship the minimal opt-in public page, or private badges only?
2. **Consent defaults (BE-29, BE-28, BE-34, BE-21).** Public display of a battle and inclusion in the open dataset: opt-in per battle or per account (proposed), or notice with opt-out? Legal wording for the consent and for republishing third-party model outputs.
3. **Pricing and limits (BE-25).** Free-tier numbers (60 per minute, 5,000 per day, 5 keys per user), attribution, and whether a battle-creating scope may ever exist (provider cost; no energy ledger exists).
4. **Private arena limits and admin access (BE-26).** 100 private battles per user per day, 10 arenas, 200 prompts; may admins read private prompts for abuse handling?
5. **Multi-turn limits (BE-27).** 6 turns and an 8,000-token context budget per model; whether the multi-turn board is ever merged into the main score (proposal: never).
6. **Prices (BE-31).** Hand-entered with sources (proposed) or imported from a public catalogue (terms to check); how to price Workers AI models; publishing latency measured from DualMind's container.
7. **Seasons (BE-30).** Monthly or quarterly at current volume; the three leagues; whether seasons computed from test data are published.
8. **Prompt gallery (BE-33).** Who writes the 60 curated prompts; admin approval for every community prompt; licence wording for submitted prompts (CC BY 4.0).
9. **Hugging Face (BE-34).** Owning account and name, who creates the write token, dataset licence and gating, a 30 day publication delay.
10. **Approvals needed regardless:** the baseline schema and first migration, the new secrets (`API_KEY_PEPPER`, `PRIVACY_PEPPER`, a job shared secret), a deploy of `cf-worker` for the new cron expressions.

