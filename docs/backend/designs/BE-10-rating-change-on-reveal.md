# BE-10: Rating change on reveal

Status: **design** (2026-10-22). Not built. Wave W2, rankings ([feature-roadmap.md](../feature-roadmap.md) section 0, item 3). Uses the [conventions for .NET features](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on [BE-9](./BE-9-honest-ratings.md) (the current rating run and each model's Fisher information) and [BE-14](./BE-14-vote-integrity.md) (`record_vote`). In [DualMind_Back](https://github.com/dualmindlabs/DualMind_Back): [#28](https://github.com/dualmindlabs/DualMind_Back/pull/28) (the vote route and its errors), [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29) (`servedBy`) and [#31](https://github.com/dualmindlabs/DualMind_Back/pull/31). All open, none merged on 2026-10-22.

## 1. Summary

When a voter picks a side, the answers are revealed. BE-10 makes the reveal show what the vote is worth: each model's rating before, and an **estimate** of the rating after ("Model A 1042.0 to 1044.6, +2.6"). The vote response carries it. The number is an estimate because ratings come from a batch fit (BE-9), not from per-vote updates; the estimate is the change the next fit would make from this one vote, computed from the current run. It is labelled as an estimate everywhere.

## 2. Goals and non-goals

Goals: an immediate, honest reveal ("your vote moved these models by about this much"); no dependency on vote order; a size that shrinks as a model gains votes (a vote matters less for an established model); no change that can make a vote fail.

Non-goals: promising that the next published rating equals "after" (the next run also contains other people's votes and may differ); a live Elo update; showing rank changes (ranks come only from runs); a per-user history of changes (BE-15 may use the stored rows later).

## 3. Why an estimate, not an exact "after"

| Option | Verdict |
| --- | --- |
| Live Elo update per vote | Rejected. The legacy Elo logic is outside the repository (api-repo-review 4.5), and BE-9 deliberately replaces order-dependent updating |
| Refit synchronously on every vote | Rejected. A fit with 200 resamples runs in GitHub Actions, not in the container (BE-9 section 5), and the result would differ between concurrent votes |
| **One Newton step from the current run** (chosen) | Cheap (two numbers per model), deterministic, statistically grounded (it is what a refit does to a first approximation), and honest about shrinking effect |

The step, for a vote with outcome `S` for model `a` against model `b` (1 for a win, 0 for a loss, 0.5 for a tie):

```
E        = 1 / (1 + exp(-(theta_a - theta_b)))         expected score from the current ratings
d_theta_a = (S - E) / (I_a + E (1 - E))
d_theta_b = -(S - E) / (I_b + E (1 - E))
delta_rating = (400 / ln 10) * d_theta                  about 173.7 per log-odds unit
```

`I_a` is model `a`'s Fisher information from the current run (`model_ratings.fisher_info`, which includes the prior, so it is never zero). A new model with little information moves a lot; an established one barely moves. The step treats the two models as independent (it ignores the off-diagonal terms of the information matrix), so it is an approximation; the design target is an estimate within a factor of two of the real refit change for models with at least 20 votes (to be measured, see the test plan).

Worked example (numbers invented): `a` is 1042.0 with `I_a = 30`, `b` is 1010.0 with `I_b = 12`; `E = 0.546`; the voter picks `a` (`S = 1`). `d_theta_a = 0.454 / (30 + 0.248) = 0.0150`, so `a` gains 2.6. `d_theta_b = -0.454 / (12 + 0.248) = -0.0371`, so `b` loses 6.4. `b` moves more because it has fewer votes behind it.

A **both-bad** vote changes nothing in the fit, so the delta is 0 with `kind: "none"`. A vote that BE-14 later excludes still showed an estimate, because the voter cannot know.

## 4. API

### 4.1 `POST /api/arena/model-vote` (.NET, extends #28)

The request is unchanged (`comparisonId`, `voteChoice`, `voteDurationMs`). The success body keeps `success` and `message` and gains `ratingChange`, only when flag `be10_rating_change` is on:

```ts
// contract/ratings.ts (proposed addition)
export const ratingChangeModelSchema = z.object({
  side: z.enum(['left', 'right']),
  modelId: z.string(), modelName: z.string(), displayName: z.string(), providerName: z.string(),
  before: z.number().describe('Rating in the run the estimate starts from, one decimal'),
  after: z.number().describe('before + delta, one decimal'),
  delta: z.number().describe('Signed; 0 for a both-bad vote'),
  rank: z.number().int().nullable().describe('Rank in that run, null if the model is not ranked'),
  provisional: z.boolean(),
});

export const ratingChangeSchema = z.object({
  kind: z.enum(['estimate', 'none']),
  reason: z.enum(['both_bad']).optional(),
  methodology: z.string(), variant: z.literal('raw'),
  runId: z.uuid(), runAsOf: z.iso.datetime(),
  models: z.tuple([ratingChangeModelSchema, ratingChangeModelSchema]),
});

export const voteResponseSchema = z.object({
  success: z.boolean(), message: z.string(),
  ratingChange: ratingChangeSchema.nullish(),   // absent when the flag is off; null when unavailable
});
```

`ratingChange` is `null` (and the vote still succeeds) when: no run has been published, either model is not in the current run, the estimate could not be computed, or the ratings could not be read. The failure is logged with the request id and never reaches the voter. The `models` array carries both models' names, so the reveal can be drawn from this response alone; see section 7 for why that matters.

Example (the worked example above):

```json
{
  "success": true, "message": "Vote recorded successfully",
  "ratingChange": {
    "kind": "estimate", "methodology": "bt-v1", "variant": "raw",
    "runId": "0b6f2c1e-0000-4000-8000-000000000001", "runAsOf": "2026-10-22T06:00:00Z",
    "models": [
      { "side": "left",  "modelId": "m-a", "modelName": "example-a", "displayName": "Example A", "providerName": "example",
        "before": 1042.0, "after": 1044.6, "delta": 2.6, "rank": 3, "provisional": false },
      { "side": "right", "modelId": "m-b", "modelName": "example-b", "displayName": "Example B", "providerName": "example",
        "before": 1010.0, "after": 1003.6, "delta": -6.4, "rank": 9, "provisional": false }
    ]
  }
}
```

### 4.2 The duplicate vote (409 `ALREADY_VOTED`)

#28 returns 409 when a second vote arrives. A retry that races a successful first request (which the web queue can cause) then shows an error instead of the reveal. With BE-10 the problem body gains an extension member `ratingChange` read from `vote_rating_effects` for that voter and comparison, and the web client treats `ALREADY_VOTED` as success when it is present (the follow-up #28 itself suggests for the UI). If no stored row exists (an old vote), the member is omitted.

### 4.3 Errors

No new errors. The existing ones of #28 are unchanged: 400 `INVALID_VOTE_CHOICE` and `INVALID_REQUEST`, 403 `COMPARISON_NOT_OWNED`, 404 `COMPARISON_NOT_FOUND`, 409 `ALREADY_VOTED`, 500 `internal_error`.

### 4.4 Worker

The Worker proxies `model-vote` unchanged, so the new member passes through. The v1 response schema in the Worker's contract tests gains the optional member. No cache is involved (a write route).

## 5. Data model (migration `0007_vote_rating_effects`)

Stored so that a replay (section 4.2) returns the same numbers, and so a later feature (BE-15 personal stats, the BE-9 accuracy check of the estimate) can use them. Numbering: see [the W2 table](./README.md#wave-w2-rankings-be-14-be-9-be-10-be-8-be-11-be-16).

`database/migrations/0007_vote_rating_effects.sql`:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.vote_rating_effects (
    vote_id       uuid        PRIMARY KEY REFERENCES public.model_votes (vote_id) ON DELETE CASCADE,
    run_id        uuid        REFERENCES public.rating_runs (run_id) ON DELETE SET NULL,
    kind          text        NOT NULL CHECK (kind IN ('estimate','none')),
    model1_id     uuid        NOT NULL REFERENCES public.ai_models (model_id),
    model2_id     uuid        NOT NULL REFERENCES public.ai_models (model_id),
    model1_before numeric(8,2) NOT NULL,
    model1_after  numeric(8,2) NOT NULL,
    model2_before numeric(8,2) NOT NULL,
    model2_after  numeric(8,2) NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vote_rating_effects_run_idx ON public.vote_rating_effects (run_id);

INSERT INTO public.system_settings (key, is_enabled) VALUES ('be10_rating_change', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.vote_rating_effects ENABLE ROW LEVEL SECURITY;

COMMIT;
```

`database/migrations/0007_vote_rating_effects.down.sql`:

```sql
BEGIN;
DELETE FROM public.system_settings WHERE key = 'be10_rating_change';
DROP TABLE IF EXISTS public.vote_rating_effects;
COMMIT;
```

Not executed; the build PR's Migrations workflow is the proof. `model1` is the left side (`comparisons.model1_id`, see [BE-16](./BE-16-position-and-style-control.md) section 3). The effect row is written by a separate call after the vote commits, because a failure to store an estimate must not undo a vote. Volume is one row per vote.

## 6. Design

- **Where it runs.** `RatingEstimator` (pure, in `DualMind.API.Core.Rating`, the same assembly the BE-9 fit uses, so the formula has one definition) is called by the vote path after `record_vote` ([BE-14](./BE-14-vote-integrity.md) section 7.4) succeeds.
- **Reading the run.** A `CurrentRatingsCache` holds the whole current run (about 53 rows) in `IMemoryCache` for 60 seconds, per instance (`max_instances: 3` in `cf-worker/wrangler.jsonc`, so a new run reaches every instance within a minute). One PostgREST call per instance per minute, not one per vote.
- **Order of work.** Vote committed, then estimate, then insert into `vote_rating_effects`, then respond. The extra work is two cache reads and one small insert. If the cache is cold, the first vote pays one extra call, bounded by a 1.5 second timeout after which `ratingChange` is `null`.
- **Rounding.** One decimal in the API. The web shows a whole number when the change is 1 or more and one decimal below that, so +0.3 is not shown as +0.
- **Flag dependencies.** Needs `be9_ratings` on (otherwise there is no run and `ratingChange` is `null`).
- **Honesty text** (web): "Estimated from the latest ratings (updated {time}). The next update also includes other votes, so the final number can differ." The model names and the estimate appear only after the vote, as today.

## 7. Link to the blind-vote finding

`dualchat` currently returns the model names before the vote and relies on the UI to hide them (api-repo-review 4.6 E, KNOWN_ISSUES #2). That is a separate item (not part of this wave's list), but BE-10 prepares for it: because `ratingChange.models` carries the names, the reveal can come from the vote response alone, and a later change can stop sending names in the `dualchat` response without the reveal losing anything. Until then both paths exist and the web app should prefer the vote response.

## 8. Privacy and abuse

Model-level numbers only; the response reveals nothing the leaderboard does not. Probing: a user could vote on their own battles to read the response, which is no more than the public board gives. The effect rows hold no prompt text. One vote per comparison and the ownership check are #28's. The estimate gives no reward for voting more (it shrinks with information, and votes do not change the voter's standing).

## 9. UI

Reveal state of the vote bar (`web/src/features/arena/components/vote-bar.tsx` area): after the vote, each answer shows the model name, its provider and "1042.0 to 1044.6 (+2.6)" with a up or down glyph and the words "up" or "down" (not colour alone), a one-line "estimate" label with an info tooltip, and the provisional badge when relevant. The change is announced in an `aria-live="polite"` region. When `ratingChange` is `null` the reveal shows the names only. The mock adapter (`web/src/lib/api/mock/mock-fetch.ts`) returns a fixed example so Playwright can test the state. `voteResultSchema` (currently `mutationResultSchema`, "It does not return new ratings (B-2)") is extended with the optional member; the schema comment is updated.

## 10. Dependencies

Hard: BE-9 (a published run with `fisher_info`), BE-14's `record_vote` (the point where the vote commits; without it the same hook sits after the existing three calls), #28 (the vote route and `ALREADY_VOTED`). Soft: BE-16 (the variant stays `raw`; a style-controlled estimate is out of scope), the blind-vote fix of section 7.

## 11. Effort and impact

Effort **M**: about 2 days backend (estimator, cache, vote-path hook, effects table, 409 replay, tests) and 1.5 days web (reveal state, schema, mock, a11y). Impact **H**: it is the moment a voter sees what the system does with their vote, and it demonstrates that the rating is statistical rather than a counter. Estimates, not commitments.

## 12. Test plan

- Unit (`RatingEstimator`): equal ratings and equal information give equal and opposite deltas; a tie between equal models gives 0 for both; a tie between unequal models moves them towards each other; an upset moves more than the expected result; the delta shrinks monotonically as `I` grows; `I` at the prior floor (about 0.44) gives a large but finite step; both-bad gives `kind: "none"` and zero; side mapping (`left` is model 1); output rounded to one decimal; no NaN or infinity for extreme rating gaps.
- Accuracy against the real thing (in the BE-9 test project): on simulated data, add one vote, refit, and compare the actual change with the estimate; the design target is a ratio between 0.5 and 2 for models with at least 20 votes (the bound is fixed in the build PR after the first measurement, not before).
- Route: flag off gives the #28 body exactly (a snapshot test of the existing six cases); flag on adds `ratingChange`; no run gives `null` and a 200; one model missing from the run gives `null`; a slow ratings read hits the 1.5 second bound and the vote still succeeds; the vote is stored even when the effect insert fails.
- 409: the body carries the stored `ratingChange` for the same voter; for another voter's comparison the 403 of #28 still wins; an old vote without a stored effect omits it.
- Cache: one upstream read serves many votes within 60 seconds; a new run is picked up after the TTL.
- Migration: `0007` up, smoke, down, up, up on `postgres:16`.
- Web: schema parse of the example and of a response without the member; the reveal state renders from the mock; keyboard and screen reader announcement; reduced motion.

## 13. Rollout

Flag `be10_rating_change` (a `system_settings` row, default off, 30 second cache). Order: BE-9 live and compared with the legacy board; apply `0007`; deploy; turn on for one day and compare estimates with the following run's real changes (a query over `vote_rating_effects` and `model_ratings`); then ship the web reveal. If the estimates are far off, leave the flag on but hide the web display, or tune nothing and turn it off. Kill switch: flag off removes the member. Rollback: `0007.down.sql` (derived data).

## 14. Open questions for Harsh

1. Show an estimate with a clear label (proposed), or wait and show the real change after the next fit (a delayed, less satisfying reveal)?
2. Show the change for provisional models? (Proposed: yes, with the provisional badge, because their movement is the largest and most telling.)
3. Should the reveal also show rank (proposed: the rank in the current run, never a rank change, since ranks only change at a run)?
4. Is the vote response the right place for the model names, with a later change removing names from the `dualchat` response (section 7)?
