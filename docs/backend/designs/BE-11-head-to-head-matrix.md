# BE-11: Head-to-head matrix

Status: **design** (2026-10-22). Not built. Wave W2, rankings ([feature-roadmap.md](../feature-roadmap.md) section 0, item 3). Uses the [conventions for .NET features](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on [BE-14](./BE-14-vote-integrity.md) (`v_countable_votes`, `job_runs`), [BE-4](./BE-4-leaderboard-cache.md) (the cache pattern) and, for the predicted column, [BE-9](./BE-9-honest-ratings.md). In [DualMind_Back](https://github.com/dualmindlabs/DualMind_Back): [#28](https://github.com/dualmindlabs/DualMind_Back/pull/28) (validated votes), [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29) (no fallback comparisons), [#31](https://github.com/dualmindlabs/DualMind_Back/pull/31) (baseline schema, `v_leaderboard`) and [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33) (`comparisons.status`). All open, none merged on 2026-10-22. Feeds [BE-28](./BE-28-model-cards.md) (head-to-head section).

## 1. Summary

For every pair of models, count who won, who lost, how many ties and both-bad votes, and show it as a heatmap on the leaderboard and as "best and worst matchups" on a model's details sheet. A small table (one row per pair, about 1,400 rows for 53 models) is rebuilt every hour from the countable votes; the .NET API serves it and the Worker caches it. Each cell carries a 95% interval, because a 7 to 3 record is not the same fact as 700 to 300.

## 2. Goals and non-goals

Goals: pairwise counts that match the votes the ratings use (same filter, BE-14); honest uncertainty per cell; a view that shows where the rating hides structure (A beats B, B beats C, C beats A); a cheap cached read.

Non-goals: a time window (all-time only in v1, open question 2); category matrices (BE-12 may add a column); per-voter detail; replacing the rating (the matrix explains it, it does not rank).

## 3. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| `head_to_head` table, refresh function, endpoints | **.NET API** | Counts come from `v_countable_votes`; one SQL group-by |
| Hourly refresh | `cf-worker` Cron Trigger through the `hourly` job route ([BE-8](./BE-8-leaderboard-history.md) section 5.3) | Plain SQL; no GitHub Actions needed |
| Cached public copies `GET /api/v2/head-to-head` and `GET /api/v2/models/{modelId}/head-to-head` | **Worker** (BE-4 pattern) | Public, cacheable |
| Heatmap and matchup list | **Web** | See section 8 |

## 4. User-visible behaviour

- Leaderboard: a "Head to head" tab with a heatmap of the top 25 models (more on request). Rows and columns are ordered by rating. A cell is the row model's share of decisive votes against the column model, shaded on one diverging scale with the number written in the cell. Cells with fewer than 5 decisive votes are drawn empty with "n<5" so thin data is not coloured as if it meant something. Hover or focus shows wins, losses, ties, both-bad, the interval, and "the ratings predict X%".
- Model details sheet: "Best matchups" and "Toughest matchups", up to 5 each, ranked by evidence (the lower bound of the interval, not the raw share), with the record and the interval.
- A table equivalent of the heatmap is available (keyboard and screen reader).

## 5. API

### 5.1 .NET (anonymous, `[AllowAnonymous]`)

`GET /api/models/head-to-head?top=25&ids=&min=5`

`GET /api/models/{modelId}/head-to-head?limit=5&min=5`

```ts
// contract/head-to-head.ts (proposed; zod 4)
export const h2hModelSchema = z.object({
  modelId: z.string(), displayName: z.string(),
  rank: z.number().int().nullable(), rating: z.number().nullable(),
});

export const h2hCellSchema = z.object({
  a: z.string(), b: z.string().describe('a sorts before b; the client mirrors the cell for the other triangle'),
  aWins: z.number().int().min(0), bWins: z.number().int().min(0),
  ties: z.number().int().min(0), bothBad: z.number().int().min(0),
  decisive: z.number().int().min(0).describe('aWins + bWins'),
  aWinShare: z.number().min(0).max(1).nullable().describe('aWins / decisive; ties and both-bad excluded; null when decisive is 0'),
  ciLow: z.number().nullable(), ciHigh: z.number().nullable().describe('95% Wilson interval of aWinShare'),
  predictedA: z.number().min(0).max(1).nullable().describe('Chance the current ratings give model a; null if either is unrated'),
  differsFromFit: z.boolean().describe('True when predictedA lies outside the interval'),
  sufficient: z.boolean().describe('decisive >= min'),
}).meta({ id: 'H2HCell' });

export const h2hResponseSchema = z.object({
  asOf: z.iso.datetime(), methodology: z.string().nullable(),
  min: z.number().int(),
  models: z.array(h2hModelSchema).max(60).describe('Ordered by rating, best first'),
  cells: z.array(h2hCellSchema).max(1770).describe('Only pairs with at least one vote; pairs among the listed models'),
}).meta({ id: 'H2HResponse' });

export const matchupSchema = z.object({
  opponentId: z.string(), opponentName: z.string(),
  wins: z.number().int(), losses: z.number().int(), ties: z.number().int(), bothBad: z.number().int(),
  winShare: z.number(), ciLow: z.number(), ciHigh: z.number(),
});
export const modelMatchupsSchema = z.object({
  modelId: z.string(), asOf: z.iso.datetime(), min: z.number().int(),
  best: z.array(matchupSchema).max(10), worst: z.array(matchupSchema).max(10),
});
```

Parameters: `top` 5 to 60 (default 25: the best by rating, or by legacy rank before BE-9); `ids` an optional comma list of up to 60 model ids that overrides `top`; `min` 1 to 100 (default 5). The 60-model cap keeps the response under 1,770 cells; at about 200 bytes a cell the largest response is about 350 KB before compression, and the default (25 models, at most 300 cells) is about 60 KB.

`aWinShare` is **not** the leaderboard's `winRate` (which divides wins by appearances and counts ties as non-wins, BE-4 section 15): it excludes ties and both-bad, and the name differs on purpose.

For the model endpoint, `best` ranks opponents by the lower bound of the interval of the model's win share, and `worst` by the upper bound, both over pairs with at least `min` decisive votes. A 3 to 0 record therefore cannot top the list.

Errors: `validation_error` (non-UUID id, `top` or `min` out of range, more than 60 `ids`); `not_found` for an unknown model id; `rate_limited`. An empty table gives 200 with empty `cells`.

### 5.2 Worker (BE-4 pattern)

`GET /api/v2/head-to-head` and `GET /api/v2/models/{modelId}/head-to-head`: Cache API, fresh 10 minutes, stale 1 hour, ETag from a content hash over the canonical JSON (without `asOf`), normaliser dropping unknown fields and out-of-range numbers, and a normalised cache key (parameters sorted, defaults filled, `ids` sorted and de-duplicated, at most 60). Validation is answered at the Worker and never forwarded. A 404 for an unknown model is cached for 60 seconds only. Compression is left to the platform.

### 5.3 Internal (.NET, `X-Job-Secret`)

`POST /api/internal/jobs/head-to-head` runs `refresh_head_to_head()` (period key `YYYY-MM-DDTHH`, idempotent through `job_runs`); the hourly aggregate route calls it after BE-14's scan so the matrix uses the freshest flags. The response is `{ periodKey, status, cells }`.

## 6. Data model (migration `0009_head_to_head`)

Numbering: see [the W2 table](./README.md#wave-w2-rankings-be-14-be-9-be-10-be-8-be-11-be-16). Needs `0004` (`v_countable_votes`, `job_runs`). A plain table plus a function rather than a materialized view: PostgREST cannot issue `REFRESH`, so a function called through `Rpc` is needed either way, and a table is simpler to reason about and to roll back.

`database/migrations/0009_head_to_head.sql`:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.head_to_head (
    model_a    uuid        NOT NULL REFERENCES public.ai_models (model_id) ON DELETE CASCADE,
    model_b    uuid        NOT NULL REFERENCES public.ai_models (model_id) ON DELETE CASCADE,
    a_wins     integer     NOT NULL DEFAULT 0 CHECK (a_wins >= 0),
    b_wins     integer     NOT NULL DEFAULT 0 CHECK (b_wins >= 0),
    ties       integer     NOT NULL DEFAULT 0 CHECK (ties >= 0),
    both_bad   integer     NOT NULL DEFAULT 0 CHECK (both_bad >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (model_a, model_b),
    CHECK (model_a < model_b)
);
CREATE INDEX IF NOT EXISTS head_to_head_b_idx ON public.head_to_head (model_b);

-- Rebuild from the countable votes. One statement, so readers never see a half-built table.
CREATE OR REPLACE FUNCTION public.refresh_head_to_head() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
    WITH agg AS (
        SELECT LEAST(model1_id, model2_id)    AS a,
               GREATEST(model1_id, model2_id) AS b,
               count(*) FILTER (WHERE winner_model_id = LEAST(model1_id, model2_id))    AS a_wins,
               count(*) FILTER (WHERE winner_model_id = GREATEST(model1_id, model2_id)) AS b_wins,
               count(*) FILTER (WHERE vote_choice = 'tie')      AS ties,
               count(*) FILTER (WHERE vote_choice = 'both-bad') AS both_bad
        FROM public.v_countable_votes
        WHERE model1_id <> model2_id             -- manual mode can pick the same model twice
        GROUP BY 1, 2
    ), up AS (
        INSERT INTO public.head_to_head (model_a, model_b, a_wins, b_wins, ties, both_bad, updated_at)
        SELECT a, b, a_wins, b_wins, ties, both_bad, now() FROM agg
        ON CONFLICT (model_a, model_b) DO UPDATE
            SET a_wins = EXCLUDED.a_wins, b_wins = EXCLUDED.b_wins, ties = EXCLUDED.ties,
                both_bad = EXCLUDED.both_bad, updated_at = EXCLUDED.updated_at
        RETURNING 1
    ), del AS (
        DELETE FROM public.head_to_head h
        WHERE NOT EXISTS (SELECT 1 FROM agg WHERE agg.a = h.model_a AND agg.b = h.model_b)
        RETURNING 1
    )
    SELECT (SELECT count(*) FROM up) + (SELECT count(*) FROM del) INTO n;
    RETURN n;
END $$;

INSERT INTO public.system_settings (key, is_enabled) VALUES ('be11_head_to_head', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.head_to_head ENABLE ROW LEVEL SECURITY;

COMMIT;
```

`database/migrations/0009_head_to_head.down.sql`:

```sql
BEGIN;
DELETE FROM public.system_settings WHERE key = 'be11_head_to_head';
DROP FUNCTION IF EXISTS public.refresh_head_to_head();
DROP TABLE IF EXISTS public.head_to_head;
DELETE FROM public.job_runs WHERE name = 'head-to-head';
COMMIT;
```

Not executed; the build PR's Migrations workflow is the proof. The table is derived data, so the rollback loses nothing. Rows with `a_wins + b_wins + ties + both_bad = 0` cannot occur (a pair exists only when a countable vote exists). Votes where `winner_model_id` is null and the choice is neither `tie` nor `both-bad` cannot occur after the check constraint from #31 (`model_votes_choice`).

## 7. Design

- **Same input as the ratings.** The matrix reads `v_countable_votes`, so flagged votes, fallback or non-complete comparisons (#29, #33) and, later, private arenas and multi-turn battles are excluded in one place. BE-9 excludes self-pairs too.
- **Interval.** Wilson 95% interval for `aWins / (aWins + bWins)`, computed in .NET when the response is built (not stored), so the formula can change without a migration. The Wilson interval behaves at 0 and at `decisive` (unlike the normal approximation) and with small counts.
- **Predicted share.** From the current BE-9 run (`raw` variant): `predictedA = 1 / (1 + 10^((rating_b - rating_a) / 400))`, which matches the fit's definition because the rating scale is the Elo scale. Ties are not in the prediction, so it is compared with the decisive share, which also excludes ties. `differsFromFit` marks cells whose interval excludes the prediction: a diagnostic for intransitive pairs or a misfit, shown only in the table and tooltip, not as an accusation in the heatmap. Null before BE-9.
- **Ordering of models.** By the current run's rating, else by legacy `elo_rank` from `v_leaderboard`. Unrated models appear last with null rank and rating.
- **Mirroring.** Only `a < b` cells are stored and served. The client derives the other triangle: `aWins` becomes the opposite model's `bWins`, the share becomes `1 - share`, the interval is swapped and reflected.
- **Cost.** The refresh is one group-by over countable votes. At 100,000 votes it is well under a second on a Supabase instance (**an estimate, not measured**); the function is replaced by an incremental update only if it is not.
- **Staleness.** Up to one hour old at the source plus the Worker cache (10 minutes fresh, 1 hour stale). The response carries `asOf` (the table's newest `updated_at`).

## 8. UI

`web/src/features/leaderboard`: a "Head to head" tab beside the board. A new heatmap component with a diverging scale centred on 50% (shape or pattern as well as colour for the extremes, and the number written in each cell), model names on both axes, sticky headers, horizontal scroll on small screens (the top 25 at a readable size; "show more" up to 60). Cells under the threshold are empty with "n<5". A table view is the accessible default for screen readers. Chart guidance follows [design-direction.md](../../redesign/design-direction.md). The model details sheet gets the two matchup lists. The web reads the Worker routes through the contract schemas, like the leaderboard.

## 9. Privacy and abuse

Model-level aggregates; no user ids. A pair with very few votes could in principle be attributed to one voter by that voter, which reveals nothing they did not already know; counts are not hidden, but cells below the threshold carry no colour and no shading claim. Cache fragmentation is limited by the whitelist and the 60-id cap. Manipulation of a single cell is limited by BE-14 (a dominant voter is flagged) and the interval shows how thin a cell is.

## 10. Dependencies

Hard: BE-14's `v_countable_votes` and `job_runs` (`0004`), the job plumbing (`JOB_SHARED_SECRET`, the `cf-worker` cron change, both need Harsh's go), #31 (constraints and the CI Postgres job). Soft: BE-9 (the predicted column and ordering by rating), BE-8 (shares the hourly route), BE-4 pattern, BE-28 (consumer).

## 11. Effort and impact

Effort **L**: about 1.5 days backend (table, function, two endpoints, Wilson interval, Worker routes, tests) and 2 days web (heatmap, tooltip and table, matchup lists, a11y). Impact **M**: it makes intransitivity and thin data visible and is the most shareable chart on the board. Estimates, not commitments.

## 12. Test plan

- Unit: Wilson interval on known values (0 of 0 is null, 0 of 10, 10 of 10, 7 of 10, 700 of 1,000); `aWinShare` excludes ties and both-bad; mirroring round-trips; ordering with unrated models; `predictedA` from two ratings and null when one is missing; `differsFromFit`; the `best` and `worst` rule (3 to 0 does not outrank 40 to 20; pairs under `min` are excluded); parameter validation (`top`, `min`, `ids` cap and duplicates).
- SQL (Postgres in CI): refresh builds the expected counts for a seeded vote set; the same function twice changes nothing; a vote that becomes flagged (BE-14) disappears from the counts after the next refresh and a pair with no remaining votes is deleted; `model1_id = model2_id` rows are ignored; a fallback or non-complete comparison is ignored; `LEAST` and `GREATEST` put the pair in one row regardless of side; the `model_a < model_b` check holds.
- Job: a second run in the same hour is skipped through `job_runs`; the hourly aggregate continues when this job fails.
- Endpoints: anonymous allowed; 400 on bad parameters; 404 for an unknown model; empty table gives an empty 200; internal route needs the secret.
- Worker (Miniflare with MSW): cache key normalisation (`ids` order and duplicates), stale-while-revalidate on upstream failure, 60 second negative cache, normaliser drops unknown fields; contract tests against the generated OpenAPI.
- Migration: `0009` up, smoke, down, up, up on `postgres:16`.
- E2E (mock adapter): heatmap renders from fixtures, thin cells show "n<5", the table matches the cells, keyboard navigation through cells, the matchup lists render.

## 13. Rollout

Flag `be11_head_to_head` (a `system_settings` row, default off, 30 second cache): off means the job exits, the endpoints answer 404 `not_found`, the Worker routes are not served and the web hides the tab. Order: merge; Harsh applies `0009` (a Supabase branch first); deploy the `cf-worker` cron change (shared with BE-14 and BE-8); turn the flag on; check the counts against a manual query on the preview database; ship the web tab. Kill switch: flag off. Rollback: `0009.down.sql`.

## 14. Open questions for Harsh

1. Default heatmap size: the top 25 models (proposed), or all rated models with scrolling?
2. A time window (for example the last 30 days) next to all-time? It needs either a second table or an on-the-fly query; proposed for later, once there is enough real data to make it meaningful.
3. Minimum decisive votes before a cell is shaded: 5 (proposed, matching the current "not yet rated" threshold in spirit), or higher?
4. Show ties and both-bad counts in the tooltip (proposed), or decisive votes only?
