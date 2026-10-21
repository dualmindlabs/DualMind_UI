# BE-30: Seasons and leagues

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on BE-8 (history snapshots), BE-9 (the rating fit, with a time window), BE-14 (integrity filters), BE-12 (categories). Feeds [BE-28](./BE-28-model-cards.md) (season results on model cards).

## 1. Summary

Every calendar month (UTC) is a **season**: ratings are fitted on that month's votes only, frozen when the month ends, and published with a final board. Models are grouped into **leagues** (open weights, proprietary, free tier) with their own boards inside a season. At the end of a season a **hall of fame** records awards: model of the month, most improved, best newcomer, most battled. The all-time leaderboard is unchanged.

Why: an all-time board moves slowly and old votes dominate it, which hides recent model updates. A monthly board shows current form, gives a reason to come back, and makes a dated, citable record ("Model X, October 2026"). Arena keeps dated changelogs and a "preliminary" tag for the same reason of credibility ([research.md](../research.md) part 1.1).

## 2. Goals and non-goals

Goals: independent monthly fits (no rating carried over, so there is no reset to manage); fixed, published rules for each award, including how ties and uncertainty are handled; frozen results that never change after finalisation (corrections go in a dated note); leagues defined from stored facts, not opinion.

Non-goals: user leagues, ladders or divisions (a social feature; see BE-32 non-goals); prizes; promotion or relegation of models; mid-season rule changes; seasons shorter than a month (too few votes: the current dataset is test data and traffic is small, see 8).

## 3. Which side builds it (ADR 0008)

**.NET API**: the fit runs over votes in the database (BE-9 is a .NET job), the season tables sit beside the rating tables, and finalisation must be transactional. The **Worker** caches the read routes (BE-4 pattern) and its cron trigger starts the monthly job (the existing `cf-worker` already has a 5-minute cron, see conventions). **Web** adds the season pages.

## 4. User-visible behaviour

- `/leaderboard` gets a season selector: "All time" (default) and each season; the current season is labelled "in progress, updated hourly" and shows "preliminary" rows below the vote threshold.
- League tabs: All, Open weights, Proprietary, Free tier. A model appears in every league it belongs to (open weights and free can overlap).
- `/hall-of-fame`: a card per finished season: the awards with the evidence ("rating 1,071, interval 1,040 to 1,102, 612 battles"), and a link to the full final board.
- The home page and model cards show the latest award ("Model of the month, September 2026").
- A finished season shows "Final, frozen on 2026-11-01" and a methodology version.

## 5. API (.NET, anonymous reads, cached by the Worker)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/seasons` | list: `{ items: [{ slug, startsAt, endsAt, status, finalizedAt, battles }] }` |
| `GET` | `/api/seasons/{slug}/leaderboard?league=&category=` | the board (current or final) |
| `GET` | `/api/seasons/{slug}/awards` | awards with evidence |
| `GET` | `/api/hall-of-fame?cursor&limit` | awards across seasons, newest first |
| `GET` | `/api/models/{slug}/seasons` | one model's season finishes |
| `POST` | `/api/internal/jobs/season-tick` | job (shared-secret header): update the current season, finalise the previous one |
| `POST` | `/api/admin/seasons/{slug}/note` | `AdminOnly`: add a dated correction note |

`GET /api/seasons/2026-10/leaderboard?league=open-weights`:

```json
{
  "season": "2026-10", "status": "active", "league": "open-weights", "category": null,
  "methodology": "bt-v1", "windowStart": "2026-10-01T00:00:00Z", "windowEnd": "2026-11-01T00:00:00Z",
  "asOf": "2026-10-21T10:00:00Z", "minBattles": 100,
  "items": [
    { "modelSlug": "example-model-3", "displayName": "Example Model 3", "rating": 1058, "ciLow": 1021, "ciHigh": 1093,
      "rank": 1, "rankLow": 1, "rankHigh": 2, "battles": 412, "preliminary": false }
  ]
}
```

Awards item: `{ award: "model-of-the-month" | "most-improved" | "best-newcomer" | "most-battled", modelSlug, season, rank, joint: false, evidence: { rating, ciLow, ciHigh, battles, delta?: number, previousRating?: number } }`.

Errors: `not_found` (unknown season or league), `validation_error` (bad league or category), `rate_limited`. The jobs route returns `401` without the secret and `409 conflict` if a run for that period is in progress.

## 6. Data model (proposed, additive)

```sql
create table seasons (
  season_id   uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^\d{4}-\d{2}$'),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      text not null default 'active' check (status in ('upcoming','active','final')),
  methodology text not null,                       -- BE-9 methodology version used for the fit
  finalized_at timestamptz,
  battles     int not null default 0,
  note        text
);
create table season_ratings (
  season_id  uuid not null references seasons on delete cascade,
  model_id   uuid not null references ai_models,
  league     text not null default 'all',          -- 'all' | 'open-weights' | 'proprietary' | 'free'
  category   text not null default 'all',          -- BE-12 category or 'all'
  rating real not null, ci_low real not null, ci_high real not null,
  rank int not null, rank_low int not null, rank_high int not null,
  battles int not null,
  primary key (season_id, model_id, league, category)
);
create table season_awards (
  season_id uuid not null references seasons on delete cascade,
  award     text not null,
  model_id  uuid not null references ai_models,
  rank      int not null default 1,
  joint     boolean not null default false,
  evidence  jsonb not null,
  primary key (season_id, award, model_id)
);
create table job_runs (                            -- shared with other jobs, defined in the conventions
  name text, period_key text, started_at timestamptz, finished_at timestamptz, status text,
  primary key (name, period_key)
);
```

