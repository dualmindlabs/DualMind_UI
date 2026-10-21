# BE-28: Model cards pages

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on [BE-4](./BE-4-leaderboard-cache.md) (cache pattern), BE-8 (history), BE-9 (ratings), BE-11 (head-to-head), BE-12 (categories); shares data with [BE-29](./BE-29-battle-of-the-day-embed-replays.md) (sample battles), [BE-30](./BE-30-seasons-and-leagues.md) (season results) and [BE-31](./BE-31-cost-quality-view.md) (price and latency).

## 1. Summary

One public page per model at `/models/<slug>`: rating with its interval and rank spread, a rating history chart, win rates against other models, strengths by category, price and measured latency, release and licence facts, awards from seasons, and a handful of **sample battles** that involved the model. The page is server-rendered with link-preview tags so a model URL is shareable and indexable.

Why: today `/models` is one directory page driven by `model-stats` ([screen-inventory.md](../../redesign/screen-inventory.md) 3.6: a candidate to be generated from the API) and a model has no address of its own. A per-model page is the natural home for everything BE-8, BE-9, BE-11, BE-12, BE-30 and BE-31 produce, and Artificial Analysis and OpenRouter both have one ([research.md](../research.md) parts 1.2 and 1.3).

## 2. Goals and non-goals

Goals: stable slugs; one cached read endpoint that assembles the page; sections that appear only when their data exists (no empty charts); sample battles that are consented and curated; honest labels (preliminary, deprecated, n).

Non-goals: user reviews or comments (out of scope in [new-features.md](../../redesign/new-features.md)); benchmark scores from outside DualMind (no third-party numbers without a licence check); a model catalogue for developers (BE-5 and OpenRouter-shaped `/models` is separate); editing by providers.

## 3. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| Model profile metadata (slug, vendor, release, licence, context, description) and the aggregate read endpoint | **.NET API** | Reads `ai_models`, `v_leaderboard` and the BE-8/9/11/12 tables; stateful product data |
| Public cached read `GET /api/v2/models/{slug}` and the link-preview tags | **Worker** | Edge cache with ETag exactly like BE-4; the Worker already writes preview tags for `/share` (`server/share.js`, routes.ts comment) |
| Page | **Web** | `/models/:slug` route |

## 4. User-visible behaviour

Sections, top to bottom: header (name, vendor, badges: new, preliminary, deprecated, open weights, free); rating card (rating, interval, rank, rank spread, battles, "methodology bt-v1"); history (BE-8 line chart, 30 and 90 days); head-to-head (best and worst matchups from BE-11, link to the full matrix); categories (BE-12 ratings per category with n); value (BE-31 price and latency, link to the cost-quality view); seasons (BE-30 finishes and awards); sample battles (up to 6, section 7.3); facts (release date, context window, licence, links to the vendor page).

Missing data is omitted, not zeroed (the Artificial Analysis rule that null means not measured). A model with fewer battles than the provisional threshold shows the "preliminary" badge and the sections that need statistics say "not enough battles yet".

`/models` (the directory) links to each card; unknown or retired slugs show a 404 page, and a retired model keeps its page with a "deprecated" banner and its final numbers (the Hugging Face archive lesson in [research.md](../research.md) 1.7).

## 5. API

### 5.1 .NET (anonymous `[AllowAnonymous]`, explicit under the deny-by-default policy)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/models/{slug}/card` | the whole card in one response |
| `GET` | `/api/models/{slug}/battles?cursor&limit` | sample battles, paged (`{ items, nextCursor }`) |
| `PUT` | `/api/admin/models/{modelId}/profile` | `AdminOnly`: edit profile fields |

`GET /api/models/{slug}/card`:

```json
{
  "slug": "example-model-1",
  "modelId": "…", "displayName": "Example Model 1", "vendor": "Example Labs", "providerName": "example",
  "status": "active", "deprecatedAt": null,
  "profile": { "releaseDate": "2026-03-04", "contextTokens": 128000, "license": "open-weights", "isFree": true,
               "description": "…", "homepageUrl": "https://…" },
  "rating": { "score": 1042, "ciLow": 1011, "ciHigh": 1070, "rank": 5, "rankLow": 3, "rankHigh": 8,
              "battles": 1830, "provisional": false, "methodology": "bt-v1", "asOf": "2026-10-21T09:00:00Z" },
  "history": { "points": [ { "day": "2026-10-20", "score": 1040 } ], "days": 30 },
  "headToHead": { "best": [ { "slug": "…", "winRate": 0.61, "battles": 210 } ], "worst": [ … ] },
  "categories": [ { "category": "coding", "score": 1065, "ciLow": 1020, "ciHigh": 1110, "battles": 240 } ],
  "value": { "priceInPer1m": 0.15, "priceOutPer1m": 0.6, "priceAsOf": "2026-10-01", "latencyP50Ms": 2100, "latencyP95Ms": 5200, "latencyN": 900 },
  "seasons": [ { "season": "2026-09", "rank": 2, "awards": ["most-improved"] } ],
  "generatedAt": "2026-10-21T09:05:00Z"
}
```

Every block except identity is optional and absent when its source feature is not live or has no data. Numbers follow the leaderboard's rounding. Errors: `not_found` (unknown slug; a **renamed** slug returns `301` to the new slug from `model_slug_history`, 410 `gone` (proposed slug) for a deleted model), `rate_limited`.

### 5.2 Worker (`GET /api/v2/models/{slug}`, `HEAD`)

