# BE-14: Vote integrity

Status: **design** (2026-10-22). Not built. Wave W2, rankings ([feature-roadmap.md](../feature-roadmap.md) section 0, "New wave order" item 3). Uses the [conventions for .NET features](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on the .NET safety PRs in [DualMind_Back](https://github.com/dualmindlabs/DualMind_Back): [#27](https://github.com/dualmindlabs/DualMind_Back/pull/27), [#28](https://github.com/dualmindlabs/DualMind_Back/pull/28), [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29), [#31](https://github.com/dualmindlabs/DualMind_Back/pull/31) and [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33) (all open, none merged on 2026-10-22). Feeds [BE-9](./BE-9-honest-ratings.md), [BE-11](./BE-11-head-to-head-matrix.md), [BE-8](./BE-8-leaderboard-history.md) and [BE-16](./BE-16-position-and-style-control.md): they read the `v_countable_votes` view defined here.

## 1. Summary

Today a vote is checked at the door (#28) and then trusted forever. BE-14 adds what the door cannot see: patterns over time. A scan job writes **flags** (too fast, bursts, one-sided voters, one voter dominating a model, prompts or answers that reveal which model is which, position skew). A flag either excludes the vote from ratings at once or waits for an admin to confirm it in a **review queue**. Ratings, head-to-head and history read only `v_countable_votes`. The rules, their versions and how many votes each removed are published on a dated **filter log**, so the board can say how it was cleaned.

## 2. Goals and non-goals

Goals: keep clearly bad votes out of every rating; never silently drop an honest voter's votes (each exclusion has a rule, a version and a reason, and can be reversed); make the rules tunable without a deploy (versioned rows, not constants); one choke point (`v_countable_votes`) so later features cannot forget the filter.

Non-goals: CAPTCHA or bot detection at the edge (BE-23, BE-3); moderating prompt content (BE-13); changing the legacy `elo_score` (its logic is not in the repository, api-repo-review 4.5, so the legacy number cannot honour exclusions; only BE-9 ratings do); reputation scores (BE-32 keeps reputation internal); machine-learning anomaly models.

## 3. What already exists, and what is left

| Concern | State | Where |
| --- | --- | --- |
| `voteChoice` whitelist (`left`, `right`, `tie`, `both-bad`) | Covered, 400 `INVALID_VOTE_CHOICE` | #28 |
| One vote per user per comparison | Covered twice: a read before the insert (409 `ALREADY_VOTED`) and the database constraint `model_votes_one_per_user` | #28, #31 (`0002_constraints.sql`) |
| Voter must own the comparison | Covered, 403 `COMPARISON_NOT_OWNED`. A comparison with a null `user_id` stays votable by any signed-in user (a choice noted in #28) | #28 |
| Unknown comparison, no `ex.Message` leak, encoded filters | Covered | #28, #30 |
| Votes on fallback answers | Not possible: such comparisons are not inserted | #29 |
| Comparison state | `comparisons.status` (`pending`, `complete`, `failed`, `fallback`), default `complete` | #33 (`0003`) |
| Sign-in on write routes | Covered | #27 |
| Vote atomicity | **Not covered.** Insert vote, set `is_revealed`, set `revealed_at` are three PostgREST calls (api-repo-review 4.5) | left |
| Flags, per-user signals, position-bias check, review queue, public filter log, a single "countable votes" definition | **Not covered** | this design |
| `vote_duration_ms` | Client-supplied, so it cannot be trusted as a signal. The server-measured delay (`voted_at` minus `comparisons.created_at`) is used instead | this design |

**Unverified:** whether the live database already has a unique vote constraint (0002 skips it when one exists), and the live definitions of `v_leaderboard` and `v_comparisons_masked` (the baseline in #31 is a reconstruction).

## 4. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| Tables, `v_countable_votes`, rules, scan job, admin queue, public filter log | **.NET API** | The votes are in the .NET database; exclusion has to be transactional with the rating input |
|  Hourly trigger | `cf-worker` Cron Trigger calling `POST /api/internal/jobs/integrity-scan` (convention 6), through the shared `hourly` route described in [BE-8](./BE-8-leaderboard-history.md) section 5.3 | The container can sleep; the Worker's cron already runs every 5 minutes (`cf-worker/wrangler.jsonc`). The scan is plain SQL plus light C#, so it does not need GitHub Actions (that is reserved for the fit in BE-9) |
| Cached public copy of the filter log | **Worker**, `GET /api/v2/integrity` (BE-4 pattern) | Public and cacheable |
| Review queue screen | **Web**, admin only | See section 9 |

## 5. User-visible behaviour

- Voters see nothing new. A flagged vote still shows the reveal; it is simply not counted. (BE-10 shows the estimate for every vote, flagged or not, because the voter cannot know.)
- The leaderboard methodology page gets a "How votes are cleaned" section: the active rules, their start dates and the share of votes excluded, from the filter log.
- Admins get a queue: open flags, newest first, filter by rule and severity, with the evidence and two buttons (confirm, dismiss).

## 6. Rules (version 1)

Thresholds are starting values to tune on real data (the database holds test data today). All live in `integrity_rules.params`.

| Rule | Subject | Signal | Severity | Effect |
| --- | --- | --- | --- | --- |
| `too_fast` | vote | `voted_at - comparison.created_at` under 3 s (review) or under 1 s (exclude) | review / exclude | exclude at once under 1 s; queue between 1 and 3 s |
| `burst` | voter | more than 30 votes in any 10 minutes | review | queue; counted until confirmed |
| `one_sided` | voter | at least 20 decisive votes in a week and one side at least 90% (a two-sided binomial test under 0.5 gives p below 1e-4) | review | queue; when confirmed, all that voter's votes in that week are excluded |
| `voter_dominance` | voter | one voter supplies more than 10% of a model's countable votes, with at least 50 votes on that model | review | queue |
| `identity_prompt` | comparison | prompt matches an identity pattern ("which model are you", "who made you", "what is your name", and a short list of variants) | review | queue; when confirmed, the votes on that comparison are excluded |
| `identity_answer` | comparison | an answer names a model or vendor that is not the side's own (for example "I am Claude" on a Llama side), from a list built from `ai_models` | review | same |
| `position_skew` | global | the left side wins more than 50% of decisive votes at a 99% interval, with at least 200 decisive votes, per selection mode (BE-16) | info | queue only: an alert about the product, not about a voter |
| `low_agreement` | voter | agreement with the current BE-9 consensus near 50% over at least 50 decisive votes on pairs whose ratings differ by 50 or more | info | signal only, never excludes (an honest dissenter looks the same) |

A flag with severity `exclude` excludes while its status is not `dismissed`. A flag with severity `review` excludes only when an admin sets `confirmed`. `info` never excludes.

## 7. API

All admin routes use the existing `AdminOnly` policy. Errors are problem+json with the slugs in [problems.md](../../api/problems.md); this feature adds none.

### 7.1 Admin (.NET)

| Method and path | Purpose |
| --- | --- |
| `GET /api/admin/integrity/flags?status=open&rule=&severity=&limit=&cursor=` | The queue, `{ items, nextCursor }` (convention 4) |
| `GET /api/admin/integrity/flags/{flagId}` | One flag with its evidence and, for a vote or comparison flag, the vote and comparison ids and the prompt (admins can already read comparisons through `/api/admin/comparisons`) |
| `POST /api/admin/integrity/flags/{flagId}/resolve` | `{ status: "confirmed" or "dismissed", note }`; 409 `conflict` if already resolved with a different status and `force` is not set |
| `POST /api/admin/integrity/votes/{voteId}/exclude` | Manual flag: `{ reason }`, creates a `vote` flag with rule `manual`, severity `exclude` |
| `GET /api/admin/integrity/voters/{userId}` | The voter's weekly signals and flags |
| `POST /api/admin/integrity/rules/{rule}` | New rule version: `{ severity, params, enabled, note }`. Never edits an old version |

```ts
// contract/integrity.ts (proposed; zod 4, as in contract/leaderboard.ts)
export const integrityRuleSchema = z.enum(['too_fast','burst','one_sided','voter_dominance',
  'identity_prompt','identity_answer','position_skew','low_agreement','manual']);
export const flagStatusSchema = z.enum(['open','confirmed','dismissed']);
export const flagSeveritySchema = z.enum(['info','review','exclude']);

export const flagSchema = z.object({
  flagId: z.uuid(),
  subject: z.enum(['vote','comparison','voter','global']),
  rule: integrityRuleSchema,
  ruleVersion: z.number().int().min(1),
  severity: flagSeveritySchema,
  status: flagStatusSchema,
  voteId: z.uuid().nullable(), comparisonId: z.uuid().nullable(), userId: z.uuid().nullable(),
  evidence: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(), reviewNote: z.string().max(500).nullable(),
});
export const resolveFlagRequestSchema = z.object({
  status: z.enum(['confirmed','dismissed']),
  note: z.string().trim().max(500).optional(),
  force: z.boolean().optional(),
});
export const excludeVoteRequestSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export const ruleVersionRequestSchema = z.object({
  severity: flagSeveritySchema, enabled: z.boolean(),
  params: z.record(z.string(), z.number()), note: z.string().trim().min(3).max(500),
});
```

### 7.2 Public filter log

`GET /api/integrity/log` (anonymous, `[AllowAnonymous]`), and the Worker copy `GET /api/v2/integrity` (fresh 10 minutes, stale 1 hour, ETag):

```ts
export const integrityLogSchema = z.object({
  asOf: z.iso.datetime(),
  totals: z.object({ votes: z.number().int(), countable: z.number().int(), excluded: z.number().int() }),
  rules: z.array(z.object({
    rule: integrityRuleSchema, version: z.number().int(), since: z.iso.datetime(),
    severity: flagSeveritySchema, description: z.string(), excludedVotes: z.number().int(),
  })),
});
```

No user id, vote id or prompt text appears in it. Rule `params` are published (the thresholds), because hiding them gains nothing against a determined attacker and the dated log is the point.

### 7.3 Internal (.NET, shared-secret header, never public)

`POST /api/internal/jobs/integrity-scan` (body empty; period key `YYYY-MM-DDTHH` UTC; idempotent through `job_runs`). Responds `{ periodKey, status: "done" or "skipped", flagsCreated, votesScanned }`. The route needs `X-Job-Secret` to match the `JOB_SHARED_SECRET` setting (constant-time compare) and is otherwise 404. The Worker should also refuse `/api/internal/` on external requests (the `scheduled` handler reaches the container directly through `container.fetch`, so it does not pass the public `fetch` handler). **Not verified in code:** the current `fetch` handler forwards every path (`cf-worker/src/index.js`); the refusal is part of this feature's Worker change.

### 7.4 The vote path (small change)

`RecordVoteByChoiceAsync` keeps its behaviour. The three writes become one SQL function, `record_vote(...)`, called through `Rpc` (convention 5), so the vote, `is_revealed` and `revealed_at` succeed or fail together and the duplicate check is the unique constraint itself (SQLSTATE 23505 maps to the same 409 as in #28). The response is unchanged here; BE-10 extends it.

## 8. Data model (migration `0004_vote_integrity`)

Numbering continues after #31 (`0001`, `0002`) and #33 (`0003`). The numbers are reserved by [the Wave W2 table](./README.md#wave-w2-rankings-be-14-be-9-be-10-be-8-be-11-be-16); if the build order changes, renumber on merge, because the Migrations workflow applies files in name order.

`database/migrations/0004_vote_integrity.sql`:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.job_runs (               -- shared by every job (convention 6)
    name        text        NOT NULL,
    period_key  text        NOT NULL,
    status      text        NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed','skipped')),
    started_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    detail      jsonb,
    PRIMARY KEY (name, period_key)
);

CREATE TABLE IF NOT EXISTS public.integrity_rules (
    rule        text        NOT NULL,
    version     integer     NOT NULL CHECK (version >= 1),
    severity    text        NOT NULL CHECK (severity IN ('info','review','exclude')),
    enabled     boolean     NOT NULL DEFAULT true,
    params      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    description text        NOT NULL,
    note        text,
    since       timestamptz NOT NULL DEFAULT now(),
    created_by  uuid        REFERENCES public.users (user_id) ON DELETE SET NULL,
    PRIMARY KEY (rule, version)
);

CREATE TABLE IF NOT EXISTS public.vote_flags (
    flag_id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    subject       text        NOT NULL CHECK (subject IN ('vote','comparison','voter','global')),
    vote_id       uuid        REFERENCES public.model_votes (vote_id) ON DELETE CASCADE,
    comparison_id uuid        REFERENCES public.comparisons (comparison_id) ON DELETE CASCADE,
    user_id       uuid        REFERENCES public.users (user_id) ON DELETE CASCADE,
    rule          text        NOT NULL,
    rule_version  integer     NOT NULL,
    severity      text        NOT NULL CHECK (severity IN ('info','review','exclude')),
    status        text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','confirmed','dismissed')),
    evidence      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key    text        NOT NULL UNIQUE,           -- for example 'too_fast:<vote_id>', 'burst:<user_id>:<hour>'
    created_at    timestamptz NOT NULL DEFAULT now(),
    reviewed_by   uuid        REFERENCES public.users (user_id) ON DELETE SET NULL,
    reviewed_at   timestamptz,
    review_note   text,
    CHECK (  (subject = 'vote'       AND vote_id IS NOT NULL)
          OR (subject = 'comparison' AND comparison_id IS NOT NULL)
          OR (subject = 'voter'      AND user_id IS NOT NULL)
          OR (subject = 'global') ),
    FOREIGN KEY (rule, rule_version) REFERENCES public.integrity_rules (rule, version)
);
CREATE INDEX IF NOT EXISTS vote_flags_open_idx    ON public.vote_flags (status, created_at DESC);
CREATE INDEX IF NOT EXISTS vote_flags_vote_idx    ON public.vote_flags (vote_id)       WHERE subject = 'vote';
CREATE INDEX IF NOT EXISTS vote_flags_cmp_idx     ON public.vote_flags (comparison_id) WHERE subject = 'comparison';
CREATE INDEX IF NOT EXISTS vote_flags_voter_idx   ON public.vote_flags (user_id)       WHERE subject = 'voter';

CREATE TABLE IF NOT EXISTS public.voter_signals (          -- internal, never exposed
    user_id        uuid    NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    week_start     date    NOT NULL,
    votes          integer NOT NULL,
    decisive_votes integer NOT NULL,
    left_share     numeric(5,4),
    fast_votes     integer NOT NULL DEFAULT 0,
    median_delay_ms integer,
    max_votes_10m  integer,
    consensus_agreement numeric(5,4),                       -- null until BE-9 has a run
    PRIMARY KEY (user_id, week_start)
);

-- The one definition of "a vote that may enter a rating". Later features (BE-26 arenas, BE-27 multi-turn)
-- add their own conditions here, so no consumer can forget them.
CREATE OR REPLACE VIEW public.v_countable_votes WITH (security_invoker = true) AS
SELECT v.vote_id, v.user_id, v.comparison_id, v.vote_choice, v.winner_model_id, v.voted_at,
       c.model1_id, c.model2_id, c.created_at AS comparison_created_at
FROM public.model_votes v
JOIN public.comparisons c ON c.comparison_id = v.comparison_id
WHERE c.status = 'complete'
  AND c.model1_id IS NOT NULL AND c.model2_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.vote_flags f
      WHERE f.status <> 'dismissed'
        AND (f.severity = 'exclude' OR (f.severity = 'review' AND f.status = 'confirmed'))
        AND (   (f.subject = 'vote'       AND f.vote_id       = v.vote_id)
             OR (f.subject = 'comparison' AND f.comparison_id = v.comparison_id)
             OR (f.subject = 'voter'      AND f.user_id       = v.user_id
                 AND (f.evidence->>'weekStart' IS NULL
                      OR date_trunc('week', v.voted_at)::date = (f.evidence->>'weekStart')::date)))
  );

-- Atomic vote: the vote, the reveal and the reveal time together (replaces three PostgREST calls).
CREATE OR REPLACE FUNCTION public.record_vote(
    p_comparison_id uuid, p_user_id uuid, p_choice text, p_duration_ms integer)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
    m1 uuid; m2 uuid; winner uuid; new_id uuid;
BEGIN
    SELECT model1_id, model2_id INTO m1, m2 FROM public.comparisons WHERE comparison_id = p_comparison_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'comparison not found' USING ERRCODE = 'P0002'; END IF;
    winner := CASE p_choice WHEN 'left' THEN m1 WHEN 'right' THEN m2 ELSE NULL END;
    INSERT INTO public.model_votes (user_id, comparison_id, winner_model_id, vote_choice, vote_duration_ms, voted_at, revealed_at)
    VALUES (p_user_id, p_comparison_id, winner, p_choice, p_duration_ms, now(), now())
    RETURNING vote_id INTO new_id;                          -- a second vote raises 23505 (model_votes_one_per_user)
    UPDATE public.comparisons SET is_revealed = true WHERE comparison_id = p_comparison_id;
    RETURN new_id;
END $$;

INSERT INTO public.integrity_rules (rule, version, severity, params, description) VALUES
  ('too_fast', 1, 'review', '{"reviewBelowMs":3000,"excludeBelowMs":1000}', 'Vote cast faster than a person can read two answers'),
  ('burst', 1, 'review', '{"votes":30,"windowMinutes":10}', 'Many votes in a short time'),
  ('one_sided', 1, 'review', '{"minDecisive":20,"share":0.9,"p":0.0001}', 'A voter who almost always picks the same side'),
  ('voter_dominance', 1, 'review', '{"share":0.1,"minModelVotes":50}', 'One voter supplies a large share of a model''s votes'),
  ('identity_prompt', 1, 'review', '{}', 'The prompt asks which model is answering'),
  ('identity_answer', 1, 'review', '{}', 'An answer names a model or vendor other than its own'),
  ('position_skew', 1, 'info', '{"minDecisive":200,"confidence":0.99}', 'One side wins more often than chance allows'),
  ('low_agreement', 1, 'info', '{"minDecisive":50,"minGap":50}', 'A voter who agrees with the consensus about as often as a coin flip'),
  ('manual', 1, 'exclude', '{}', 'Excluded by an admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.system_settings (key, is_enabled) VALUES ('be14_integrity', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.job_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_flags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voter_signals    ENABLE ROW LEVEL SECURITY;

COMMIT;
```

`database/migrations/0004_vote_integrity.down.sql`:

```sql
BEGIN;
DELETE FROM public.system_settings WHERE key = 'be14_integrity';
DROP FUNCTION IF EXISTS public.record_vote(uuid, uuid, text, integer);
DROP VIEW IF EXISTS public.v_countable_votes;
DROP TABLE IF EXISTS public.voter_signals;
DROP TABLE IF EXISTS public.vote_flags;
DROP TABLE IF EXISTS public.integrity_rules;
DELETE FROM public.job_runs WHERE name = 'integrity-scan';
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.job_runs) THEN DROP TABLE public.job_runs; END IF;
END $$;
COMMIT;
```

The rollback keeps `job_runs` when another job already wrote to it. Neither file has been executed; the build PR's Migrations workflow (the `postgres:16` job from #31: up, smoke, down, up, up) is the proof, and the smoke file gains the checks in section 12. The `weekStart` condition in the view limits a confirmed `one_sided` flag to the week it was raised for.

## 9. Design

**Scan job.** Watermark: votes with `voted_at` after the last finished scan, minus 24 hours of overlap for windowed rules (`dedupe_key` makes the overlap harmless). Each rule is a small class (`IIntegrityRule`) with a pure `Evaluate` over a batch, so tests need no database. The rules read their `params` from the newest enabled `integrity_rules` row. Flags are inserted with `ON CONFLICT (dedupe_key) DO NOTHING`. The job also upserts `voter_signals` for the current week and writes one `job_runs` row per hour.

**Server delay.** `too_fast` uses `voted_at - comparisons.created_at`. `dualchat` logs the comparison after both answers arrive and before the response is sent (`ComparisonLogger`, api-repo-review 2.3), so the delay is slightly longer than the reader's time. That errs on the safe side: it never flags a vote that was actually slow. Votes on a replayed battle (BE-6, #33) use the first `created_at`, which is correct.

**Identity rules.** `identity_answer` uses a list of names and vendors built from `ai_models.model_name`, `display_name` and `provider_name`, matched case-insensitively on word boundaries. A model that mentions its own name is fine; a side that names a different model, or both sides naming the same, is flagged. False positives are expected (a question about Claude's pricing), which is why the severity is `review`.

**Position skew.** Needs the selection mode and the randomisation facts from [BE-16](./BE-16-position-and-style-control.md). The code today shows why it matters: in `topper` mode `LeaderboardModelSelector` returns the top model first, and `dualchat` treats the first model as the left side, so the strongest model is always on the left in that mode and a left-side skew in aggregate is expected, not a fault. Until BE-16 records the mode, the rule runs on all votes and the alert text says so.

**Exclusion consumers.** BE-9, BE-11 and BE-8's rating-run snapshots read `v_countable_votes`. The legacy `v_leaderboard` and the `model-stats` endpoint do not (their Elo logic is outside the repository), so until BE-9 is the displayed number, the old board does not honour exclusions. The methodology page says so.

**Atomic vote.** `record_vote` is called through `Rpc`. If the function is missing (migration not applied), the .NET code falls back to the three-call path of #28, so the code can merge before the migration.

## 10. Privacy and abuse

Flags and signals carry `user_id`, so they are admin-only (never in a public payload, convention 7). The public log has counts only. Flags cascade-delete with the user. Retention: resolved flags and `voter_signals` are kept 12 months, then deleted by the daily job. Abuse of the queue: only `AdminOnly`; every resolution stores `reviewed_by`, `reviewed_at` and a note. Attackers who learn the thresholds can stay under them: the dominance and agreement rules and the exclusion of whole voter-weeks are the answer, plus the rate limits in BE-3 and sign-in from #27. This design does not claim to stop a patient attacker with many accounts.

## 11. Dependencies

Hard: #28 and #31 (validation and the vote uniqueness the function relies on), #33's `0003` (`comparisons.status`, which the view reads; if `0003` is not applied the view creation fails, so apply it first), #27 (sign-in), the job route and secret from convention 6 (`JOB_SHARED_SECRET`, a `cf-worker` deploy with a new cron expression, both need Harsh's go). Soft: BE-16 (selection mode for position skew), BE-9 (agreement signal), BE-3.

## 12. Test plan

- Unit, per rule on fixtures: `too_fast` at 0.9 s, 1 s, 2.9 s, 3 s; `burst` at 30 and 31 votes in 10 minutes and across the window edge; `one_sided` at 19 and 20 decisive votes, 89% and 90%, ties and both-bad not counted; `voter_dominance` below the 50-vote floor; identity prompts (positive and near-miss); identity answers (own name allowed, other name flagged, vendor names); `position_skew` interval at the edge; `low_agreement` never excludes.
- Idempotency: running the scan twice for one hour creates no second flag; an overlap window creates no duplicate; `job_runs` blocks a concurrent second run.
- View (Postgres in CI): a vote with an `exclude` flag is absent; a `review` flag is present until confirmed, absent after, present again after dismiss; a `voter` flag with `weekStart` removes only that week; a `comparison` flag removes every vote on it; `status <> 'complete'` rows are absent; both-bad votes are present (BT drops them, not the view).
- `record_vote`: success sets the three fields; a second call raises 23505; an unknown comparison raises P0002; the .NET mapping gives 409 and 404 exactly as in #28 (the existing #28 tests run against both paths).
- Admin routes: non-admin 403; resolve twice; `force`; pagination cursor stable under inserts; the manual exclude creates a `manual` flag.
- Public log: totals add up (`countable + excluded = votes`), no ids in the payload (a schema test that rejects extra keys).
- Migration: `0004` up, smoke, down, up, up on `postgres:16`; the rollback leaves `job_runs` when it holds another job's row.
- Contract: the OpenAPI document and the zod schemas parse the same examples.

## 13. Rollout

Flag `be14_integrity` (a `system_settings` row, default off, read through `SystemSettingsService` with the 30 second cache, convention 8; #33 already reads `be6_idempotency` the same way). With the flag off the scan job exits at once and `v_countable_votes` still exists but holds no flags, so it equals "all complete votes". Steps: merge the code; Harsh applies `0004` to a Supabase branch first, then live; deploy the `cf-worker` cron change; turn the flag on in **shadow mode** for one week (flags are written as `info` severity, nothing is excluded) and review the queue; then enable real severities. Kill switch: flag off stops the scan; existing flags can be bulk-dismissed with one admin call. Rollback of data: `0004.down.sql`.

## 14. Effort and impact

Effort **M**: about 3 days backend (rules, scan job, `record_vote`, admin routes, filter log, tests) and 1.5 days web (admin queue page, methodology section). Impact **H**: every rating after this reads cleaner input, and the public filter log is a credibility feature few leaderboards have. Estimates, not commitments.

## 15. Open questions for Harsh

1. Shadow week first (proposed), or enforce `exclude` severities from day one?
2. Thresholds (3 s and 1 s, 30 votes in 10 minutes, 90% one side): acceptable starting points, given there is only test data to tune on?
3. Comparisons with a null `user_id` stay votable by anyone (#28). Close that after the old rows age out, or never?
4. Admin queue: an API only for now, or a page in the web app in this wave? (**Unverified:** the web repository has no admin UI that this could extend.)
5. May the filter log publish the rule thresholds (proposed), or only the rule names and counts?
