# BE-26: Private arenas (your own prompt sets and private boards)

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on BE-6 (battle created up front, idempotency), BE-9 (rating fit), BE-13 (moderation), BE-24 (pairing). Related: [BE-33](./BE-33-prompt-gallery.md) (import prompts from the gallery), [BE-34](./BE-34-collections-exports-dataset.md) (export).

## 1. Summary

A signed-in user creates a **private arena**: a named set of their own prompts (up to 200) and a chosen set of models (2 to 8). They run blind battles from that set, vote as in the public arena, and get a **private board** that ranks the chosen models on **their** prompts. Nothing from a private arena reaches the public leaderboard, the public ratings, the open dataset, the battle of the day or the prompt gallery.

Why: the public board answers "which model is best on average"; a person choosing a model for their own work wants "which is best on my kind of prompt". This is the Open Model Arena idea in [research.md](../research.md) (part 1, section 8: blind battles on your own prompts and models, private Elo board).

## 2. Goals and non-goals

Goals: prompt sets with import and export; blind battles drawn from the set; a board with honest uncertainty at small sample sizes; per-prompt results; an unlisted read-only share link for the board; strict isolation from public statistics.

Non-goals: team arenas or shared editing (single owner); public arenas (public boards are the main leaderboard); bring-your-own provider keys (api-repo-review 2.3 shows provider keys are encrypted with a fallback default secret, so storing user keys is a separate security project); automatic judging by an LLM (possible later as a "judge" vote source, not in scope); running a whole set in one click (cost, see 8).

## 3. Which side builds it (ADR 0008)

**.NET API**, because arenas, prompts, battles and votes are stateful product data tied to `users`, `comparisons` and `model_votes`, and the board is computed from them. The **Worker** only adds the BE-3 limiter classification for the new routes and no caching (private, per-user data is never cached at the edge). **Web** builds the screens.

## 4. User-visible behaviour

1. Create an arena: name, optional description, pick models from the active model list (`GET /api/models`), paste or upload prompts (one per line, or CSV with `prompt,tag`), or import from the gallery.
2. "Next battle" draws a prompt (default: the least-used prompt; options: random, in order) and a model pair (fewest battles first, then random), runs both models, and shows two anonymous answers. The user votes (left, right, tie, both bad) as in the main arena and sees the reveal.
3. The board tab shows each model's rating, an interval, wins, ties, losses and battles. With fewer than 30 battles for a model it says "too few battles to rank" and shows the raw record only (section 7.3).
4. The prompts tab shows, per prompt, how each model did.
5. "Share board" creates an unlisted link that shows the board and the model records, **never prompt text or answers** unless the owner ticks "include prompts" (default off).
6. Delete arena removes prompts, battles, votes and shares (section 9).

## 5. API (.NET, `/api/arenas/...`, Bearer JWT)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/arenas` | create; `Idempotency-Key` |
| `GET` | `/api/arenas?cursor&limit` | my arenas (`{ items, nextCursor }`) |
| `GET` / `PATCH` / `DELETE` | `/api/arenas/{arenaId}` | read, rename or change models, delete |
| `POST` | `/api/arenas/{arenaId}/prompts` | add one or many (JSON array, at most 200 per request); response lists accepted and rejected with reasons |
| `GET` | `/api/arenas/{arenaId}/prompts?cursor` | list with per-prompt battle counts |
| `DELETE` | `/api/arenas/{arenaId}/prompts/{promptId}` | remove (battles keep a copy of the text) |
| `POST` | `/api/arenas/{arenaId}/battles` | next battle; `Idempotency-Key` required; body `{ promptId?, pairing?: "balanced" | "random" }` |
| `GET` | `/api/arenas/{arenaId}/battles/{comparisonId}` | the battle (blind until voted) |
| `GET` | `/api/arenas/{arenaId}/board?minBattles=30` | board |
| `GET` | `/api/arenas/{arenaId}/export?format=csv\|json` | prompts, battles and votes |
| `POST` / `DELETE` | `/api/arenas/{arenaId}/share` | create or revoke the unlisted link `{ token, includePrompts }` |
| `GET` | `/api/shared-arenas/{token}` | anonymous, read-only board |

Votes use the existing `POST /api/arena/model-vote` with the `comparisonId`; the vote path reads `comparisons.arena_id` and applies the private rules (no public rating write).

