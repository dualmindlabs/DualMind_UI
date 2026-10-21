# BE-27: Multi-turn battles (rated as conversations)

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on BE-6 (battle created up front), B-1 streaming `dualchat` ([new-features.md](../../redesign/new-features.md), api-repo-review 5.3 and 5.4 #10), BE-9, BE-14, BE-16.

## 1. Summary

A battle can continue for up to six turns: the same two anonymous models answer each follow-up with the conversation so far as context, and the user casts **one** vote on the whole conversation. The vote is rated on a separate **multi-turn board**, so the single-turn leaderboard is not mixed with a different kind of task.

Why: real use is conversational; models that win one-shot prompts can lose a follow-up (forgetting, repeating, drifting). Arena runs multi-turn conversations as part of its text arena data (research.md part 1, Search Arena: 24k+ multi-turn conversations); DualMind today rates one turn only.

## 2. Goals and non-goals

Goals: keep the pair fixed and blind through all turns; give each model only **its own** earlier answers as history; one vote per conversation; separate rating board; failures handled honestly (a conversation where a model failed is void, never relabelled); cost caps.

Non-goals: per-turn ratings (stored as optional signal, not rated, section 6); letting the user swap models mid-conversation; system prompts or tools; images; long-context stress tests beyond the cap; agents.

## 3. Which side builds it (ADR 0008)

**.NET API**: battles, turns, votes and ratings are stateful data, and the model calls happen in `ArenaController` today ([api-repo-review.md](../api-repo-review.md) 3.1: `dualchat`, `chat/stream`). The **Worker** only gains limiter classification (a turn is a `battle` group call) and the SSE pass-through if turns stream (already needed for B-1). **Web** adds the conversation composer to the battle view.

Today `ChatRequest` carries one `Prompt` and an optional `ThreadId` (`AI/Contracts/ChatRequest.cs`) and no history, and `ComparisonLogger` writes one `comparisons` row with one prompt and two responses per call. Multi-turn therefore needs a new turn table, not a change of meaning of the existing columns.

## 4. User-visible behaviour

- After the two answers, the composer says "Continue the conversation" (turns 2 to 6) or "Vote now". The vote button stays available at every turn; a conversation with only one turn is a normal single-turn battle (and is rated on the single-turn board).
- Both panes keep showing the full thread; model names stay hidden until the vote.
- If a model fails on a later turn the user sees "This battle can't be rated because one model failed. Your vote isn't needed" and can start again; no fake answer is shown.
- After the vote: the reveal and (BE-10) the rating change, on the multi-turn board.
- The leaderboard gains a "Multi-turn" tab (a board per `battle_kind`).

## 5. API (.NET)

New endpoints at the battle-first shape proposed in api-repo-review 5.3 (`dualchat` stays as a wrapper for single turn):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/arena/battles` | create a battle `{ kind: "multi" | "single", models?, selectionMode?, prompt }` and run turn 1; `Idempotency-Key` required |
| `POST` | `/api/arena/battles/{comparisonId}/turns` | add a turn `{ prompt }`; `Idempotency-Key` required; 409 if already voted or at 6 turns |
| `GET` | `/api/arena/battles/{comparisonId}` | the conversation (blind until voted) |
| `POST` | `/api/arena/model-vote` | unchanged name; one vote per `comparisonId`; response as BE-10 |

Streaming variant: `POST .../turns` with `Accept: text/event-stream` emits the B-1 events (`meta`, per-side `delta`, `done`, `error`, `complete`) with `turnIndex` added.

Turn response (non-streaming):

```json
{
  "comparisonId": "6f1c...",
  "turnIndex": 2,
  "turnsLeft": 4,
  "status": "open",
  "agentA": { "text": "...", "timeMs": 1900, "tokens": 211 },
  "agentB": { "text": "...", "timeMs": 2600, "tokens": 340 },
  "contextTruncated": false
}
```

`status` is `open`, `void` (a side failed or fell back), or `voted`. Errors: `validation_error` (prompt empty or over 4000 characters), `conflict` (voted, or turn limit, or a retried key with another body), `not_found`, `rate_limited`, `unprocessable_content` (BE-13 rejection of the new prompt, proposed slug), `bad_gateway` problem when both providers fail (no row is rated).

## 6. Data model (proposed, additive)

```sql
alter table comparisons
  add column battle_kind text not null default 'single' check (battle_kind in ('single','multi')),
  add column turn_count  int  not null default 1;

create table battle_turns (
  comparison_id  uuid not null references comparisons on delete cascade,
  turn_index     int  not null check (turn_index between 1 and 6),
  prompt_text    text not null,
  model1_response text, model2_response text,
  model1_time_ms int, model2_time_ms int,
  model1_tokens  int, model2_tokens int,         -- BE-16 / api-repo-review M4 columns, same meaning
  status         text not null default 'complete' check (status in ('pending','complete','failed','fallback')),
  context_truncated boolean not null default false,
  idempotency_key text,
  created_at     timestamptz not null default now(),
  primary key (comparison_id, turn_index),
  unique (comparison_id, idempotency_key)
);
```

`comparisons.prompt_text` and the response columns keep **turn 1** (so every existing reader, the admin routes and `thread_messages` keep working). Turns 2 to 6 live only in `battle_turns`; turn 1 is also copied there so one query reads the whole conversation. `thread_messages` (which already has `comparison_id` and `position`, api-repo-review 2.2) gets one row per turn so thread history and sharing show the full conversation. RLS on `battle_turns` with no policies. Rollback: drop the table and the two columns.

An optional per-turn leaning (which side the user preferred so far) is not stored in v1; open question 2.

## 7. Design

### 7.1 Context each model receives

For turn *n*, model 1 gets `[user_1, model1_answer_1, ..., user_n]` and model 2 gets its own history. Neither sees the other's answers (otherwise models could copy or respond to each other and the comparison is contaminated). A token budget of 8,000 tokens per model per turn (open question 1): if exceeded, the **oldest** turns are dropped from both sides equally (so neither model is disadvantaged) and `context_truncated` is set; the UI shows a note. Token counts use each provider's reported usage when available, else a character estimate documented as such.

### 7.2 Fixed pair, side recorded

The pair and sides are chosen at turn 1 and stored (`left_is_model1`, BE-16). The same fair-pairing rules (BE-24) apply at creation; multi-turn adds nothing to pair selection.

### 7.3 Failure rules (no fake data)

If either model fails or times out on a turn, the whole turn is `failed`, the conversation becomes `void` (not rated, not counted), and no fallback model is substituted (api-repo-review 4.6 A and 5.4 #3). A turn is never retried by the server silently; the client may repeat with the same `Idempotency-Key`, which returns the stored result or re-runs only a `pending` turn.

### 7.4 Rating

One vote per conversation is one observation in the multi-turn Bradley-Terry fit (BE-9 filtered on `battle_kind = 'multi'`), with a covariate for turn count so longer conversations can be inspected. Voting at turn 1 on a `multi` battle counts as single-turn. Minimum 2 turns for the multi-turn board: a `multi` battle voted at turn 1 is rated as `single` (the column is updated at vote time in the same transaction), so the multi-turn board only contains real multi-turn data. The multi-turn board starts as "preliminary" for every model until it has at least 100 conversations (open question 3).

### 7.5 Integrity

BE-14 rules apply with one change: the "too fast" threshold scales with turns and reading length. Votes before the last answer finishes streaming are rejected (`conflict`, `detail: "answers still streaming"`; the client sends `voteDurationMs` already).

## 8. Privacy and abuse

Conversations are user content like single battles: private to the user unless the thread is shared (`threads.visibility`), included in the open dataset only under BE-21 consent rules, with the **turn array** as the conversation field. Abuse: multi-turn doubles to 12 provider calls per conversation, so limits are per **turn**: the BE-3 `battle` group counts each `POST .../turns`, plus a daily cap of 150 turns per user (proposal). Prompt moderation (BE-13) runs on every turn. Context stuffing (very long prompts) is capped by the prompt limit and the 8,000-token budget.

## 9. UI screens

Battle view (`web/src/features/...` arena, the app shell route; [design-direction.md](../../redesign/design-direction.md) section on reading two answers): a composer under the panes, a turn counter ("Turn 2 of 6"), a "Vote now" bar, the streaming states from the battle state machine (ADR 0004: the web already owns a battle state machine; it gains a follow-up state between "answered" and "voting"; the exact state names are in `web/src/features` and ADR 0004). Leaderboard page: tab "Multi-turn". Share page (`/share/:threadId`) renders every turn.

## 10. Dependencies

Hard: BE-6 (create first, idempotency), B-1 streaming `dualchat` (optional but strongly preferred, because six sequential non-streamed turns make long waits), vote validation PR (api-repo-review 5.4 #2), baseline schema. Soft: BE-9 and BE-16 (the board and side recording), BE-13, BE-14, BE-10, BE-24.

## 11. Effort and impact

Effort **H**: about 5 days backend (turn table, context builder with truncation, void rules, vote path change, rating filter) and 3 days web (follow-up state, streaming per turn, board tab). Impact **H**: it is the main correctness upgrade of the arena and a clear differentiator from one-shot comparisons.

## 12. Test plan

- Unit: context builder (own history only, truncation drops oldest equally on both sides, flag set), turn limit, state transitions (open, void, voted), vote after void rejected, `battle_kind` flip when voted at turn 1.
- Provider fakes: model 2 fails on turn 3, timeout, fallback marker; the conversation is void and no row enters ratings; model identity never changes mid-conversation.
- Idempotency: replaying a turn with the same key returns the stored turn; two concurrent turn requests with different keys yield one 409.
- Integration: migration up and down; `thread_messages` has one row per turn with consistent `position` (api-repo-review notes the position race: the turn writer uses the `UNIQUE (thread_id, position)` from M7).
- Rating: fixtures where model A wins turn-1-only and loses multi-turn show different ranks on the two boards.
- Contract: OpenAPI, SSE event schema with `turnIndex`.
- E2E (Playwright, mock adapter): three turns, void state, vote, reveal.

## 13. Rollout

Flag `be27_multi_turn`, default off; only visible after the single-turn streaming battle is stable. Preview with test data; migration needs Harsh's go. The multi-turn board is hidden until it has enough conversations. Kill switch: flag off hides the follow-up composer; stored conversations remain readable.

## 14. Open questions for Harsh

1. Context budget (8,000 tokens per model) and turn limit (6): more turns cost more provider calls. OK?
2. Store a per-turn "who is ahead" signal (not rated) for later analysis, or one vote only?
3. Preliminary threshold for the multi-turn board (100 conversations proposed) and whether it may ever be merged into the main score (proposal: never).
4. Should the user be allowed to keep chatting after voting (unrated continuation), or end the conversation at the vote?
