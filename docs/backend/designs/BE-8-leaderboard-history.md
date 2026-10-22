# BE-8: Leaderboard history

Status: **design** (2026-10-22). Not built. Wave W2, rankings ([feature-roadmap.md](../feature-roadmap.md) section 0, item 3). Uses the [conventions for .NET features](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on [BE-4](./BE-4-leaderboard-cache.md) (the cache pattern and the leaderboard the chart sits beside), [BE-9](./BE-9-honest-ratings.md) (rating runs, with intervals) and [BE-14](./BE-14-vote-integrity.md) (`job_runs`, the hourly job plumbing). In [DualMind_Back](https://github.com/dualmindlabs/DualMind_Back): [#31](https://github.com/dualmindlabs/DualMind_Back/pull/31) (baseline schema, `v_leaderboard`) and [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33). Both open, not merged on 2026-10-22. Feeds [BE-28](./BE-28-model-cards.md) (history section) and [BE-30](./BE-30-seasons-and-leagues.md).

## 1. Summary

The leaderboard shows only "now". BE-8 stores a **snapshot** of every model's rank and rating, hourly before BE-9 exists and at every published run after it, and serves three things: rank-movement arrows and "rising" badges on the board, a small sparkline per row, and a rating-over-time chart on the model details sheet. History starts accumulating on the day the first snapshot job runs, which is why BE-8 can ship before BE-9 and still show value within a day.

## 2. Goals and non-goals

Goals: a compact, append-only history; movement that is honest (a "rising" badge only when the change exceeds the intervals); one chart that never mixes two different rating scales; cheap cached reads at the edge.

Non-goals: reconstructing history from raw votes by default (optional, section 8); per-user history (BE-15); category history (BE-12); seasons (BE-30 freezes its own tables); real-time updates (BE-18).

## 3. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| Snapshot table, snapshot and thinning functions, history and movement endpoints | **.NET API** | The data is in the .NET database; snapshots must be taken in SQL, next to the view they copy |
| Hourly and daily triggers | `cf-worker` Cron Trigger calling the internal job routes (convention 6) | The container can sleep; plain SQL needs no GitHub Actions |
| Cached public copies `GET /api/v2/leaderboard/movement` and `GET /api/v2/models/{modelId}/history` | **Worker** (BE-4 pattern) | Public, cacheable, zod schema in `contract/` |
| Arrows, badges, sparkline, chart | **Web** | See section 9 |

## 4. User-visible behaviour

- Leaderboard rows: an arrow with the rank change over a selectable window (24 hours, 7 days, 30 days), a sparkline of the last 14 days, and a "rising" badge that appears only when the rise is larger than the uncertainty (section 7).
- Model details sheet (`web/src/features/leaderboard/components/model-details-body.tsx`): a "History" section with a line chart of the rating, a band for the interval where there is one, a toggle between rating and rank, and a range control (7 days, 30 days, 90 days, all). A table under the chart has the same numbers.
- Until a model has two points, the section says "History starts on {date}" instead of an empty chart.

## 5. API

### 5.1 .NET (anonymous, `[AllowAnonymous]`)

`GET /api/models/movement?window=24h|7d|30d`

`GET /api/models/{modelId}/history?range=7d|30d|90d|all`

```ts
// contract/history.ts (proposed; zod 4)
export const snapshotKindSchema = z.enum(['rating_run', 'v1_view']);

export const movementItemSchema = z.object({
  modelId: z.string(),
  rank: z.number().int(), rankPrev: z.number().int().nullable(),
  rankDelta: z.number().int().nullable().describe('Positive means the model moved up'),
  rating: z.number(), ratingPrev: z.number().nullable(), ratingDelta: z.number().nullable(),
  status: z.enum(['rising', 'falling', 'steady', 'new']),
  significant: z.boolean().describe('True when the before and after intervals do not overlap; always false for v1_view'),
  spark: z.array(z.number()).max(30).describe('Daily ratings, oldest first, last 14 days'),
}).meta({ id: 'MovementItem' });

export const movementResponseSchema = z.object({
  window: z.enum(['24h', '7d', '30d']), kind: snapshotKindSchema,
  from: z.iso.datetime(), to: z.iso.datetime(),
  items: z.array(movementItemSchema),
}).meta({ id: 'MovementResponse' });

export const historyPointSchema = z.object({
  t: z.iso.datetime(), rank: z.number().int(), rating: z.number(),
  ciLow: z.number().nullable(), ciHigh: z.number().nullable(), battles: z.number().int(),
});
export const historyResponseSchema = z.object({
  modelId: z.string(), range: z.enum(['7d', '30d', '90d', 'all']),
  kind: snapshotKindSchema, methodology: z.string().nullable(),
  resolution: z.enum(['hourly', 'daily']),
  firstSnapshotAt: z.iso.datetime().nullable(),
  points: z.array(historyPointSchema).max(400),
}).meta({ id: 'HistoryResponse' });
```

Rules:

- **One kind per response.** `kind` is `rating_run` when the model has at least two run snapshots in the range, else `v1_view`. The two have different scales (a run rating is on the Bradley-Terry scale with mean 1000; the legacy `elo_score` is whatever the database computes), so they are never drawn on one line. The response says which one it is.
- **Resolution.** Ranges up to 7 days return hourly points, longer ranges the last snapshot of each day. At most 400 points.
- **Movement window.** `from` is the nearest snapshot at or before `now - window`; `to` is the newest. A model with no snapshot at `from` is `new`.
- **Errors.** `validation_error` for an unknown `window` or `range`, or a `modelId` that is not a UUID; `not_found` for a UUID that is no model; `rate_limited`. No snapshots yet gives 200 with empty `points` and `firstSnapshotAt: null`.

### 5.2 Worker (BE-4 pattern)

`GET /api/v2/leaderboard/movement?window=` and `GET /api/v2/models/{modelId}/history?range=`: Cache API, fresh 10 minutes, stale 1 hour, ETag from a content hash, a normaliser that drops unknown fields and out-of-range numbers, query parameters whitelisted and defaults filled so the cache key cannot be fragmented (BE-31 does the same). Validation failures are answered by the Worker itself as problem+json and never forwarded. The cache holds at most 3 movement keys and 4 history keys per model (53 models today), so cardinality is bounded. A 404 for an unknown model is cached for 60 seconds only.

### 5.3 Internal (.NET, `X-Job-Secret`)

| Route | Purpose |
| --- | --- |
| `POST /api/internal/jobs/snapshot` | Hourly. Takes the `v1_view` snapshot for the current hour and, if the current run has no snapshot yet, the `rating_run` snapshot. Idempotent through `job_runs` (period key `YYYY-MM-DDTHH`) and the primary key |
| `POST /api/internal/jobs/snapshot-thin` | Daily. Applies the retention rule (section 8) |

The Worker's hourly cron `0 * * * *` calls one aggregate route, `POST /api/internal/jobs/hourly`, which runs the registered hourly jobs in order ([BE-14](./BE-14-vote-integrity.md)'s scan, this snapshot, BE-11's refresh), each in its own `job_runs` row so one failure does not stop the others. The named routes stay for manual runs.

## 6. Data model (migration `0008_leaderboard_snapshots`)

Numbering: see [the W2 table](./README.md#wave-w2-rankings-be-14-be-9-be-10-be-8-be-11-be-16). Needs `0006` (`rating_runs`) and `0004` (`job_runs`).

`database/migrations/0008_leaderboard_snapshots.sql`:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
    kind        text         NOT NULL CHECK (kind IN ('rating_run','v1_view')),
    snapshot_at timestamptz  NOT NULL,                    -- the hour (v1_view) or the run's window_to (rating_run)
    model_id    uuid         NOT NULL REFERENCES public.ai_models (model_id),
    run_id      uuid         REFERENCES public.rating_runs (run_id) ON DELETE SET NULL,
    rank        integer      NOT NULL,
    rating      numeric(8,2) NOT NULL,                    -- run rating, or the legacy elo_score for v1_view
    ci_low      numeric(8,2),
    ci_high     numeric(8,2),
    rank_lo     integer,
    rank_hi     integer,
    battles     integer      NOT NULL,                    -- votes used (rating_run) or appearances (v1_view)
    wins        integer,
    losses      integer,
    ties        integer,
    PRIMARY KEY (kind, snapshot_at, model_id)
);
CREATE INDEX IF NOT EXISTS leaderboard_snapshots_model_idx ON public.leaderboard_snapshots (model_id, kind, snapshot_at DESC);

-- v1_view snapshot of the public board, one per hour; safe to call twice
CREATE OR REPLACE FUNCTION public.take_v1_snapshot(p_at timestamptz) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
    INSERT INTO public.leaderboard_snapshots (kind, snapshot_at, model_id, rank, rating, battles, wins, losses, ties)
    SELECT 'v1_view', date_trunc('hour', p_at), l.model_id, l.elo_rank, l.elo_score,
           l.total_comparisons, l.total_wins, l.total_losses, l.total_ties
    FROM public.v_leaderboard l
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

-- rating_run snapshot of one run (the current one, or a backfill run); safe to call twice
CREATE OR REPLACE FUNCTION public.take_run_snapshot(p_run_id uuid) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
    INSERT INTO public.leaderboard_snapshots
        (kind, snapshot_at, model_id, run_id, rank, rating, ci_low, ci_high, rank_lo, rank_hi, battles, wins, losses, ties)
    SELECT 'rating_run', r.window_to, m.model_id, r.run_id, m.rank, m.rating, m.ci_low, m.ci_high,
           m.rank_lo, m.rank_hi, m.votes, m.wins, m.losses, m.ties
    FROM public.rating_runs r JOIN public.model_ratings m ON m.run_id = r.run_id
    WHERE r.run_id = p_run_id AND r.variant = 'raw'
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

-- retention: older than 30 days keep the last snapshot of each day per kind and model
CREATE OR REPLACE FUNCTION public.thin_snapshots(p_keep_days integer DEFAULT 30) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
    DELETE FROM public.leaderboard_snapshots s
    USING (
        SELECT kind, model_id, snapshot_at,
               row_number() OVER (PARTITION BY kind, model_id, date_trunc('day', snapshot_at)
                                  ORDER BY snapshot_at DESC) AS rn
        FROM public.leaderboard_snapshots
        WHERE snapshot_at < now() - make_interval(days => p_keep_days)
    ) d
    WHERE s.kind = d.kind AND s.model_id = d.model_id AND s.snapshot_at = d.snapshot_at AND d.rn > 1;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

INSERT INTO public.system_settings (key, is_enabled) VALUES ('be8_history', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

COMMIT;
```

`database/migrations/0008_leaderboard_snapshots.down.sql`:

```sql
BEGIN;
DELETE FROM public.system_settings WHERE key = 'be8_history';
DROP FUNCTION IF EXISTS public.thin_snapshots(integer);
DROP FUNCTION IF EXISTS public.take_run_snapshot(uuid);
DROP FUNCTION IF EXISTS public.take_v1_snapshot(timestamptz);
DROP TABLE IF EXISTS public.leaderboard_snapshots;
DELETE FROM public.job_runs WHERE name IN ('snapshot', 'snapshot-thin');
COMMIT;
```

Not executed; the build PR's Migrations workflow is the proof. The rollback destroys history, which cannot be recomputed except by the optional backfill; the PR says so. Size: 53 models by 24 hourly rows by 30 days is about 38,000 rows, then 53 rows a day, so about 19,000 rows a year, plus one set per run (BE-9, about 8 runs a day). The `thin_snapshots` statement is a single indexed delete over the old range and runs daily.

## 7. Design

**The `v1_view` stage.** Before BE-9, the hourly job copies `v_leaderboard` (rank, `elo_score`, counts) so history starts at once. The snapshot stores the legacy numbers as they are; it does not interpret them. **Unverified:** what `elo_score` really is in the live database (the baseline reconstruction in #31 uses a flat 1000, api-repo-review 4.5), so a `v1_view` chart can be flat or meaningless until the legacy logic is known. The chart for that kind shows rank and counts and carries the note "legacy rating".

**The `rating_run` stage.** When BE-9 publishes a run, the upload endpoint calls `take_run_snapshot(runId)`; the hourly job repeats the call for the current run as a safety net. Snapshots carry the intervals and rank ranges.

**The rising rule.** `significant` is true when the model's interval at `to` and at `from` do not overlap. `status = rising` needs `rankDelta >= 1` and `significant`; `falling` needs `rankDelta <= -1` and `significant`; otherwise `steady` (an arrow is still drawn for any non-zero `rankDelta`, in a muted style when not significant). A model that was absent at `from` is `new`. `v1_view` movement has no intervals, so it shows arrows only and never a "rising" badge. The rule is deliberately conservative: a badge that comes and goes with noise would undo what BE-9 fixes.

**Chart honesty.** The y axis does not start at zero (ratings are on an interval scale), is labelled with units, and the interval band is drawn only for `rating_run`. A break is drawn where `kind` or `methodology` changes, because ratings under different methodology versions do not compare.

**Window and clocks.** All timestamps are UTC. `snapshot_at` for a run is its `window_to` (the data cut), not the time the job finished.

## 8. Retention, backfill and the test-data question

- **Retention:** hourly for 30 days, then one per day, forever (about 19,000 rows a year).
- **Optional backfill** (off by default): a manual GitHub Actions run of the BE-9 fit at weekly cut-offs (`window.to` set to each Sunday), uploaded with `publish: false` (the BE-9 upload flag for exactly this), then `take_run_snapshot` for each. It reads only `v_countable_votes` rows with `voted_at` before the cut, so each point is what the board would have shown then, apart from flags raised later by BE-14, which hindsight also removes. Cheap (a dozen fits), but only worth doing on real data.
- **Test data:** the database holds test data today. When real traffic replaces it, the snapshots of test data would pollute the chart. Plan: a one-off admin call `DELETE /api/admin/history` (AdminOnly, requires `confirm: "delete-history"`) that truncates the table, or filtering by a `since` date in the endpoints. Open question 3.

## 9. UI

Leaderboard: arrow and sparkline columns in `leaderboard-table.tsx` and `board-card-list.tsx` (the table also exists as cards on narrow screens), window control in `board-controls.tsx`, "rising" badge as a small labelled chip (not colour alone). Model details sheet: a "History" section in `model-details-body.tsx` with an SVG line chart (the repository already has a chart component, `win-rate-chart.tsx`; **unverified** whether it can be reused, otherwise a small SVG component), range toggle, rating or rank toggle, interval band, and the table equivalent. Keyboard: the chart is one tab stop with arrow-key stepping through points and a live readout; reduced motion removes the line draw. Empty, loading and error states reuse `board-state.tsx`. The web reads the Worker routes through the contract schemas (`contract/history.ts`), like the leaderboard.

## 10. Privacy and abuse

Model-level public data; no user data. Snapshots hold counts, not votes. The only abuse is cache fragmentation by random query strings, handled by whitelisting. The admin delete route is `AdminOnly` and needs an explicit confirmation string.

## 11. Dependencies

Hard: the baseline schema (#31) for `v_leaderboard` and `ai_models`, BE-14's `job_runs` and the internal job plumbing (`JOB_SHARED_SECRET`, a `cf-worker` deploy with the hourly and daily cron expressions, both need Harsh's go). BE-9 for the `rating_run` stage (the `v1_view` stage does not need it, so BE-8 can start earlier, but the migration order puts `0006` first; if BE-8 is built before BE-9, the build PR splits `0008` so the `run_id` column and `take_run_snapshot` arrive with BE-9). Soft: BE-4 pattern, BE-28 (consumer).

## 12. Test plan

- Unit: the rising rule on fixtures (no overlap and rank up, overlap and rank up, new model, equal rank, a `v1_view` kind never rising); window arithmetic (nearest at or before, no snapshot at `from`); resolution switching at 7 days; point cap at 400; `kind` choice (one run point gives `v1_view`, two give `rating_run`); a break marker when `methodology` changes.
- SQL (Postgres in CI): `take_v1_snapshot` twice in one hour inserts once; a different hour inserts again; `take_run_snapshot` uses `window_to`, skips non-`raw` variants and is idempotent; `thin_snapshots` keeps the last row per day and touches nothing newer than 30 days; the primary key refuses duplicates.
- Job: `job_runs` period keys block a second run in the same hour; the aggregate route runs the other hourly jobs when one fails.
- Endpoints: unknown `window` or `range` is 400; non-UUID id is 400; unknown model is 404; no snapshots gives an empty 200; anonymous allowed; internal routes need the secret.
- Worker (Miniflare with MSW): cache key normalisation, stale-while-revalidate on upstream failure, negative caching of 404 for 60 seconds, the normaliser drops unknown fields; contract tests against the generated OpenAPI.
- Migration: `0008` up, smoke, down, up, up on `postgres:16`.
- E2E (mock adapter): arrows and sparklines render, the chart and its table match, the empty state shows "History starts on", the range toggle works by keyboard.

## 13. Rollout

Flag `be8_history` (a `system_settings` row, default off, 30 second cache): off means the job exits, the endpoints answer 404 `not_found`, and the web hides the section. Order: merge; Harsh applies `0008` (a Supabase branch first); deploy the `cf-worker` cron change; turn the flag on and let the hourly snapshots run for a day before shipping the web UI, so the first charts have points. Kill switch: flag off; snapshots already taken stay. Rollback: `0008.down.sql`.

## 14. Effort and impact

Effort **M** (it was L in the roadmap for the snapshot job alone): about 1.5 days backend (tables and functions, two endpoints, jobs, Worker routes, tests) and 2 days web (arrows, sparklines, chart with band, table, a11y). Impact **H**: movement and history make the board a living thing, and the model cards (BE-28) read the same data. Estimates, not commitments.

## 15. Open questions for Harsh

1. Hourly `v1_view` snapshots before BE-9 (proposed: history starts at once, but may chart a meaningless legacy number), or start snapshots only when BE-9 is live?
2. Retention: hourly for 30 days then daily forever (proposed), or shorter?
3. When real traffic replaces the test data, clear the history (proposed, with an admin call) or keep it?
4. Is the "rising" rule (rank up and non-overlapping intervals) the right bar for a public badge? A looser rule shows more badges and more noise.
5. Backfill history from votes once real data exists? (Cheap, but only meaningful with real data.)