`POST .../battles` response (blind):

```json
{
  "comparisonId": "6f1c...",
  "arenaId": "a3b9...",
  "promptId": "c1d2...",
  "prompt": "Summarise this contract clause in two sentences: ...",
  "agentA": { "text": "...", "timeMs": 2100 },
  "agentB": { "text": "...", "timeMs": 3400 },
  "remainingToday": 42
}
```

Board response:

```json
{
  "arenaId": "a3b9...", "methodology": "bt-v1", "battles": 87, "minBattles": 30, "generatedAt": "2026-10-21T10:05:00Z",
  "items": [
    { "modelId": "...", "displayName": "Model X", "rating": 1042, "ciLow": 987, "ciHigh": 1101, "wins": 21, "ties": 4, "losses": 9, "battles": 34, "rank": 1, "ranked": true }
  ]
}
```

Errors: `validation_error` (more than 200 prompts, prompt length outside 5 to 4000 characters, fewer than 2 models), `not_found` (also for another user's arena, so ids cannot be probed), `conflict` (idempotency reuse; vote already cast), `rate_limited` (BE-3 `battle` group applies to `/battles`), `unprocessable_content` (proposed slug, 422: a prompt failed moderation, with `errors[]`), `quota_exceeded` (proposed, daily battle cap).

## 6. Data model (proposed, additive)

```sql
create table arenas (
  arena_id     uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references users(user_id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  description  text check (char_length(description) <= 500),
  created_at   timestamptz not null default now(),
  archived_at  timestamptz,
  idempotency_key text,
  unique (owner_id, idempotency_key)
);
create table arena_models (
  arena_id uuid references arenas on delete cascade,
  model_id uuid references ai_models,
  primary key (arena_id, model_id)
);
create table arena_prompts (
  prompt_id  uuid primary key default gen_random_uuid(),
  arena_id   uuid not null references arenas on delete cascade,
  text       text not null check (char_length(text) between 5 and 4000),
  text_hash  bytea not null,                      -- dedupe inside one arena
  tag        text,
  source_gallery_id uuid,                         -- BE-33, nullable
  created_at timestamptz not null default now(),
  unique (arena_id, text_hash)
);
create table arena_shares (
  token text primary key,                         -- 128-bit random, base64url
  arena_id uuid not null references arenas on delete cascade,
  include_prompts boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table comparisons
  add column arena_id uuid references arenas on delete cascade,
  add column arena_prompt_id uuid references arena_prompts on delete set null;
create index comparisons_arena on comparisons (arena_id, created_at desc) where arena_id is not null;
```

All four new tables: row-level security on, no policies. Rollback: drop the two `comparisons` columns and the four tables. Deleting an arena cascades to its `comparisons`; `model_votes` must cascade from `comparisons` (verify the existing foreign key in the baseline schema, api-repo-review M1, before relying on it; if it does not cascade, the delete function removes votes first).

**The isolation rule:** every public statistic, rating run, snapshot, integrity job, dataset export and featured-battle selection filters `comparisons.arena_id is null`. This is a one-line condition in each of BE-8, BE-9, BE-11, BE-12, BE-14, BE-21, BE-29; it is listed as a cross-cutting requirement in [README.md](./README.md#conventions-for-net-features-be-25-to-be-34) and gets its own test in each. Until BE-9 lands, `v_leaderboard` (api-repo-review 2.2: derived in Supabase, undocumented) may count private votes, so **BE-26 must not ship before the baseline schema (M1) shows how `elo_score` is updated and the vote path can skip it for `arena_id is not null`**.

## 7. Design

### 7.1 Battle creation

Same pipeline as the public battle (BE-6: id minted first, `Idempotency-Key`, provider calls with `servedBy` recorded, a fallback answer voids the battle instead of being recorded as the original model's). Prompt text comes from the arena, so the request carries only an id. The pair is chosen among `arena_models`; `balanced` picks the pair with the fewest battles in this arena (ties random), then randomises sides and records `left_is_model1` (BE-16 column).

### 7.2 Prompt moderation

BE-13 runs on each prompt at save time (not at battle time), so a bad prompt is rejected when added. If BE-13 is not live, a basic length and control-character check runs and the arena works with a notice that content checks are off. Prompts are the owner's content; they are never shown to anyone else without the share option.

### 7.3 Board maths

BE-9's Bradley-Terry fit is reused as a function over a set of battles with a filter `arena_id = X`, computed **on demand** (arena data is small, at most a few thousand battles) and cached for 60 seconds in memory per arena. Confidence intervals by bootstrap are too noisy below about 30 battles per model, so the response flags `ranked: false` below `minBattles` (default 30, owner can lower to 10) and gives only the record. Ties count as half a win, both-bad as a tie plus a separate counter, as the public method ([research.md](../research.md), recommendations). The methodology string is `bt-v1` and must equal BE-9's version.

### 7.4 Limits

10 active arenas per user, 200 prompts per arena, 8 models, 100 private battles per user per day (proposal; each costs two provider calls). The BE-3 `battle` limit (6 per 60 s) also applies.

## 8. Privacy and abuse

- Private by default and only: no "public" visibility exists. The unlisted link shows the board; prompt text only with the explicit toggle, and never answers.
- Prompts and answers of private arenas are **excluded** from the open dataset, the gallery, the battle of the day and model-card samples, always, with no opt-in. Aggregates (counts) may feed BE-20 internal metrics without text.
- Providers still receive the prompt text to answer it (the same disclosure as a normal battle); the arena page repeats it.
- Abuse: prompts can be used to launder spam or to extract data from models; BE-13 and the daily cap bound it. A user cannot create arenas around other users' data (no imports from other users' arenas).
- Retention and deletion follow BE-22; deleting the arena deletes its battles, votes and shares.
- Admin: admins can see arena metadata and counts but not prompt text without a recorded reason (open question 3).

## 9. UI screens

New routes in `web/src/app/routes/`: `/arenas` (list), `/arenas/new`, `/arenas/:arenaId` with tabs Run, Prompts, Board, Settings, and `/a/:token` (shared board, noindex). The Run tab reuses the battle view built in the redesign (the reveal and vote components; [design-direction.md](../../redesign/design-direction.md)); the board reuses the leaderboard table and interval display from BE-9's UI. Mobile: tabs become a segmented control.

## 10. Dependencies

Hard: BE-6 (battle created up front, idempotency), the baseline schema and vote validation from the first .NET PRs (api-repo-review 5.4 #1 to #3, #7, #8), BE-16 (side recorded). Soft: BE-9 (shared fit; before it lands the board can use a plain win-rate table with the same `ranked` rule), BE-13, BE-24, BE-22, BE-33 (import), BE-34 (export).

## 11. Effort and impact

Effort **H**: about 5 days backend, 4 days web. Impact **M**: strong product story ("test models on your work"), moderate reviewer value; the isolation rule is the risk.

## 12. Test plan

- Unit: pairing balance (fewest battles first, never the same model twice), prompt dedupe by hash, limits, board maths on fixtures with known answers (3 models, planted win rates, ties, both-bad), `ranked` flag boundary at 29 and 30.
- **Isolation tests**: a private vote does not change `model-stats`, `v_leaderboard`, rating runs, history snapshots, head-to-head, exports; a public run in the same database ignores `arena_id` rows. One test per consumer, in each consumer's PR.
- Authorisation: another user's arena, prompt, battle or share returns `404`; a revoked share returns `404`; the share never contains prompts unless set.
- Integration (scratch Postgres): migration up and down, cascade delete leaves no `comparisons` or `model_votes` rows.
- Contract: OpenAPI for all routes; idempotent battle create returns the same `comparisonId`.
- E2E: create an arena, add 3 prompts, run 2 battles with the mock adapter, see the board in "too few battles" state.

## 13. Rollout

Flag `be26_private_arenas`, default off; preview first; migration needs Harsh's go. Ship order: schema, CRUD and prompts, battles with the isolation rule and its tests, board, share link, export. Kill switch: flag off hides routes; data stays.

## 14. Open questions for Harsh

1. Daily private-battle cap (proposed 100 per user) and arena limits (10 arenas, 200 prompts, 8 models): fine?
2. Allow an LLM judge vote source later (cheaper than human votes, but a different kind of rating that must be labelled)?
3. Can admins read private prompt text for abuse handling, and under what record?
4. Should the share link be allowed to show prompts at all (default stays off)?
5. Bring-your-own provider key: a separate security project, or never?