A copy of the BE-4 design: Cache API with fresh 5 minutes, stale-while-revalidate 1 hour, ETag, `304`. The upstream is the .NET `card` route; the normaliser drops unknown fields and enforces the zod schema in `contract/` (shared with the web client). The sample-battle list is a separate cached route `GET /api/v2/models/{slug}/battles`. The Worker's page shell for `/models/<slug>` sets `<title>`, description and `og:` tags from the same data (cache 5 minutes), with an `og:image` from [BE-19](../feature-roadmap.md) share cards when it exists.

## 6. Data model (proposed, additive)

```sql
create table model_profiles (
  model_id     uuid primary key references ai_models(model_id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9.-]{1,60}$'),
  vendor       text,
  release_date date,
  context_tokens int check (context_tokens > 0),
  license      text check (license in ('open-weights','proprietary','mixed','unknown')),
  description  text check (char_length(description) <= 600),
  homepage_url text check (homepage_url ~ '^https://'),
  deprecated_at timestamptz,
  updated_at   timestamptz not null default now()
);
create table model_slug_history (
  old_slug text primary key,
  model_id uuid not null references ai_models(model_id) on delete cascade,
  changed_at timestamptz not null default now()
);
```

Slugs are generated from `ai_models.model_name` at migration time (lowercase, non-alphanumerics to `-`), with a collision suffix; the table is filled by a one-off script reviewed in the PR (test data, so safe to regenerate). RLS on, no policies. Rollback: drop both tables. Descriptions are written by Harsh (about 50 models today; [research.md](../research.md) and the leaderboard show 53 rows) or left empty; a missing description simply hides the field.

The card endpoint reads, and does not own: `v_leaderboard`/rating runs (BE-9), snapshots (BE-8), head-to-head (BE-11), category ratings (BE-12), `model_prices` and latency (BE-31), `season_ratings` and awards (BE-30), `featured_battles` (BE-29).

## 7. Design

### 7.1 Assembling the card

One .NET method runs the block queries in parallel and returns whatever succeeds; a failed optional block is omitted and logged (`card_block_failed`), never a 500 for the page. Results are cached in memory for 60 seconds per slug (the Worker caches longer in front).

### 7.2 Rank spread

Taken from the BE-9 run (best rank = 1 + models whose lower bound is above this model's upper bound; worst rank likewise, [research.md](../research.md) 1.1). Before BE-9, `rank` only, `provisional` from the leaderboard rule (100 battles today, BE-4 section 15).

### 7.3 Sample battles

A sample battle is a row in BE-29's `featured_battles` (kind `sample`, with `model_ids`), so the consent, moderation and takedown rules live in one place. Selection per model: up to 6, mixing the model's wins and losses (so the page is not a highlight reel), newest first within a bucket, excluding private arenas and anything flagged. Only battles whose owner opted in to "may be shown publicly" (BE-29 section 8) are eligible; until that exists the section is omitted. Each sample shows prompt, both answers truncated to 600 characters with "show full", the verdict, and the opponent. Owner identity is never shown.

### 7.4 Facts

Profile fields are admin-edited (`PUT .../profile`); the vendor URL must be `https`. No fetching of vendor pages by the server (no SSRF surface, no scraping terms to read).

## 8. Privacy and abuse

Public data is model-level only, plus sample battles with the opt-in above. No user ids anywhere. Abuse: the description and URL fields are admin-written, so no user content to moderate except samples (moderated at feature time in BE-29). Scraping is allowed and cheap (cached); BE-3 `read` and the BE-25 key limits apply.

## 9. UI screens

`/models` gains links; new route `/models/:slug` in `web/src/app/routes/` (the `models` feature folder is `web/src/features/models`). Components: rating card with interval bar, history sparkline and chart (data-viz rules in [design-direction.md](../../redesign/design-direction.md)), head-to-head list, category bars, value card, sample battle cards (reuse the battle pane), awards chips. Mobile: sections stack with a sticky jump bar. Accessibility: charts have table equivalents.

## 10. Dependencies

Hard: slug and profile table (this feature), the .NET deny-by-default and problem+json PRs. Progressive: BE-8, BE-9, BE-11, BE-12, BE-31, BE-30, BE-29 each light up a section when live, so BE-28 can ship first with identity and the current rating and grow. BE-4 pattern for the Worker route; BE-19 for the og image (optional).

## 11. Effort and impact

Effort **M**: about 2 days backend (profile table, slug backfill, card assembler, admin edit, Worker route) and 3 days web. Impact **H** for a showcase: the most visible public page after the leaderboard, indexable and shareable.

## 12. Test plan

- .NET unit: slug generation and collisions, card assembly with each block failing, rank spread fixtures, retired model banner, renamed slug redirect, admin profile validation (https only, lengths).
- Worker (Miniflare): cache states as in BE-4 (hit, stale, 304, upstream error), schema drops unknown fields, 404 and 301 pass-through, preview tags escape model-provided text.
- Contract: OpenAPI for both routes; web zod schema parses the example.
- Privacy test: the sample list never contains private-arena, flagged, non-consented or user-identifying data.
- E2E: Playwright with the mock adapter renders a card with and without optional blocks; a Lighthouse-style check for title and description in CI is optional.

## 13. Rollout

Flag `be28_model_cards`, default off. Backfill slugs on preview first. Ship identity and rating first, then each section as its source feature lands. Migration needs Harsh's go. Kill switch: flag off returns 404 and `/models` stays the plain directory.

## 14. Open questions for Harsh

1. Who writes model descriptions and licence facts: Harsh by hand (about 50 models), or leave blank and show only measured data?
2. Sample battles: opt-in per battle at share time (proposed) or an account-level setting? Default on or off? (Shared with BE-29.)
3. Show vendor logos? That means trademark and licence checks; proposal is text only.
4. Slug format: use the provider model name as is (`gpt-4o-mini`) or a friendly name?
