# BE-16: Position and style control

Status: **design** (2026-10-22). Not built. Wave W2, rankings ([feature-roadmap.md](../feature-roadmap.md) section 0, item 3). Uses the [conventions for .NET features](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on [BE-9](./BE-9-honest-ratings.md) (the fit and the `variant` and `coefficients` columns it already reserves) and [BE-14](./BE-14-vote-integrity.md) (`v_countable_votes`, the `position_skew` rule). In [DualMind_Back](https://github.com/dualmindlabs/DualMind_Back): [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29) (the `ModelExecutor` and `dualchat` flow), [#31](https://github.com/dualmindlabs/DualMind_Back/pull/31) (baseline schema) and [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33) (`comparisons.status`, `ComparisonLogger` gets an optional argument). All open, none merged on 2026-10-22.

## 1. Summary

Two known biases distort pairwise-vote ratings: people lean towards the **left** answer, and towards the **longer, more formatted** one. BE-16 does two things. **Slice A (recording, early):** record how each battle's sides were chosen, and fix the one place where the sides are not random, so clean data starts accumulating before the fit needs it. **Slice B (fit):** add a position term and style terms to the Bradley-Terry fit from BE-9, publish a second, "style controlled" variant of the board, and show the estimated size of each bias on the methodology page.

## 2. Goals and non-goals

Goals: know for every battle how its sides were assigned; remove the avoidable position confound; estimate the position effect and the length and markdown effects with intervals; offer a "style controlled" ranking next to the raw one, without hiding the raw one.

Non-goals: judging answer quality or correctness; telling users to vote differently; per-user bias correction; category-specific style effects (BE-12 may add them); removing any vote because of its style.

## 3. What the code does today (the reason for slice A)

| Fact | Evidence |
| --- | --- |
| The left side is model 1. A `left` vote sets `winner_model_id = model1_id`, `right` sets `model2_id` | `ModelStatsService.RecordVoteByChoiceAsync` ([#28](https://github.com/dualmindlabs/DualMind_Back/pull/28)) |
| The web app shows `agent1` on the left and `agent2` on the right and does not shuffle | `web/src/lib/api/schemas/arena.ts` line 104 ("`agent1` is shown on the left (Mind A), `agent2` on the right (Mind B)") |
| `random` mode: two models drawn with `OrderBy(_ => _random.Next()).Take(2)`, so the order is random | `ModelSelector.GetTwoRandomModelsInternalAsync` |
| `topper` mode: the top model by `WinRate` is returned first, a random other model second. **The strongest model is always on the left in this mode** | `LeaderboardModelSelector.GetTopperAndRandomModelAsync` |
| `manual` mode: `model1` and `model2` as the client sent them, so the user chose the sides | `ArenaController.DualChat` |
| The selection mode is **not stored** with the comparison. `ComparisonLogger` inserts only ids, texts and times; `ChatRequest` and `ChatResponse` carry `SelectionMode` but it is dropped before the insert | `ComparisonLogger.LogComparisonAsync` (#29 version) |
| The UI offers `topper` (`SELECTION_MODES = ['random', 'topper']`) | `web/src/lib/api/schemas/arena.ts` line 16 |
| Response text is stored in `comparisons.model1_response` and `model2_response`, so style features can be computed for old rows too | baseline in #31 |
| No token counts are stored (the M4 columns of api-repo-review 5.2 do not exist). Characters and words are available | baseline in #31 |

**Unverified:** whether any client other than the web app and the Telegram bot swaps sides (the bot sends only the four vote choices, per #28), and the real left-side share in production (the data is test data). Slice A makes both measurable.

Consequence: in `topper` mode the left side is systematically the best model, so a plain left-bias estimate and the ratings of the top models are confounded with position. That is a correctness issue, not just a refinement, and it is cheap to fix.

## 4. Slice A: recording and randomising

1. **`selection_mode`** stored on `comparisons` (`random`, `topper`, `manual`). Old rows stay null (unknown).
2. **`side_randomised`**: true when the server assigned the sides at random, false when the client or a rule fixed them. Old rows stay null.
3. **Randomise `topper`.** After `GetTopperAndRandomModelAsync`, swap the two with probability one half before calling the providers. The response still carries `agent1` (left) and `agent2` (right), so clients need no change. `topper` then yields `side_randomised = true`. **Behaviour change:** the strongest model no longer always appears on the left in that mode. Nothing else about the mode changes.
4. **`manual` stays as the user chose**, with `side_randomised = false`. A manual battle still counts as a vote for the ratings by default; the fit can drop or down-weight manual battles with a parameter (section 8), and the position term is estimated from randomised battles only.
5. **Style features** computed in .NET when the comparison is logged (`StyleFeatures.Compute(text)`, a pure function): characters, words, markdown headers (lines starting with `#`), bold spans (`**text**`), list items (lines starting with `-`, `*` or a number and a dot) and fenced code blocks. Stored in `comparison_features`, with a `version` so the definition can change. A batch job fills old rows from the stored text.

`ComparisonLogger.LogComparisonAsync` gets two more optional arguments (`selectionMode`, `sideRandomised`), like the optional `status` that #33 adds, so the insert is unchanged when they are null. `ArenaController` passes them; the diff touches `DualChat` only. If the new columns are missing (migration not applied) the insert retries without them, so the code can merge first, as #33 does for `comparisons.status`.

## 5. Slice B: the fit

Starting from BE-9, for each decisive or tie vote with model 1 on the left and model 2 on the right:

```
logit P(model 1 is preferred) = (theta_1 - theta_2) + beta_pos + sum_k gamma_k * x_k

x_length   = (len1 - len2) / (len1 + len2)             characters, so it lies between -1 and 1
x_headers  = (headers1 - headers2) / s_headers
x_bold     = (bold1 - bold2) / s_bold
x_lists    = (list1 - list2) / s_lists
x_code     = (code1 - code2) / s_code
```

- `beta_pos` is the left-side advantage. It is estimated from battles with `side_randomised = true` only (a fixed-order battle has a confounded position, so its `beta_pos` term is dropped and its theta terms are still used).
- `s_k` is the standard deviation of the difference over the fit data, stored in `rating_runs.params.scales`, so the coefficients are comparable ("one standard deviation more headers").
- Ties are the same two half-weight observations as in BE-9. Both-bad is left out.
- The same weak prior on theta. The `gamma` and `beta_pos` terms get a weak prior too (standard deviation 1 on the log-odds scale), to stay finite with little data.
- **Reported rating** (`variant = style_controlled`): `theta` on the Elo scale with every `x_k = 0` and no position term, meaning "if both answers had the same length and formatting". The raw variant is unchanged.
- **Intervals and coefficients:** bootstrap as in BE-9 (200 resamples of votes, refit all terms). `rating_runs.coefficients` holds `{ position, length, headers, bold, lists, code }`, each `{ value, ciLow, ciHigh }`, in log-odds; the page converts to plain words ("the left answer wins about 52% of the time when answers are otherwise equal").
- **Cost:** this variant needs per-vote rows and a Newton solve with about 60 parameters and 200 resamples. That is why it runs in the same GitHub Actions job as BE-9, not in the container (BE-9 section 5).
- **Both variants every run.** The job fits `raw` and `style_controlled` and uploads two runs with the same input window.
- **Collinearity.** Length, headers and bullet counts move together. The page reports each coefficient but the controlled ratings only need the combined adjustment; the run warns when a coefficient's interval is wider than 1.0 log-odds (not estimable yet).
- **Guard.** The style variant is published only when there are at least `minVotesStyle` (default 500) randomised, countable decisive votes; before that the run is stored with a warning and not made current.

## 6. API

### 6.1 Public (.NET, `[AllowAnonymous]`)

`GET /api/models/ratings?variant=style_controlled` is the same endpoint and schema as BE-9 (the `variant` enum already includes it). New:

`GET /api/models/ratings/bias` returns the current coefficients:

```ts
// contract/ratings.ts (proposed addition)
export const coefficientSchema = z.object({
  value: z.number().describe('Log-odds per unit'), ciLow: z.number(), ciHigh: z.number(),
});
export const biasResponseSchema = z.object({
  methodology: z.string(), runId: z.uuid(), asOf: z.iso.datetime(),
  randomisedVotes: z.number().int().min(0), totalVotes: z.number().int().min(0),
  position: coefficientSchema.describe('Left-side advantage'),
  length: coefficientSchema, headers: coefficientSchema, bold: coefficientSchema,
  lists: coefficientSchema, code: coefficientSchema,
  leftWinShare: z.object({ value: z.number(), ciLow: z.number(), ciHigh: z.number() })
    .describe('Plain share of decisive votes won by the left side, randomised battles only'),
  published: z.boolean().describe('False until minVotesStyle randomised votes exist'),
});
```

Errors: `not_found` before the first style run; `rate_limited`.

### 6.2 Worker

`GET /api/v2/leaderboard?variant=raw|style_controlled` (BE-9 added `variant` to the cache key). Unknown values are normalised to `raw`. A new `GET /api/v2/ratings/bias` uses the BE-4 pattern (fresh 1 hour, stale 1 day, ETag), because the coefficients move slowly.

### 6.3 Request and response of battles

No change to `POST /api/arena/dualchat` request or response shape. `selectionMode` was already an input (`random` or `topper`); it is now stored.

### 6.4 Internal (.NET, `X-Job-Secret`)

- `GET /api/internal/rating/input?variant=style_controlled`: NDJSON, one line per countable decisive or tie vote: `{ a, b, choice, positionRandomised, f1: {...}, f2: {...} }` (feature counts of both sides). No user, comparison or vote ids.
- `POST /api/internal/jobs/style-backfill?limit=500` (idempotent through `job_runs`, period key the batch cursor): fills `comparison_features` for rows without one, oldest first, until none remain.

## 7. Data model (migration `0005_position_style`)

`0005` sits after BE-14's `0004` and before BE-9's `0006` because slice A should ship before the fit (data accrues with time); see [the W2 table](./README.md#wave-w2-rankings-be-14-be-9-be-10-be-8-be-11-be-16) for the reserved numbers. It needs `0003` (#33) only for ordering; it adds no column that depends on `status`.

`database/migrations/0005_position_style.sql`:

```sql
BEGIN;

ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS selection_mode   text;
ALTER TABLE public.comparisons ADD COLUMN IF NOT EXISTS side_randomised  boolean;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comparisons_selection_mode_check'
                   AND conrelid = 'public.comparisons'::regclass) THEN
        ALTER TABLE public.comparisons ADD CONSTRAINT comparisons_selection_mode_check
            CHECK (selection_mode IS NULL OR selection_mode IN ('random','topper','manual'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.comparison_features (
    comparison_id uuid PRIMARY KEY REFERENCES public.comparisons (comparison_id) ON DELETE CASCADE,
    version       integer NOT NULL DEFAULT 1,
    chars1   integer NOT NULL, chars2   integer NOT NULL,
    words1   integer NOT NULL, words2   integer NOT NULL,
    headers1 integer NOT NULL, headers2 integer NOT NULL,
    bold1    integer NOT NULL, bold2    integer NOT NULL,
    lists1   integer NOT NULL, lists2   integer NOT NULL,
    code1    integer NOT NULL, code2    integer NOT NULL,
    computed_at timestamptz NOT NULL DEFAULT now()
);

-- the randomised, countable decisive and tie votes, with features, as the style fit reads them
CREATE OR REPLACE VIEW public.v_style_fit_input WITH (security_invoker = true) AS
SELECT v.model1_id, v.model2_id, v.vote_choice, c.side_randomised, c.selection_mode,
       f.chars1, f.chars2, f.headers1, f.headers2, f.bold1, f.bold2,
       f.lists1, f.lists2, f.code1, f.code2
FROM public.v_countable_votes v
JOIN public.comparisons c        ON c.comparison_id = v.comparison_id
JOIN public.comparison_features f ON f.comparison_id = v.comparison_id
WHERE v.vote_choice IN ('left','right','tie');

INSERT INTO public.system_settings (key, is_enabled) VALUES ('be16_position_style', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.comparison_features ENABLE ROW LEVEL SECURITY;

COMMIT;
```

`database/migrations/0005_position_style.down.sql`:

```sql
BEGIN;
DELETE FROM public.system_settings WHERE key = 'be16_position_style';
DROP VIEW  IF EXISTS public.v_style_fit_input;
DROP TABLE IF EXISTS public.comparison_features;
ALTER TABLE public.comparisons DROP CONSTRAINT IF EXISTS comparisons_selection_mode_check;
ALTER TABLE public.comparisons DROP COLUMN IF EXISTS side_randomised;
ALTER TABLE public.comparisons DROP COLUMN IF EXISTS selection_mode;
COMMIT;
```

Not executed; the build PR's Migrations workflow is the proof. The view needs BE-14's `v_countable_votes`; if BE-14 slips, `0005` creates the view only when `v_countable_votes` exists (a guard in the build PR) and the style fit reads the table join directly until then. The rollback drops columns that may hold data. `comparison_features` can be recomputed from the stored text, but `selection_mode` and `side_randomised` cannot be recovered for past rows, so a rollback loses them; the build PR must say so.

## 8. Design notes

- **Where `side_randomised` is set.** `random`: true (the server shuffle). `topper`: true after the swap. `manual`: false.
- **Manual battles in the fit.** Default: used for ratings (they are real preferences), excluded from the position term. Parameter `includeManual` (default true) is stored in `rating_runs.params`.
- **Why the left share alone is not enough.** A plain left-win share mixes position bias with the fact that the left model can be stronger. In randomised battles the models are independent of the side, so the plain share is an unbiased estimate of the position effect; the fit estimates it jointly with ratings and should agree. The page shows both and the `position_skew` rule of BE-14 alerts when they leave the expected range.
- **BE-14 link.** `position_skew` runs per selection mode once this slice records it (BE-14 section 9).
- **Backfill.** Old rows have null `selection_mode`, so they are excluded from the position term; their style features are backfilled and the style terms use them. The data is test data today, so the backfill may simply be skipped; open question 4.
- **Feature definition changes.** `comparison_features.version` and `rating_runs.params.featureVersion` pin what was computed; changing the markdown counter means a new version and a backfill.
- **Why these features.** Length, headers, bold and lists are the style terms used in the published style-control work for Chatbot Arena ([research.md](../research.md) part 1.1); code blocks are added because DualMind has many coding prompts. Whether this set fits DualMind's data is something the first fit will show (open question 3).

## 9. Privacy and abuse

Model-level and aggregate only. Features are counts, not text, and the input endpoint returns no ids. An attacker cannot change the position coefficient by voting left, because the estimate comes from randomised battles and a one-sided voter is flagged by BE-14 `one_sided` before the fit. A model owner could tune answers to be longer or more formatted; the style-controlled variant removes that advantage, which is its purpose.

## 10. UI

Leaderboard: a switch "Raw | Style controlled" (default raw until the style variant is published and reviewed), with a short explanation and the coefficient sentence linking to the methodology page. Methodology page: a "Position and style" section from `/ratings/bias` (the left-side advantage, the length effect in plain words, the number of randomised votes). The model details sheet shows both ratings when they differ by more than the interval overlap ("rank 4 raw, rank 7 controlled"). Battle UI: no change.

## 11. Dependencies

Hard: BE-9 for the fit (slice B), `0003` (#33) and `0004` (BE-14) ordering, a `ComparisonLogger` change that rebases over [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29) and [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33) (they touch `ArenaController.cs` and `ComparisonLogger.cs`; slice A touches them again, so build it after they merge). Slice A has no other dependency and can ship before BE-9. Soft: BE-14 (`position_skew`), BE-12.

## 12. Test plan

- Unit: `StyleFeatures.Compute` on fixtures (empty text, only a header, nested lists, numbered lists, bold inside code fences not counted, unclosed fence, CRLF, very long text, unicode); the same text gives the same counts under `version = 1`.
- Selection: `topper` swaps about half the time (seeded random, 10,000 trials within a tolerance), the swap keeps `agent1` as the left side and `model1_id` as the left model in the stored row, `manual` is never swapped and stores `side_randomised = false`, `random` stores true.
- Logger: the insert is unchanged when the new arguments are null; with the migration missing the insert retries without the columns and the battle still succeeds.
- Fit (in the BE-9 test project): planted `beta_pos` and planted length effect are recovered within tolerance on 20,000 simulated votes; with no planted effect the intervals contain zero about 95% of the time (slow test, nightly); fixed-order battles do not move `beta_pos`; the controlled ratings equal the raw ratings when all features are equal; collinearity warning fires; the guard blocks publishing under `minVotesStyle`.
- View: `v_style_fit_input` drops both-bad votes, flagged votes and comparisons without features.
- Endpoints: `bias` 404 before a run, anonymous allowed, `published: false` below the guard; Worker cache key normalisation (`variant`); contract tests against the OpenAPI.
- Migration: `0005` up, smoke, down, up, up on `postgres:16`.
- E2E (mock adapter): the switch changes the board; the methodology section renders the sentence from fixtures.

## 13. Rollout

Flag `be16_position_style`. Slice A: code merges with the flag off (columns and features are written only when on); apply `0005`; turn on; run the backfill batch if wanted; accumulate randomised votes. Slice B: ship with BE-9's job once `minVotesStyle` randomised votes exist; publish the style variant to the board only after a manual comparison of raw and controlled rankings. The `topper` swap is part of slice A and is a visible behaviour change (the top model no longer always on the left); it goes live with the flag. Kill switch: flag off stops writing features and stops the swap. Rollback: `0005.down.sql`.

## 14. Effort and impact

Effort **M**: slice A about 1.5 days backend (selection mode, swap, features, logger, backfill job, tests) plus slice B about 2.5 days backend (covariates in the fit, two-variant upload, bias endpoint, tests) and 1 day web (switch, methodology section). Impact **M**: it removes an avoidable, documented bias and gives a defensible ranking beside the raw one. Estimates, not commitments.

## 15. Open questions for Harsh

1. Randomise the `topper` mode (proposed). The only visible effect is that the top model is no longer always on the left. Agreed?
2. Should manual battles count towards ratings (proposed, with the position term excluded), or be left out entirely?
3. Is the feature set (length, headers, bold, lists, code) acceptable to start with, knowing the first real fit may drop some?
4. Backfill style features for the existing test rows, or start clean when real traffic begins?
5. Default the board to raw or style controlled once both exist? (Proposed: raw, with the other one-click away.)
