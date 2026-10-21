# BE-33: Prompt gallery (curated and community prompts)

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on BE-12 (categories), BE-13 (moderation), BE-21 (PII scrubber). Related: [BE-26](./BE-26-private-arenas.md) (import into an arena), [BE-29](./BE-29-battle-of-the-day-embed-replays.md) ("try this prompt").

## 1. Summary

A browsable library of prompts: a **curated** set written and reviewed by Harsh, and **community** prompts that users submit and an admin approves. Each has a title, category, tags and language. A visitor picks one and it fills the battle composer; a signed-in user can submit their own. Usage counts show what people actually try.

Why: a blank prompt box is the main friction in an arena, and the quality of the prompts sets the quality of the votes (Arena publishes category tags and prompt-level data for the same reason, research.md part 1.1). Curated prompts also let DualMind seed useful categories (coding, math, writing, reasoning) so category boards (BE-12) fill with intentional coverage.

## 2. Goals and non-goals

Goals: a safe, moderated library; browse by category, tag and search; "use this prompt" in one click with no account required to browse; submission with review; dedupe; reports and removal; seed set of about 60 curated prompts.

Non-goals: ratings or likes on prompts (a "tries" counter only); comments; user-uploaded files or images; prompt marketplaces or payments; automatic generation of prompts by an LLM (possible later as draft suggestions for the admin); sharing private arena prompts (BE-26 prompts never enter the gallery unless the owner re-submits them by hand).

## 3. Which side builds it (ADR 0008)

**.NET API**: prompts, submissions, review state and counters are stateful data, and moderation hooks live next to BE-13. The **Worker** caches the public list and detail routes (BE-4 pattern) and serves sitemap entries; **web** builds `/prompts`.

## 4. User-visible behaviour