RLS on, no policies. Leagues come from `model_profiles` (BE-28): `license = 'open-weights'` and `ai_models.is_free` (existing column, api-repo-review 2.2); `proprietary` is `license = 'proprietary'`. Models with `license = 'unknown'` appear only in "all". Rollback: drop the three tables (`job_runs` is dropped only if no other job uses it).

## 7. Design

### 7.1 Fit per season

BE-9's fit function takes a time window (`voted_at` in `[starts_at, ends_at)`), the same integrity filters (BE-14: flagged votes excluded), `arena_id is null` (BE-26 isolation), single-turn only (BE-27 is its own board) and the same methodology version. League and category boards are fits on the filtered subset (a model's league rating is relative to models in that league, which is stated in the UI). Minimum 100 battles for a non-preliminary row (the leaderboard's current rule; one shared constant).

### 7.2 The tick job

`season-tick` runs hourly and is idempotent per `(name, period_key)`:
1. Ensure the current month's season exists (`status = active`).
2. Refit the current season (all leagues, all categories with enough data) and replace its rows in one transaction.
3. If a previous season is still `active` and the 24-hour grace after its end has passed (votes finish near midnight; the grace avoids cutting a battle in progress), run a final refit, compute awards, set `status = final`, `finalized_at`. A final season is **never** refit again; a later correction adds a `note` and, if needed, a replacement season row version (open question 3).

Heavy fits run in the .NET container (small data) or, if the fit grows beyond the container's limits, in a GitHub Actions job that posts results to an internal endpoint (decision left to BE-9's implementation; the season job just calls the same function).

### 7.3 Award rules (published on the page)

- **Model of the month**: the highest rating among non-preliminary models in the `all` league. If the runner-up's interval overlaps the winner's lower bound **and** the winner's rating is less than 10 points above the runner-up's, both are awarded with `joint: true`. No award if fewer than 3 models are non-preliminary.
- **Most improved**: largest positive rating change versus the previous final season, among models non-preliminary in both, and only if the lower bound of this season is above the previous season's rating. Ratings from separate fits share a scale only approximately (each fit is mean-centred, [research.md](../research.md) recommendations), so the award uses **rank change plus rating change** as evidence and the rule is stated as "improved by at least 2 ranks and 15 points".
- **Best newcomer**: the best-rated non-preliminary model whose first battle (`min(comparisons.created_at)` over its `ai_models`) fell inside the season.
- **Most battled**: highest battle count (a participation fact, not quality).

The rules and thresholds are versioned (`methodology` plus `award_rules_version` in `evidence`); changing them applies to future seasons only.

### 7.4 Cron

Add `0 * * * *` to the `cf-worker` triggers beside the keep-warm `*/5 * * * *` (`cf-worker/wrangler.jsonc`), calling the job route. The Worker branch of the cron distinguishes the expressions by `controller.cron`. A missed hour is harmless; the tick is a catch-up.

## 8. Privacy and abuse

Model-level public data only. Risks: **small samples** (the database holds test data today, and a young product has few votes per month): the `preliminary` rule and "no award below 3 ranked models" prevent crowning noise; **vote manipulation targeting an award**: BE-14 integrity runs before the final fit, a final season is computed from filtered votes only, and awards show their evidence; **provider relations**: model names appear with ratings, as on the leaderboard; the pre-release anonymous label policy of Arena ([research.md](../research.md) 1.1) is not needed because DualMind lists only public models.

## 9. UI screens

`/leaderboard` season selector and league tabs (the leaderboard feature in `web/src/features/leaderboard`), `/hall-of-fame` (new route), award chips on model cards ([BE-28](./BE-28-model-cards.md)) and the home page. Design: award cards with evidence (rating, interval, battles), a "final" lock icon, methodology link. Accessible text equivalents for any trophy imagery (decorative only).

## 10. Dependencies

Hard: BE-9 with a window parameter (the main dependency, so seasons cannot ship before BE-9), BE-14 filters, BE-28 `model_profiles` for leagues. Soft: BE-8 (rank movement within a season), BE-12 (category boards), BE-26 and BE-27 isolation filters.

## 11. Effort and impact

Effort **M**: about 3 days backend (tables, tick job, award rules with tests, cached routes, cron) and 2 days web. Impact **M**: gives the leaderboard time depth and a record; value depends on enough monthly votes.

## 12. Test plan

- Unit on a synthetic vote set with planted ratings: window boundaries (a vote at `ends_at - 1 ms` is in, at `ends_at` is out), league membership, preliminary rule, each award rule including the joint case, the "fewer than 3 ranked" case, and a model that appears in no previous season.
- Idempotency: two concurrent `season-tick` runs produce one set of rows; finalising twice changes nothing; a final season is not refit by later ticks.
- Freeze test: after finalisation, an inserted late vote does not change the final board.
- Isolation: private-arena, multi-turn and flagged votes are excluded.
- Integration (scratch Postgres): migration up and down.
- Contract: OpenAPI; the cached Worker route (BE-4 pattern) serves a final season with a long TTL and the active one with 5 minutes.
- E2E: season selector and hall of fame render from fixtures.

## 13. Rollout

Flag `be30_seasons`, default off. Backfill: compute past months from existing votes on preview to check the output, then decide whether to publish history (the data is test data, so backfilled seasons are not published unless Harsh says so). Migration and cron change need Harsh's go (a deploy of `cf-worker`). Kill switch: flag off hides pages; rows stay.

## 14. Open questions for Harsh

1. Season length: monthly (proposed) or quarterly, given current vote volume?
2. Leagues: are open weights, proprietary and free tier the right three? A size-class league needs parameter counts we do not store.
3. Corrections after finalisation: dated note only (proposed) or a versioned re-publish?
4. Should the hall of fame include seasons computed from test data, or start at the first season after launch?
5. Award wording: "Model of the month" implies a winner even when the margin is small; the joint rule softens it. Acceptable?
