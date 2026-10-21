# DualMind backend phase: feature roadmap

Status: **amended 2026-10-21 by [ADR 0008](../adr/0008-features-in-the-dotnet-api.md)**: see section 0 for where each feature lives and the new wave order. Builds on [research.md](./research.md) and [ADR 0007](../adr/0007-backend-on-cloudflare.md) (backend features at the edge of the existing API, under `/api/v2`, in the `dualmind-arena` Worker). Contract problems these features fix come from [docs/api/endpoints.md](../api/endpoints.md).

Each feature gets a design document in `docs/backend/designs/` (data model, endpoints, auth, limits, failure modes, tests) **before** its build PR. Every build PR ships with API tests (Vitest on Miniflare) and contract tests against the OpenAPI document, and updates [the redesign status log](../redesign/status.md).

Legend: Impact and Effort are **H**igh, **M**edium, **L**ow (effort: L < 1 day, M 1-3 days, H 3-5 days). "Account" is what Harsh must create or approve in Cloudflare (see [needs-harsh.md](../redesign/needs-harsh.md)); "none" means it ships with code only.

## 0. Where each feature lives (ADR 0008, 2026-10-21)

| ID | Feature | Lives in | Status |
| --- | --- | --- | --- |
| BE-0 | Platform (`/api/v2` edge router, problem+json, request context, OpenAPI) | Worker | **Done** ([#48](https://github.com/dualmindlabs/DualMind_UI/pull/48)) |
| BE-1 | One error shape (problem+json normalisation) | Worker (and fixed at the source in the .NET API) | **Done at the edge** ([#49](https://github.com/dualmindlabs/DualMind_UI/pull/49)) |
| BE-2 | TTS route fix | Worker | **Done** ([#49](https://github.com/dualmindlabs/DualMind_UI/pull/49)) |
| BE-3 | Rate limits with headers | Worker | **Done** ([#51](https://github.com/dualmindlabs/DualMind_UI/pull/51)) |
| BE-4 | Fast public leaderboard (edge cache) | Worker | Next (design ready) |
| BE-5 | Developer portal, OpenAPI, `llms.txt` | Worker + web | Next (design ready) |
| BE-6 | Safe retries (idempotency keys) | **.NET API** (comparison id minted up front, `Idempotency-Key` table) | Next |
| BE-7 | Ledger | **Dropped**: the .NET database is the source of truth | |
| BE-8 | Leaderboard history | **.NET API** (snapshot table + job) | Planned |
| BE-9 | Honest ratings (Bradley-Terry + CIs) | **.NET API** (rating runs table, job) | Planned |
| BE-10 | Rating change on reveal | **.NET API** (vote response) | Planned |
| BE-11 | Head-to-head matrix | **.NET API** (+ Worker cache) | Planned |
| BE-12 | Category leaderboards | **.NET API** (category column, classifier call) | Planned |
| BE-13 | Prompt moderation | **.NET API** (before providers are called) | Planned |
| BE-14 | Vote integrity | **.NET API** (validation, one vote per comparison, flags) | Next (first .NET PRs) |
| BE-15 | Your verdicts (personal stats) | **.NET API** | Planned |
| BE-16 | Position and style control | **.NET API** (side recorded, covariates) | Planned |
| BE-17 | Edge arena: streaming battles on Workers AI | Worker | Planned |
| BE-18 | Live arena (WebSockets) | Worker (Durable Objects) | Planned |
| BE-19 | Share cards | Worker + R2 | Planned |
| BE-20 | Status and metrics page | Worker (Analytics Engine) | Planned |
| BE-21 | Open dataset | **.NET API** export + R2 | Planned |
| BE-22 | Data controls | **.NET API** | Planned |
| BE-23 | Anonymous demo guard (Turnstile) | Worker | Planned |
| BE-24 | Fair pairing | **.NET API** | Planned |
| BE-25 | Developer API keys + usage dashboard | **.NET API** (keys, usage aggregates) + Worker (verify, per-key limit, counting) | Design ready |
| BE-26 | Private arenas | **.NET API** | Design ready |
| BE-27 | Multi-turn battles | **.NET API** | Design ready |
| BE-28 | Model cards pages | **.NET API** (profile, aggregate) + Worker (cache, preview tags) | Design ready |
| BE-29 | Battle of the day, embed widget, replays | **.NET API** (featuring, consent) + Worker (embed, oEmbed, CSP) | Design ready |
| BE-30 | Seasons and leagues | **.NET API** (+ Worker cache) | Design ready |
| BE-31 | Cost-quality view | **.NET API** (prices, rollup) + Worker cache | Design ready |
| BE-32 | Profiles, badges and reputation | **.NET API** | Design ready (scope conflict, see the design) |
| BE-33 | Prompt gallery | **.NET API** (+ Worker cache) | Design ready |
| BE-34 | Collections, exports, Hugging Face dataset | **.NET API** (collections) + GitHub Actions (dataset) | Design ready |

**New wave order (from 2026-10-21):**

1. **.NET W1, safety first** (from [api-repo-review.md](./api-repo-review.md)): require sign-in on unauthenticated write routes; validate votes (whitelist, one vote per comparison, ownership); stop recording fallback answers as the original model's; mint `comparisonId` before calling providers + `Idempotency-Key` (BE-6); one problem+json error shape at the source; no `ex.Message` leaks.
2. **Edge W1 finish:** BE-4 leaderboard cache, BE-5 developer portal.
3. **.NET W2, rankings:** BE-14 integrity, BE-9 ratings with CIs, BE-10 rating change, BE-8 history, BE-11 head-to-head, BE-16 position/style.
4. **Showcase:** streaming `dualchat` in .NET (B-1) and BE-17 edge arena, BE-20 status page, BE-18 live, BE-19 share cards.
5. **People and data:** BE-15, BE-12, BE-13, BE-21, BE-22, BE-24, BE-23.
6. **W6, product features from the 21 Oct poll (BE-25 to BE-34)**, after the rankings wave because most read BE-8, BE-9, BE-11 or BE-12 (details in section 2): BE-28 model cards, BE-31 cost-quality, BE-33 prompt gallery, BE-30 seasons, BE-25 API keys, BE-29 battle of the day and embeds, BE-32 profiles, BE-34 collections then the Hugging Face dataset, BE-26 private arenas, BE-27 multi-turn battles. Designs: [designs/README.md](./designs/README.md#wave-w6-product-features-chosen-in-the-21-oct-poll-be-25-to-be-34).

## 1. Features

| ID | Feature | What the user or reviewer gets | Impact | Effort | Cloudflare services | Account |
| --- | --- | --- | --- | --- | --- | --- |
| BE-0 | **Platform** | `/api/v2` router, request context (request id, user from verified Supabase JWT), RFC 9457 errors, zod schemas with generated OpenAPI 3.1, `not_enabled` guards, Miniflare test harness, contract tests | H (everything builds on it) | M | Workers | none |
| BE-1 | **One error shape** | v1 errors normalised to `application/problem+json` when the client asks for it (`Accept`), so the UI handles one shape instead of three | M | L | Workers | none |
| BE-2 | **Text-to-speech fix** | `/api/audio/tts` answered by the real `/api/speech/generate` route (KNOWN_ISSUES #7) for any old caller | L | L | Workers | none |
| BE-3 | **Rate limits with headers** | Per-user (fallback hashed IP) limits on battle, chat and vote, `RateLimit-*` and `Retry-After` headers, a 429 problem response the UI can show | M | L | Rate Limiting binding | none |
| BE-4 | **Fast public leaderboard** | `GET /api/v2/leaderboard` from the edge cache with ETag and stale-while-revalidate; normalised fields (no duplicate casing) | M | L | Cache API | none |
| BE-5 | **Public API docs** | `/api/v2/openapi.json`, a docs page in the app, `/leaderboard.md` and `llms.txt` for machine readers | M | L | Workers | none |
| BE-6 | **Safe retries** | `Idempotency-Key` on battle and chat `POST`s at the proxy; a replay returns the first response instead of starting a second battle (fixes duplicate battles) | H | M | D1 | D1 |
| BE-7 | **Edge ledger** | Append-only record of battles and votes seen by the proxy (ids, models, sides, prompt hash, lengths, latency, vote, hashed user id; no text) | H (feeds BE-8 to BE-16) | M | D1, Queues (or `waitUntil`) | D1 (+ Queue) |
| BE-8 | **Leaderboard history** | Hourly snapshots of the public stats; rank movement arrows, "rising" badges and sparklines on the leaderboard and model pages | H | L | D1, Cron Trigger | D1 |
| BE-9 | **Honest ratings** | Bradley-Terry fit with 95% bootstrap intervals, rank spread, "preliminary" below the vote threshold, methodology version on every run, public methodology page | H | H | D1, Cron + Workflow (Paid) or GitHub Actions (Free) | D1 |
| BE-10 | **Rating change on reveal** | The vote response carries each model's rating before and after; the reveal shows "+14 / -14" | H | M | D1 | D1 |
| BE-11 | **Head-to-head matrix** | Pairwise win rates and counts, heatmap on the leaderboard, head-to-head in model sheets | M | L | D1, KV cache | D1, KV |
| BE-12 | **Category leaderboards** | Each prompt classified (code, math, writing, reasoning, other) by a small model at battle time, category boards | H | M | Workers AI, D1 | D1 |
| BE-13 | **Prompt moderation** | Unsafe prompts blocked before they reach any model, with a clear message; refusal rate per model tracked | M | M | Workers AI (guard model), KV cache | none |
| BE-14 | **Vote integrity** | Hourly job flags duplicates, too-fast votes, bursts, one-sided voters and identity-leak prompts; flagged votes excluded from ratings; public dated filter log | H | M | D1, Cron | D1 |
| BE-15 | **Your verdicts** | Personal stats: votes cast, agreement with the crowd, favourite models, streak | M | M | D1 | D1 |
| BE-16 | **Position and style control** | Sides randomised and recorded; position term and length/markdown covariates in the fit; a "style controlled" toggle on the leaderboard | M | M | D1 (with BE-9) | D1 |
| BE-17 | **Edge arena: real streaming battles** | A battle mode between open models on Workers AI, streamed token by token into both panes over one SSE stream, with time to first token and tokens per second per model; rated on its own board | H | H | Workers AI, AI Gateway (optional), D1 | none (D1 for rating) |
| BE-18 | **Live arena** | A live ticker of votes and a leaderboard that updates in place over WebSockets | M | M | Durable Objects (hibernation) | none |
| BE-19 | **Share cards** | Open Graph image per shared battle rendered at the edge and cached | M | M | Workers (image rendering), R2 | R2 |
| BE-20 | **Status and metrics** | `GET /api/v2/status` (API, database and auth reachability, p50/p95 latency) and a public status page; internal metrics per route and model | M | M | Analytics Engine | none |
| BE-21 | **Open dataset** | Monthly anonymised export of the ledger (JSONL) with a dataset card | M | M | R2, Cron | R2 |
| BE-22 | **Data controls** | Export my data and delete my ledger rows from settings | M | M | D1, R2, Queues | D1, R2 |
| BE-23 | **Anonymous demo guard** | Turnstile on anonymous write paths (demo battles) | L | L | Turnstile | Turnstile widget + secret |
| BE-24 | **Fair pairing** | Weighted pairing so new models get matched enough and no model dominates the sample; sampling policy published | M | M | D1, KV | D1, KV |
| BE-25 | **Developer API keys + usage dashboard** | Create and revoke keys, use them on the public read API with higher per-key limits, see daily usage per key. Read scope only; no billing | M | H | KV (verdict cache), Queues (usage counting), Rate Limiting binding | none new (uses existing KV, Queue) |
| BE-26 | **Private arenas** | Your own prompt set (up to 200) and models, blind battles from it, a private board with honest intervals, unlisted share of the board; never feeds public stats | M | H | Rate Limiting binding | none |
| BE-27 | **Multi-turn battles** | Up to six turns with the same hidden pair, one vote on the conversation, rated on a separate multi-turn board | H | H | Workers (SSE pass-through) | none |
| BE-28 | **Model cards pages** | `/models/<slug>`: rating and rank spread, history, head-to-head, categories, price and latency, season awards, consented sample battles | H | M | Cache API, Workers (preview tags) | none |
| BE-29 | **Battle of the day, embed, replays** | One consented, curated battle per day on the home page and an archive, an `<iframe>` embed with oEmbed, replay at recorded pace | M | M | Workers (embed route, CSP), Cache API, R2 (BE-19 card) | none new |
| BE-30 | **Seasons and leagues** | Monthly frozen rating seasons, league boards (open weights, proprietary, free), hall of fame with published award rules | M | M | Cron Trigger (in the API repo's `cf-worker`), Cache API | none |
| BE-31 | **Cost-quality view** | Rating against price or measured latency, Pareto frontier, sourced prices with as-of dates, unknown shown as unknown | H | M | Cache API | none |
| BE-32 | **Profiles, badges and reputation** | Private-by-default profile with a handle, participation badges, optional minimal public page; reputation stays an internal integrity weight | L | M | Workers (preview tags) | none |
| BE-33 | **Prompt gallery** | Curated and moderated community prompts to start a battle from, categories, tags, try counts | M | M | Cache API | none |
| BE-34 | **Collections, exports, Hugging Face dataset** | Save battles into collections, export md/json/jsonl/csv, unlisted share; publish the BE-21 monthly export as a Hugging Face dataset with a generated card | M | H (A: M, B: L after BE-21) | GitHub Actions, R2 (read) | Hugging Face account and write token |

## 2. Waves

Ordered for value and so that nothing waits on Harsh longer than necessary. Account resources are requested once, up front (needs-harsh.md).

| Wave | Features | Why this order |
| --- | --- | --- |
| **W1: platform and quick wins** (no account resources) | BE-0, BE-1, BE-2, BE-3, BE-4, BE-5 | Fixes two contract problems immediately, gives every later feature its router, errors, auth, OpenAPI and tests |
| **W2: the ledger** (needs D1) | BE-6, BE-7, BE-8, BE-11 | Ends duplicate battles; starts collecting the data every analytics feature needs; history shows value within a day |
| **W3: honest rankings** | BE-9, BE-10, BE-14, BE-16, BE-12 | The statistical core: confidence intervals, integrity filtering, categories, and the rating change on reveal |
| **W4: showcase** | BE-17, BE-18, BE-20, BE-13 | Real streaming battles fully on Cloudflare, live updates, status page, moderation |
| **W5: people and data** | BE-15, BE-19, BE-21, BE-22, BE-23, BE-24 | Personal stats, share cards, open data, data controls |
| **W6: product features (poll picks)** | BE-28, BE-31, BE-33, BE-30, BE-25, BE-29, BE-32, BE-34, BE-26, BE-27 (in this order) | Public, cacheable features first (they only read data the earlier waves produce); the two features that change the battle core (BE-26, BE-27) last |

W6 dependencies (hard unless noted):

| Feature | Needs first | Soft |
| --- | --- | --- |
| BE-28 model cards | .NET safety PRs, baseline schema | BE-8, BE-9, BE-11, BE-12, BE-29, BE-31, BE-30 (each lights up one section) |
| BE-31 cost-quality | BE-9, api-repo-review M4 (`served_by`, tokens), BE-28 profiles | BE-12, BE-30 |
| BE-33 prompt gallery | .NET safety PRs | BE-13, BE-12, BE-21 scrubber, BE-32 |
| BE-30 seasons | BE-9 with a time window, BE-14, BE-28 profiles | BE-8, BE-12 |
| BE-25 API keys | BE-3, BE-4, BE-5, BE-6 | public routes from BE-8, BE-11, BE-28 |
| BE-29 battle of the day | consent on the share feature, BE-13 | BE-14, BE-19, BE-21, BE-22 |
| BE-32 profiles | scope decision, BE-15 | BE-14, BE-12, BE-27, BE-30, BE-33 |
| BE-34 collections / dataset | collections: validated votes, BE-22 / dataset: **BE-21**, BE-13, BE-14, BE-26 isolation | BE-12, BE-27 (row shape) |
| BE-26 private arenas | BE-6, baseline schema (so private votes can skip `elo_score`), BE-16 | BE-9, BE-13, BE-24, BE-33 |
| BE-27 multi-turn | BE-6, streaming `dualchat` (B-1), vote validation | BE-9, BE-16, BE-14, BE-10 |

Estimated total for W6: about 33 backend days and 25 web days.

## 3. Impact vs effort

```text
            low effort                     medium effort                       high effort
high   BE-8 history                  BE-6 idempotency, BE-7 ledger,       BE-9 ratings + CIs,
impact                               BE-10 rating change, BE-12 categories,  BE-17 streaming edge arena
                                     BE-14 integrity, BE-0 platform
medium BE-1 errors, BE-3 limits,     BE-13 moderation, BE-15 your verdicts,
impact BE-4 cache, BE-5 API docs,    BE-16 style control, BE-18 live,
       BE-11 head-to-head,           BE-19 share cards, BE-20 status,
       BE-33 prompt gallery          BE-21 dataset, BE-22 data controls,
                                     BE-24 fair pairing, BE-29 battle of the day,
                                     BE-30 seasons, BE-32 profiles*
low    BE-2 TTS fix, BE-23 Turnstile
```

The BE-25 to BE-34 features on the same grid (impact for a showcase project, not for growth):

```text
            low effort           medium effort                       high effort
high                             BE-28 model cards,                  BE-27 multi-turn battles
impact                           BE-31 cost-quality
medium      BE-33 prompt gallery BE-29 battle of the day,            BE-25 API keys,
impact      (seed + review)      BE-30 seasons                       BE-26 private arenas,
                                                                     BE-34 collections + dataset
low                              BE-32 profiles (scope conflict)
```

*BE-32 has low impact for a showcase and conflicts with the older "no public profiles" scope note; it sits last among the W6 features that are not blocked.

## 4. Rules for every backend PR

- Design doc first (`docs/backend/designs/BE-<n>-<slug>.md`): data model (SQL), endpoints (request, response, errors), auth, limits, privacy, failure modes, test plan.
- Additive D1 migrations only, numbered, applied to the preview database first; never a destructive change to production data.
- Tests: unit and integration on Miniflare, contract test against the generated OpenAPI, and for routes the web app uses, an end-to-end test through `wrangler dev`.
- No secrets in the repository; Worker secrets are set by Harsh with `wrangler secret put` and listed (names only) in `docs/architecture.md`.
- A route whose binding is missing answers `501` problem `not_enabled`, so code can merge before the resource exists.
- Update [docs/api/endpoints.md](../api/endpoints.md) (v2 section), the OpenAPI document and [the status log](../redesign/status.md).