- `/prompts`: grid of prompt cards (title, first 140 characters, category chip, language, "N tries"), filters (category, tag, language), search box, sort (popular, newest), curated badge on staff picks.
- Prompt page `/prompts/:promptId`: full text, "Use in a battle" (opens the arena composer pre-filled; stays editable), "Add to a private arena" (signed in, BE-26), "Report".
- "Submit a prompt" (signed in): text, optional title, category suggestion (auto-classified if BE-12's classifier is live, editable), tags, language. Result: "Thanks, a moderator will review it" and a My submissions list with status (pending, published, rejected with reason).
- Author credit: shown as "by @handle" only if the author has a public profile (BE-32) and ticks "credit me"; otherwise anonymous.

## 5. API (.NET)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/gallery/prompts?category=&tag=&language=&q=&sort=popular\|new&cursor&limit` | anonymous | list (`{ items, nextCursor }`) |
| `GET` | `/api/gallery/prompts/{promptId}` | anonymous | detail |
| `GET` | `/api/gallery/categories` | anonymous | categories with counts |
| `POST` | `/api/gallery/prompts` | Bearer | submit; `Idempotency-Key` required |
| `GET` | `/api/users/me/gallery-submissions` | Bearer | my submissions and states |
| `DELETE` | `/api/gallery/prompts/{promptId}` | author or `AdminOnly` | withdraw or remove |
| `POST` | `/api/gallery/prompts/{promptId}/report` | Bearer | `{ reason }` |
| `POST` | `/api/gallery/prompts/{promptId}/use` | anonymous (rate limited) | count a try (see 7.3) |
| `GET` | `/api/admin/gallery/queue?status=pending` | `AdminOnly` | review queue |
| `PATCH` | `/api/admin/gallery/prompts/{promptId}` | `AdminOnly` | `{ status, category?, tags?, rejectReason?, curated? }` |

Item:

```json
{
  "promptId": "9d3e...", "title": "Explain tail recursion", "text": "Explain tail recursion to a ten year old, then show a Python example.",
  "category": "coding", "tags": ["explain", "python"], "language": "en",
  "source": "curated", "curated": true, "tries": 128, "author": null, "publishedAt": "2026-10-22T08:00:00Z"
}
```

Submission request: `{ "text": "...", "title": "...", "tags": ["..."], "language": "en", "creditMe": false }`.

Errors: `validation_error` (text 10 to 2,000 characters; title up to 80; at most 5 tags of up to 24 characters; unknown language), `unprocessable_content` (proposed slug, 422: failed moderation or PII scrub, with `errors[]` naming the rule, never echoing the matched data), `conflict` (duplicate text: `detail` links to the existing prompt), `rate_limited` (BE-3 `write`), `quota_exceeded` (proposed: 3 submissions per day, 20 pending per user), `forbidden`, `not_found`.

## 6. Data model (proposed, additive)

```sql
create table gallery_prompts (
  prompt_id    uuid primary key default gen_random_uuid(),
  text         text not null check (char_length(text) between 10 and 2000),
  text_hash    bytea not null unique,                -- sha-256 of normalised text (lowercase, collapsed whitespace)
  title        text check (char_length(title) <= 80),
  category     text,                                 -- BE-12 category slug or 'other'
  tags         text[] not null default '{}',
  language     text not null default 'en',
  source       text not null check (source in ('curated','community')),
  curated      boolean not null default false,       -- staff pick
  author_id    uuid references users(user_id) on delete set null,
  credit_author boolean not null default false,
  status       text not null default 'pending' check (status in ('pending','published','rejected','removed')),
  reject_reason text,
  tries        int not null default 0,
  idempotency_key text,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  unique (author_id, idempotency_key)
);
create index gallery_listing on gallery_prompts (category, published_at desc) where status = 'published';
create table gallery_reports (
  report_id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references gallery_prompts on delete cascade,
  reporter_id uuid references users(user_id) on delete set null,
  reason text not null check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (prompt_id, reporter_id)
);
alter table comparisons add column source_gallery_id uuid references gallery_prompts on delete set null;
```

RLS on, no policies. Full-text search: a generated `tsvector` column with a GIN index is the simple option; for about hundreds of prompts a `ILIKE` on the filtered list is enough and the choice is left to the build PR (it adds an index, nothing else). Rollback: drop the column and tables. Seed: curated prompts in the migration file or a `database/seed/gallery.json` loaded by a reviewed script (about 60, categories matching BE-12).

## 7. Design

### 7.1 Moderation pipeline for submissions

1. Length, charset and language check.
2. BE-13 safety check (if live) on the text; reject with a reason code, not the model's raw verdict.
3. PII scrub (BE-21's rules: email, phone, card with Luhn, IBAN, API-key patterns, IP address): any hit rejects with "contains personal data".
4. Dedupe by `text_hash` (case and whitespace normalised).
5. Status `pending`; an admin approves, edits category and tags, or rejects with a reason. Auto-publish for trusted users is a later option (open question 2).

### 7.2 Listing and ranking

Published only. `popular` = tries in the last 30 days (a rollup) with the all-time count as a tie-break; `new` = published time. Curated items can be pinned per category by `curated`. Cursor pagination on `(sort key, prompt_id)`.

### 7.3 Counting tries

The count is a convenience, not a metric to protect. `use` increments through one Postgres function; an anonymous caller is limited by the BE-3 `write` group per IP hash, and a hash seen already today for that prompt is ignored (a small table or a Worker KV key with a one-day TTL: `try:<promptId>:<ipHash8>`). Battles started with a gallery prompt record `comparisons.source_gallery_id` and the count is later **recomputed** from those rows nightly, which makes the number truthful.

### 7.4 Use in a battle

The web puts the text in the composer; the user can edit it. If the text is unchanged at send time the battle carries `sourceGalleryId`; any edit drops it (so a "tries" count means the prompt as published). The gallery adds no special battle path.

## 8. Privacy and abuse

- Submitted prompts become public text; the submit form says so and warns against personal data. Authors are anonymous unless they opt in to credit and have a public profile (BE-32).
- Moderation as above; spam limited to 3 submissions per day and 20 pending per user, the BE-3 limits, and the admin queue; repeat rejections suspend submission for that user (admin action).
- Prompts are an attack surface only as text shown to users; the web renders them as plain text. Prompt-injection text is harmless here because the gallery never executes anything; once used, the model sees it like any user prompt.
- A removed prompt is hidden at once (`removed`), the Worker cache drops it within 5 minutes, and existing battles keep their copy (they are the user's data).
- Deletion (BE-22): author id set null (the prompt stays, unattributed), or removed if the user asks (open question 3).
- Licence: community prompts need a licence grant. Proposal: the submit form says "By submitting, you allow DualMind to publish this prompt and include it in the open dataset under CC BY 4.0" (the same licence Arena uses for prompts, [research.md](../research.md) part 1.1). Wording needs legal review.

## 9. UI screens

New routes `/prompts` and `/prompts/:promptId` in `web/src/app/routes/`, a "Submit a prompt" dialog, a picker in the arena composer ("Browse prompts" opens a command-palette style list), and the admin review queue in the admin area. Cards follow the redesign's card and chip components ([component-catalog.md](../../redesign/component-catalog.md), [design-direction.md](../../redesign/design-direction.md)); empty states say how to submit. Prompt pages are indexable and in the sitemap (each is a unique, useful text page) once moderation is proven.

## 10. Dependencies

Soft all around, so it can ship early: BE-13 (before it, admin review is the only gate, which is acceptable with approval on every submission), BE-12 (auto category; before it, manual category), BE-21 scrubber code (before it, a small regex set in this PR), BE-32 (credit). BE-26 consumes it. Hard: the .NET deny-by-default PR so the anonymous routes are explicit.

## 11. Effort and impact

Effort **M**: about 2 days backend (tables, list and submit, review endpoints, dedupe, scrub, try counting, seed) and 2 days web. Impact **M**: lower friction to the first battle, steers category coverage, and is a good moderation case study. Cheap and early.

## 12. Test plan

- Unit: normalisation and hash dedupe (case, spaces, unicode normalisation), PII scrub cases (valid and invalid card numbers, emails in text, none echoed in errors), limits (3 per day, 20 pending), status transitions (only admin publishes; author can withdraw pending), cursor pagination stability when items are added mid-listing.
- Listing: only `published` appears; `removed` and `rejected` never; search and filters combine.
- Try counting: duplicate hashes in one day ignored; nightly recompute from `source_gallery_id` matches.
- Authorisation: author deletes own; another user cannot; admin queue is `AdminOnly`.
- Integration: migration up and down; seed loads and passes the same validations as submissions.
- Worker: the BE-4 cache pattern; a removal reaches clients within the TTL.
- E2E: browse, use in battle, submit and see pending, admin approve (mock adapter).

## 13. Rollout

Flag `be33_prompt_gallery`, default off. Seed 60 curated prompts on preview and have Harsh review them. Submissions open as a second flag `be33_submissions` after the review queue is used once. Migration needs Harsh's go. Kill switch: flags off hide routes; data stays.

## 14. Open questions for Harsh

1. Who writes the 60 curated prompts: Harsh, or drafts for him to approve?
2. Admin approval for every community prompt (proposed), or auto-publish after a user has 3 approved prompts?
3. When an author deletes their account: keep the prompt anonymised (proposed) or remove it?
4. Licence wording for submitted prompts (CC BY 4.0 for the open dataset): confirm, with legal review.
5. Languages: English only at first, or any language with a language tag?
