# BE-31: Cost-quality view (rating against price and latency)

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on BE-9 (ratings with intervals), BE-16 and api-repo-review M4 (token and `servedBy` columns), BE-28 (`model_profiles`). Feeds model cards ([BE-28](./BE-28-model-cards.md)).

## 1. Summary

A chart and table that put each model's rating next to what it costs and how fast it answers: x is price (per million tokens, or per average answer), y is rating with its interval, bubble size is battles, and a line marks the **Pareto frontier** (models that no other model beats on both). A second mode swaps price for measured latency. Filters: league (BE-30), category (BE-12), free only.

Why: "which model is best" is incomplete without "for what money and wait". Artificial Analysis and OpenRouter built their products around this chart ([research.md](../research.md) parts 1.2, 1.3 and feature idea 18). DualMind already measures latency on every battle, so the speed half is real data nobody else shows for human-preference ratings.

## 2. Goals and non-goals

Goals: honest, sourced prices with an "as of" date; latency measured from DualMind's own battles with the conditions stated; a frontier computed server-side with a documented rule; unknown values shown as unknown, never as zero.

Non-goals: live price scraping (v1 prices are entered by an admin with a source link); throughput benchmarking by synthetic load (battle latency is organic); cost of DualMind's own hosting; per-user cost accounting; recommending a model ("best value" copy is descriptive only).

## 3. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| `model_prices` and the aggregate endpoint (latency percentiles over `comparisons`, ratings, frontier) | **.NET API** | The data is in the .NET database; percentiles and frontier are batch computations next to the ratings |
| Cached public copy `GET /api/v2/cost-quality` | **Worker** | BE-4 pattern: edge cache, ETag |
| Chart | **Web** | Leaderboard tab "Value" |

## 4. User-visible behaviour

- `/leaderboard` tab "Value": scatter with models as points, interval bars on the y axis, a frontier line, a toggle "Price | Speed", filters, a legend with the units, and a table beneath (sortable) with the same numbers (the table is the accessible version of the chart).
- Hover or focus shows: rating and interval, price in and out, price as-of date and source link, latency median and 95th percentile with sample size.
- Models without a price show as a hollow marker on a "price unknown" strip at the chart edge and are excluded from the frontier. Free-tier models (`is_free`) are shown with their price if the admin entered one, else unknown; free does not mean zero cost to DualMind.
- A footnote states: ratings are from human votes; latency is measured from DualMind's servers to each provider, including queueing; prices are list prices as of the date shown.

## 5. API

### 5.1 .NET (anonymous)

`GET /api/models/cost-quality?league=&category=&window=30d&mode=price|speed`

```json
{
  "methodology": "bt-v1", "asOf": "2026-10-21T10:00:00Z", "window": "30d",
  "blend": { "inputWeight": 3, "outputWeight": 1, "note": "price = (3 x input + 1 x output) / 4 per 1M tokens" },
  "items": [
    {
      "modelSlug": "example-model-1", "displayName": "Example Model 1", "league": ["open-weights", "free"],
      "rating": 1042, "ciLow": 1011, "ciHigh": 1070, "battles": 1830, "provisional": false,
      "price": { "inPer1m": 0.15, "outPer1m": 0.6, "blendedPer1m": 0.2625, "currency": "USD", "asOf": "2026-10-01", "sourceUrl": "https://example.com/pricing" },
      "typicalAnswerCostUsd": 0.00021,
      "latency": { "ttfbMs": null, "p50Ms": 2100, "p95Ms": 5200, "n": 900, "tokensPerSecond": 62 },
      "onFrontier": { "price": true, "speed": false }
    }
  ]
}
```

Admin routes (`AdminOnly`): `GET/PUT /api/admin/models/{modelId}/prices` (append a price row; never edit history), `DELETE` is not offered (a wrong price is corrected by a newer row with a note).

Errors: `validation_error` (unknown league, category, window not in `7d|30d|90d`), `not_found` none (empty list is valid), `rate_limited`.

### 5.2 Worker

`GET /api/v2/cost-quality` with the BE-4 pattern (fresh 10 minutes, stale 1 hour, ETag, normaliser drops unknown fields). Query parameters are whitelisted and normalised in the cache key (sorted, defaults filled) so the cache cannot be fragmented by arbitrary strings.

## 6. Data model (proposed, additive)

```sql
create table model_prices (
  price_id      uuid primary key default gen_random_uuid(),
  model_id      uuid not null references ai_models(model_id) on delete cascade,
  effective_from date not null,
  input_per_1m_usd  numeric(10,4) check (input_per_1m_usd  >= 0),
  output_per_1m_usd numeric(10,4) check (output_per_1m_usd >= 0),
  source_url    text not null check (source_url ~ '^https://'),
  note          text,
  created_by    uuid references users(user_id),
  created_at    timestamptz not null default now(),
  unique (model_id, effective_from)
);
create view v_model_price_current as
  select distinct on (model_id) * from model_prices
  where effective_from <= current_date order by model_id, effective_from desc;

create table model_latency_daily (
  model_id uuid not null references ai_models(model_id) on delete cascade,
  day date not null,
  n int not null,
  p50_ms int, p95_ms int,
  avg_tokens_out int,
  tokens_per_second real,
  primary key (model_id, day)
);
```

