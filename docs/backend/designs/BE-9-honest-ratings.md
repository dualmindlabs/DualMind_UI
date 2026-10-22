# BE-9: Honest ratings (Bradley-Terry with bootstrap intervals)

Status: **design** (2026-10-22). Not built. Wave W2, rankings ([feature-roadmap.md](../feature-roadmap.md) section 0, item 3). Uses the [conventions for .NET features](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on [BE-14](./BE-14-vote-integrity.md) (`v_countable_votes`, `job_runs`), [BE-4](./BE-4-leaderboard-cache.md) (the public leaderboard and its cache) and, in [DualMind_Back](https://github.com/dualmindlabs/DualMind_Back), [#28](https://github.com/dualmindlabs/DualMind_Back/pull/28), [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29), [#31](https://github.com/dualmindlabs/DualMind_Back/pull/31) and [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33) (open, not merged on 2026-10-22). Feeds [BE-10](./BE-10-rating-change-on-reveal.md), [BE-8](./BE-8-leaderboard-history.md), [BE-11](./BE-11-head-to-head-matrix.md), [BE-16](./BE-16-position-and-style-control.md), and later BE-28, BE-30 and BE-31.

## 1. Summary

Replace the single `elo_score` number with a **Bradley-Terry fit over all countable votes**, reported with a **95% bootstrap interval** and a **rank range** for every model, produced by a repeatable **rating run** that records its inputs, parameters and seed. The public board shows the rating with its interval, sorts by rating, and marks a model `provisional` when the data cannot support a rank. A methodology page states exactly what the number is.

Why Bradley-Terry and not Elo: Elo is an online update, so the result depends on the order of votes and has no uncertainty. The Bradley-Terry maximum-likelihood fit is order-free, uses every vote at once and supports resampling for intervals. This is the method the Chatbot Arena team moved to ([research.md](../research.md) part 1.1).

## 2. Goals and non-goals

Goals: an order-independent rating on the familiar Elo scale; an interval and a rank range per model; a reproducible run (same inputs and seed give the same numbers); a `provisional` rule that is honest about uncertainty; a methodology version on every number.

Non-goals: category boards (BE-12), seasons (BE-30, which reuses the fit with a time window), position and style covariates (BE-16 extends this fit; this design leaves room for them), per-user ratings, ratings for private arenas or multi-turn battles (BE-26 and BE-27 keep their own boards; they are excluded by `v_countable_votes`), replacing the legacy `elo_score` on day one.

## 3. Facts about today's numbers

| Fact | Source |
| --- | --- |
| The API reads `elo_score` from `v_leaderboard`; the Elo update logic is not in the repository and not under version control | api-repo-review 2.3 and 4.5 |
| The reconstructed baseline `v_leaderboard` (#31) uses a flat 1000 placeholder, because the live logic is unknown | #31 body, "Known limits" |
| `total_comparisons` (shown as `totalResponses`) counts battles a model **appeared in**, whether or not anyone voted | api-repo-review 4.5, baseline view in #31 |
| A `both-bad` vote stores `winner_model_id = null` like a tie, so the two can be told apart only by `vote_choice` | `ModelStatsService.cs`, #28 |
| The web board treats models under 5 battles as "Not yet rated": `PROVISIONAL_BELOW = 5` in `contract/leaderboard.ts`, the owner's call, with a note to revisit when confidence intervals arrive. 49 of 53 models had at least 5 battles on 2026-10-21 | `web/src/features/leaderboard/lib/constants.ts` |
| BE-4 says 5 in section 15 but its goals section still says 100 | [BE-4](./BE-4-leaderboard-cache.md) lines 18 and 203; BE-28 repeats the 100. The code says 5 |

**Unverified:** the live Elo logic and K factor, and whether the 49 of 53 models count appearances or votes (the number came from `totalResponses`, so appearances).

## 4. The model

For models `i` and `j`, the probability that `i` wins a decisive vote is `1 / (1 + exp(-(theta_i - theta_j)))`.

| Vote | Treatment |
| --- | --- |
| `left` or `right` | a win for the chosen model, a loss for the other |
| `tie` | half a win for each (two weighted observations of 0.5) |
| `both-bad` | **not used in the fit** (it says nothing about which is better). Counted separately as `bothBad` per model for the page |
| A battle of a model against itself (manual mode accepts `model1 == model2`, api-repo-review 4.6 F) | not used (no information about the model's strength) |
| Anything not in `v_countable_votes` | not used |

- **Regularisation.** A weak Gaussian prior on each `theta` (standard deviation 1.5 in natural-log units, about 650 Elo points), so a model with no losses has a finite rating instead of infinity. The value is a parameter stored with every run.
- **Scale.** `rating = 1000 + (400 / ln 10) * theta`, with `theta` centred so the mean over rated models is 0. So 1000 is the average model and a 100 point gap means about a 64% win chance, the same reading as Elo.
- **Intervals.** 200 bootstrap resamples of the votes (with replacement), refit each, take the 2.5th and 97.5th percentiles of each rating. For the raw fit the votes are first aggregated into counts per ordered pair and outcome (at most about 1,400 pairs for 53 models), and each resample is a multinomial draw over those cells, so the cost does not grow with the number of votes.
- **Rank range.** In each resample, rank = 1 plus the number of models with a higher rating. `rankLo` and `rankHi` are the 2.5th and 97.5th percentiles. This replaces the "interval overlap" rule that BE-28 assumed; BE-28 should read these two fields.
- **Information.** The run also stores each model's Fisher information (the diagonal of the observed information matrix). BE-10 uses it for the rating-change estimate.
- **Connectivity.** If the pairing graph is not connected, ratings in different components are not comparable. The run stores `component` per model and a warning; the prior keeps each component centred near 1000, which is an assumption the methodology page states.
- **Reproducibility.** `seed` and `input_hash` (SHA-256 over the sorted aggregated input) are stored. Same input and seed give the same output (a tested property).

## 5. Where the fit runs (convention 6)

| Option | For | Against |
| --- | --- | --- |
| In the .NET container on a request or a Worker cron | no new runner | The container is `standard-1` with up to 3 instances and can sleep (`cf-worker/wrangler.jsonc`); a fit with covariates (BE-16) over many votes would run for minutes on a shared CPU while serving battles. Changing the formula means a production deploy |
| **GitHub Actions on a schedule** (chosen) | heavy work stays off the API; the fit code ships by merging to the repository, with no API deploy; runs are logged and reproducible; matches the convention that heavy fits run in Actions and post results to an internal endpoint | the API must expose two guarded internal endpoints and share a secret; scheduled workflows start late (minutes) and Actions minutes are a billed allowance on private repositories |
| Worker cron calling a job endpoint | simple | same CPU problem as the first row. Used for the light SQL jobs (BE-14 scan, BE-8 snapshots, BE-11 refresh), not for the fit |

Design: `.github/workflows/rating-fit.yml` in DualMind_Back, `schedule: 7 */3 * * *` plus `workflow_dispatch`. Steps: (1) `GET /api/internal/rating/watermark`; if no countable vote arrived since the last published run, stop (a 20 second job); (2) `GET /api/internal/rating/input` (NDJSON, streamed); (3) run `tools/RatingFit` (a .NET console project that references the same `DualMind.API.Core.Rating` code the API uses for BE-10's estimate, so there is one implementation and one set of tests); (4) `POST /api/internal/rating/runs` with the result. A failure leaves the previous run current. Every three hours is a proposal: a run costs about 2 minutes and 8 runs a day is about 480 minutes a month (**an estimate, not measured**), inside the 2,000 free minutes of the GitHub Free plan for private repositories (**not verified for Harsh's plan**). The only new secret is `JOB_SHARED_SECRET` (a GitHub Actions secret and an API setting, names only; Harsh creates it).

After a published upload the endpoint also calls `take_run_snapshot(runId)` from [BE-8](./BE-8-leaderboard-history.md) when that feature is installed. The job reads and writes only through the internal endpoints, so the workflow never holds the Supabase service-role key.

## 6. API

### 6.1 Public (.NET, `[AllowAnonymous]`)

`GET /api/models/ratings?variant=raw`: the current published run.

```ts
// contract/ratings.ts (proposed; zod 4)
export const ratingVariantSchema = z.enum(['raw', 'style_controlled']);   // the second one arrives with BE-16

export const ratingItemSchema = z.object({
  modelId: z.string(), modelName: z.string(), displayName: z.string(), providerName: z.string(),
  rating: z.number().describe('Elo scale, mean 1000, one decimal'),
  ciLow: z.number(), ciHigh: z.number().describe('95% bootstrap interval'),
  rank: z.number().int().min(1), rankLo: z.number().int().min(1), rankHi: z.number().int().min(1),
  votes: z.number().int().min(0).describe('Decisive and tie votes used in the fit'),
  bothBad: z.number().int().min(0),
  provisional: z.boolean(),
}).meta({ id: 'RatingItem' });

export const ratingsResponseSchema = z.object({
  methodology: z.string().describe('For example bt-v1'),
  variant: ratingVariantSchema,
  runId: z.uuid(), asOf: z.iso.datetime(),
  params: z.object({ bootstrap: z.number().int(), level: z.number(), priorSd: z.number() }),
  provisional: z.object({ minVotes: z.number().int(), maxCiWidth: z.number().nullable() }),
  warnings: z.array(z.string()),
  items: z.array(ratingItemSchema).describe('Best first; ties in rank are broken by rating'),
}).meta({ id: 'RatingsResponse' });
```

`GET /api/models/ratings/runs?limit=20` (anonymous): `{ items: [{ runId, methodology, variant, asOf, votes, models, status }] }` for the methodology page.

Errors: `validation_error` for an unknown `variant`; `not_found` when no run has been published yet (the web client then shows the legacy board); `rate_limited`.

### 6.2 Public (Worker, BE-4 pattern)

`GET /api/v2/leaderboard` gains optional fields, **additively** (BE-4 said later features extend the schema this way):

```ts
export const leaderboardRatingSchema = z.object({
  rating: z.number(), ciLow: z.number(), ciHigh: z.number(),
  rankLo: z.number().int(), rankHi: z.number().int(), votes: z.number().int(),
}).optional();       // item.rating, absent while the flag is off or no run exists
// meta gains: methodology?: string, ratingsAsOf?: iso datetime, variant?: 'raw' | 'style_controlled'
```

`eloScore` and `eloRank` keep their v1 meaning, so the web app and the BE-4 contract tests do not break. The Worker normaliser fetches `/api/models/ratings` next to `model-stats`, joins on `modelId`, and drops the optional block when the ratings call fails (stale-while-revalidate serves the last good copy). The cache key gains `variant`. Fresh 10 minutes, stale 1 hour, as BE-4.

### 6.3 Internal (.NET, `X-Job-Secret`)

| Route | Purpose |
| --- | --- |
| `GET /api/internal/rating/watermark` | `{ lastPublishedAt, newestCountableVoteAt, countableVotes }` |
| `GET /api/internal/rating/input?variant=raw` | NDJSON. Raw: one line per ordered pair and outcome with counts `{a, b, aWins, bWins, ties, bothBad}`. Style variant (BE-16): one line per vote with covariates |
| `POST /api/internal/rating/runs` | The run and its ratings in one body, applied by one SQL function; idempotent on `runId` (same id and same `inputHash` replays 200; same id with another hash is 409 `conflict`) |

```ts
export const runUploadSchema = z.object({
  runId: z.uuid(), methodology: z.string(), variant: ratingVariantSchema, trigger: z.enum(['schedule','manual']),
  publish: z.boolean().default(true).describe('False for historical backfill runs (BE-8): stored, never made current'),
  startedAt: z.iso.datetime(), finishedAt: z.iso.datetime(),
  window: z.object({ from: z.iso.datetime().nullable(), to: z.iso.datetime() }),
  params: z.object({ bootstrap: z.number().int(), level: z.number(), priorSd: z.number(), seed: z.number().int() }),
  inputHash: z.string().length(64), votes: z.number().int(), warnings: z.array(z.string()),
  coefficients: z.record(z.string(), z.object({ value: z.number(), ciLow: z.number(), ciHigh: z.number() })).optional(),
  ratings: z.array(z.object({
    modelId: z.uuid(), rating: z.number(), ciLow: z.number(), ciHigh: z.number(),
    rank: z.number().int(), rankLo: z.number().int(), rankHi: z.number().int(),
    votes: z.number().int(), wins: z.number().int(), losses: z.number().int(), ties: z.number().int(),
    bothBad: z.number().int(), fisherInfo: z.number(), component: z.number().int(),
  })).min(1).max(500),
});
```

## 7. The `provisional` rule

Today the rule is a battle count: `totalResponses < 5`, from `PROVISIONAL_BELOW` in `contract/leaderboard.ts`. Two things are wrong with it once intervals exist: it counts appearances, not votes, and it ignores how wide the interval is.

Proposal, in two steps so the board does not change without notice:

1. **Step 1 (with BE-9).** The rule keeps its count and its constant but counts **votes used in the fit** (`votes`), not appearances. Intervals are shown for every model, including provisional ones, in a lighter style. `provisional.maxCiWidth` is `null`. The board's ordering and grouping change only through the vote count.
2. **Step 2 (a second flag, `be9_provisional_ci`).** `provisional = votes < minVotes OR (ciHigh - ciLow) > maxCiWidth`, with `maxCiWidth` published in the response. A starting value of 300 Elo points would mark a model with about 25 or fewer decisive votes as provisional (**a rough figure from the binomial standard error, to be checked on real data**; at 5 votes the interval is far wider than 600).

Both numbers are the owner's call (see the comment in `constants.ts`). The web constant must read `provisional.minVotes` from the response instead of importing `PROVISIONAL_BELOW`, so there is one source. A provisional model is listed without a rank (as today), with its interval, never on the podium.

## 8. Data model (migration `0006_rating_runs`)

`0004` is BE-14 and `0005` is BE-16's recording slice; see [the W2 table](./README.md#wave-w2-rankings-be-14-be-9-be-10-be-8-be-11-be-16) for the reserved numbers. `0006` needs `0004` for `job_runs`: it creates the table if it is missing.

`database/migrations/0006_rating_runs.sql`:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.rating_runs (
    run_id       uuid        PRIMARY KEY,                  -- minted by the job from the Actions run id
    methodology  text        NOT NULL,                     -- 'bt-v1'
    variant      text        NOT NULL DEFAULT 'raw' CHECK (variant IN ('raw','style_controlled')),
    status       text        NOT NULL DEFAULT 'complete' CHECK (status IN ('complete','failed')),
    is_current   boolean     NOT NULL DEFAULT false,
    trigger      text        NOT NULL CHECK (trigger IN ('schedule','manual')),
    started_at   timestamptz NOT NULL,
    finished_at  timestamptz NOT NULL,
    window_from  timestamptz,
    window_to    timestamptz NOT NULL,
    params       jsonb       NOT NULL,                     -- bootstrap, level, priorSd, seed, scales
    input_hash   text        NOT NULL,
    votes        integer     NOT NULL,
    models       integer     NOT NULL,
    warnings     jsonb       NOT NULL DEFAULT '[]'::jsonb,
    coefficients jsonb,                                    -- BE-16: position and style terms
    published_at timestamptz
);
-- at most one current run per variant
CREATE UNIQUE INDEX IF NOT EXISTS rating_runs_current_idx ON public.rating_runs (variant) WHERE is_current;
CREATE INDEX IF NOT EXISTS rating_runs_finished_idx ON public.rating_runs (finished_at DESC);

CREATE TABLE IF NOT EXISTS public.model_ratings (
    run_id      uuid    NOT NULL REFERENCES public.rating_runs (run_id) ON DELETE CASCADE,
    model_id    uuid    NOT NULL REFERENCES public.ai_models (model_id),
    rating      numeric(8,2) NOT NULL,
    ci_low      numeric(8,2) NOT NULL,
    ci_high     numeric(8,2) NOT NULL,
    rank        integer NOT NULL,
    rank_lo     integer NOT NULL,
    rank_hi     integer NOT NULL,
    votes       integer NOT NULL,
    wins        integer NOT NULL,
    losses      integer NOT NULL,
    ties        integer NOT NULL,
    both_bad    integer NOT NULL DEFAULT 0,
    fisher_info real    NOT NULL,
    component   integer NOT NULL DEFAULT 0,
    PRIMARY KEY (run_id, model_id),
    CHECK (ci_low <= rating AND rating <= ci_high),
    CHECK (rank_lo <= rank AND rank <= rank_hi)
);
CREATE INDEX IF NOT EXISTS model_ratings_model_idx ON public.model_ratings (model_id);

-- One transaction: store the run and its ratings, then make it current for its variant.
CREATE OR REPLACE FUNCTION public.publish_rating_run(p jsonb) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE rid uuid := (p->>'runId')::uuid; v text := p->>'variant';
BEGIN
    IF EXISTS (SELECT 1 FROM public.rating_runs WHERE run_id = rid) THEN
        IF (SELECT input_hash FROM public.rating_runs WHERE run_id = rid) = p->>'inputHash' THEN
            RETURN rid;                                     -- replay
        END IF;
        RAISE EXCEPTION 'run id reused with different input' USING ERRCODE = '23505';
    END IF;
    INSERT INTO public.rating_runs (run_id, methodology, variant, trigger, started_at, finished_at,
        window_from, window_to, params, input_hash, votes, models, warnings, coefficients)
    VALUES (rid, p->>'methodology', v, p->>'trigger', (p->>'startedAt')::timestamptz, (p->>'finishedAt')::timestamptz,
        NULLIF(p#>>'{window,from}','')::timestamptz, (p#>>'{window,to}')::timestamptz, p->'params', p->>'inputHash',
        (p->>'votes')::int, jsonb_array_length(p->'ratings'), COALESCE(p->'warnings','[]'::jsonb), p->'coefficients');
    INSERT INTO public.model_ratings (run_id, model_id, rating, ci_low, ci_high, rank, rank_lo, rank_hi,
        votes, wins, losses, ties, both_bad, fisher_info, component)
    SELECT rid, (r->>'modelId')::uuid, (r->>'rating')::numeric, (r->>'ciLow')::numeric, (r->>'ciHigh')::numeric,
        (r->>'rank')::int, (r->>'rankLo')::int, (r->>'rankHi')::int, (r->>'votes')::int, (r->>'wins')::int,
        (r->>'losses')::int, (r->>'ties')::int, COALESCE((r->>'bothBad')::int, 0), (r->>'fisherInfo')::real,
        COALESCE((r->>'component')::int, 0)
    FROM jsonb_array_elements(p->'ratings') r;
    IF COALESCE((p->>'publish')::boolean, true) THEN       -- backfill runs (BE-8) pass publish = false
        UPDATE public.rating_runs SET is_current = false WHERE variant = v AND is_current;
        UPDATE public.rating_runs SET is_current = true, published_at = now() WHERE run_id = rid;
    END IF;
    RETURN rid;
END $$;

INSERT INTO public.system_settings (key, is_enabled) VALUES ('be9_ratings', false), ('be9_provisional_ci', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.rating_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_ratings ENABLE ROW LEVEL SECURITY;

COMMIT;
```

`database/migrations/0006_rating_runs.down.sql`:

```sql
BEGIN;
DELETE FROM public.system_settings WHERE key IN ('be9_ratings', 'be9_provisional_ci');
DROP FUNCTION IF EXISTS public.publish_rating_run(jsonb);
DROP TABLE IF EXISTS public.model_ratings;
DROP TABLE IF EXISTS public.rating_runs;
COMMIT;
```

Not executed; the build PR's Migrations workflow is the proof. Later designs add columns to these tables only additively (BE-16 uses `variant` and `coefficients`, both already here, so it needs no change). Old runs are kept (about 53 rows per run, 8 runs a day: about 150,000 rows a year; no thinning needed in year one).

## 9. Privacy and abuse

Model-level public data; no user ids. The input endpoint returns pair counts (raw) or per-vote rows without user or comparison ids (style variant), and only to the job secret. Manipulation: a brigade of votes moves a rating, which is what BE-14 reduces before the fit; the interval widens honestly when data is thin. The methodology page states that ratings reflect the voters who showed up, not a random sample of users. Secrets: `JOB_SHARED_SECRET` only; the workflow log prints no vote data (counts only).

## 10. UI

`web/src/features/leaderboard`: the table and cards get an interval ("1042, 1011 to 1070") and a rank range ("rank 3 to 6"), an `elo-bar` with an interval whisker, and a provisional group as today. `methodology.tsx` is rewritten to describe `bt-v1`: the model, ties, both-bad, the prior, 200 resamples, the run time and the number of votes, plus a link to the run list. Wording rule: say "rating", "interval" and "rank range"; do not call a rank range a "confidence of being best". Charts follow the data-visualisation guidance in [design-direction.md](../../redesign/design-direction.md): whiskers need a text equivalent, so the numbers stay in the table.

## 11. Dependencies

Hard: BE-14's `v_countable_votes` (otherwise the fit would read unfiltered votes; it can start on `model_votes` joined to complete comparisons if BE-14 slips, and switch when it lands), #33's `0003` (`comparisons.status`), #31 (the constraints and the CI Postgres job), `JOB_SHARED_SECRET`. Soft: BE-4 (the Worker join), BE-16 (the style variant), BE-3.

## 12. Test plan

- Unit (`DualMind.API.Tests`, runs in the existing Verify workflow): the fit on a synthetic vote set with **planted ratings** recovers them within tolerance at 20,000 votes; a perfect ordering of three models gives finite ratings (prior); ties as half wins (a tie-only pair gives equal ratings); both-bad votes do not change ratings; scale and centring (mean 1000, 100 points is about 64%); order independence (shuffled input, same output); determinism (same seed, same intervals; different seed, close intervals); coverage of the bootstrap interval on planted data (about 95% over 200 simulated datasets, run as a slow test in a nightly job, not on every PR); rank range contains the point rank; two disconnected components produce a warning; a model with zero votes is absent.
- Upload: schema validation (missing ratings, `ciLow > rating`, rank outside its range rejected by the CHECKs); replay with the same hash returns 200 and creates no row; same id with another hash is 409; publishing flips `is_current` and the partial unique index allows one current run per variant.
- Endpoints: `ratings` returns the current run only; 404 before the first run; unknown `variant` is 400; anonymous allowed; internal routes 404 without the secret and with a wrong one (constant-time compare tested for equal-length wrong secrets).
- Worker (Miniflare with MSW): the join adds `rating`; a failing ratings call drops the block and serves the last good copy; the cache key includes `variant`; the normaliser drops unknown fields; contract tests against the generated OpenAPI.
- Migration: `0006` up, smoke (a bad row is refused by the CHECKs), down, up, up on `postgres:16`; `publish_rating_run` run twice.
- Workflow: a dry run with `workflow_dispatch` against a preview API (the first real run is manual).
- E2E on the mock adapter: intervals render, a provisional model has no rank, the methodology page shows the run time.

## 13. Rollout

Flags: `be9_ratings` (the endpoints answer 404 `not_found` and the Worker omits the block when off) and `be9_provisional_ci` (step 2 of section 7). Order: merge the .NET code and the workflow (the schedule does nothing while `be9_ratings` is off, because the watermark route answers "stop"); Harsh applies `0006` to a Supabase branch, then live; set `JOB_SHARED_SECRET`; run the workflow by hand once against a preview; compare the fit with the legacy board (they should rank similarly; large disagreements are a bug or a data finding); turn `be9_ratings` on; ship the web change; after a week decide on step 2. Kill switch: flag off. Data rollback: `0006.down.sql` (ratings are derived, nothing is lost).

## 14. Effort and impact

Effort **H**: about 5 days backend (fit library with tests, console tool and workflow, endpoints, upload function, Worker join) and 2 days web (intervals, rank ranges, provisional group, methodology page). Impact **H**: it is the credibility core of the product, and the fit code is reused by BE-10, BE-30 and BE-16. Estimates, not commitments.

## 15. Open questions for Harsh

1. Fit every 3 hours in GitHub Actions (proposed) or hourly? Also confirm the private-repository minutes allowance covers about 500 minutes a month, and that creating the `JOB_SHARED_SECRET` secret is acceptable.
2. After a week of side-by-side display, does the board switch to the Bradley-Terry rating (`eloScore` then carries it, with the old value kept as `legacyEloScore`), or do both stay forever?
3. `provisional`: keep the count at 5 votes (step 1), and should step 2 (the interval width rule, 300 points as a start) ever be switched on?
4. Ties count as half a win each, and both-bad is left out of the fit: agreed? (Chatbot Arena does the same with ties; both-bad is a DualMind-specific choice.)
5. The prior (standard deviation 1.5, about 650 points): acceptable, or show unregularised numbers and mark undefeated models "not rated"?
6. BE-28 assumed a rank range from interval overlap; this design provides the bootstrap rank range. OK to change BE-28 to read `rankLo` and `rankHi`?