RLS on, no policies. Rollback: drop the view and the two tables. `model_latency_daily` is a rollup written by the tick job (one row per model per day) so the endpoint never scans `comparisons`. Source of latency: `comparisons.model1_time_ms` and `model2_time_ms` (api-repo-review 2.2), counting only rows with `status = 'complete'` and where `model*_served_by` equals the model (the M4 columns; without M4 the fallback problem in api-repo-review 4.6 A contaminates latency, so **BE-31 depends on M4 for correct latency**). Token counts: M4 `model*_tokens` (provider-reported when available; otherwise omitted, not estimated, so `tokensPerSecond` is null for those models).

Time to first token is null until streaming (B-1) records it; the field exists in the contract so it can appear later without a version change.

## 7. Design

### 7.1 Price blending

One blended figure so the chart has one x value: `(3 x input + 1 x output) / 4`. This weighting is a proposal to approximate chat use (more input than output); Artificial Analysis blends 7:2:1 for cache hits, inputs and outputs ([research.md](../research.md) 1.2), which needs cache information DualMind lacks. The weights are published in the response (`blend`) and the page, and are a constant that can change with a new `methodology` note. A second figure, `typicalAnswerCostUsd`, is the median `tokens_out` times the output price plus a nominal 200 input tokens (documented), for a "cost per answer" mode in the table.

### 7.2 Frontier

Price mode: a model is on the frontier if no other **non-preliminary, priced** model has price less than or equal and rating greater than or equal with at least one strict. Ratings are compared by point estimate, and the page also shades points whose intervals overlap the frontier ("statistically close to the frontier"), computed as `ciHigh >= frontierRatingAtThatPrice`. Speed mode uses `p50Ms` the same way. Preliminary models are drawn but excluded from the frontier.

### 7.3 Latency fairness

Latency depends on where DualMind's container runs, time of day, prompt length and answer length. The stats are p50 and p95 over the window, with n; answers shorter than 20 tokens are excluded from `tokensPerSecond`. Faulty rows (`status != complete`, fallback) are excluded. The page states the vantage point. Cross-model comparison is fair because the same container calls every provider, and unfair only to the extent prompts differ; battle pairs are random, so the mix is similar across models over time.

### 7.4 Job

The same hourly tick as BE-30 (`/api/internal/jobs/season-tick` or a shared `/api/internal/jobs/rollups`): upsert `model_latency_daily` for the last 2 days. The endpoint aggregates the window from the rollup, joins `v_model_price_current` and the latest rating run, and caches in memory for 5 minutes.

## 8. Privacy and abuse

Model-level public data, no user data. The inputs for latency are not user text. Price rows are admin-written; the source URL must be `https`. Risk: a wrong or stale price misleads, so the as-of date and source are always shown and the page says "list prices, may have changed". Legal: quoting list prices with attribution to the provider's page is normal; do not copy provider charts or logos. No third-party dataset is imported without checking its licence.

## 9. UI screens

Leaderboard tab "Value" in `web/src/features/leaderboard`, a "Value" card on each model card ([BE-28](./BE-28-model-cards.md)), and the table form for the `/leaderboard.md` machine page (BE-5). Chart per the data-visualisation guidance in [design-direction.md](../../redesign/design-direction.md): labelled axes with units, no colour-only encoding (marker shape for frontier), log scale option for price (prices span orders of magnitude), keyboard-focusable points.

## 10. Dependencies

Hard: BE-9 (ratings and intervals), api-repo-review M4 (`served_by`, tokens) for honest latency, `model_profiles` (BE-28) for league filters. Soft: BE-12, BE-30, B-1 streaming (time to first token), BE-4 pattern.

## 11. Effort and impact

Effort **M**: about 2 days backend (price table and admin, rollup, endpoint, frontier, Worker route) and 2 days web (scatter with intervals and a11y table). Impact **H** for a showcase: it is the chart reviewers remember, and the latency half uses data DualMind already collects.

## 12. Test plan

- Unit: blended price, typical answer cost, frontier on fixtures (dominated, equal price, equal rating, a single model, none priced, preliminary excluded), interval-overlap shading, null handling (unknown price is null, never 0), latency percentiles with n small, exclusion of fallback and failed rows.
- Price history: the current-price view picks the latest effective row; a future-dated row is ignored until its date.
- Worker cache: query normalisation yields one key for equivalent queries; unknown params ignored; stale served when upstream fails.
- Contract: OpenAPI and web zod parse the example.
- E2E: Value tab renders with fixtures, table matches chart points, unknown-price strip appears.

## 13. Rollout

Flag `be31_cost_quality`, default off. Prices entered for the top models first (Harsh or the admin UI), with sources. Latency appears after M4 has produced at least 7 days of rows. Preview first; migration needs Harsh's go. Kill switch: flag off hides the tab.

## 14. Open questions for Harsh

1. Who maintains prices: Harsh by hand (about 50 models, rarely changing) or an automated import from a public catalogue (OpenRouter publishes model pricing; its terms of use must be checked before DualMind stores it)?
2. Blend weights 3:1 input to output: acceptable, or show input and output prices separately only?
3. Workers AI models are billed in neurons, not tokens: enter a converted per-token price with the source, or mark them "price unknown"?
4. Is it acceptable to publish latency measured from DualMind's container region, with that stated?
