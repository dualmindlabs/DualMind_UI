# BE-34: Collections, exports and a Hugging Face dataset

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). **Builds on BE-21 (open dataset: the monthly anonymised export to R2) and BE-22 (data controls: export my data, delete my data). It does not redefine either.** This design adds two things on top: personal **collections** with server-side exports, and the **publication step** of the BE-21 export to a Hugging Face dataset.

## 1. Summary

Part A, **collections and exports** (user-facing): a signed-in user saves battles and chat answers into named collections ("coding answers", "for the blog"), adds notes, reorders, and exports a collection as Markdown, JSON, JSONL or CSV. A collection can be shared by an unlisted read-only link.

Part B, **Hugging Face dataset** (project-facing): a GitHub Actions workflow takes the monthly BE-21 JSONL (already scrubbed and filtered) and publishes it as a versioned dataset repository on Hugging Face with a dataset card, so the human-preference data is citable and loadable with `datasets.load_dataset`.

Why: part A turns one-off battles into something a person keeps and reuses (today only a client-side export of a thread exists, F-13 in [new-features.md](../../redesign/new-features.md)). Part B is the most visible output of the open-data work: Arena publishes `arena-human-preference-140k` on Hugging Face ([research.md](../research.md) part 1.1), and a DualMind dataset card with real methodology is a strong portfolio artefact.

The two parts share almost nothing technically and can ship separately: **BE-34a** (collections) and **BE-34b** (Hugging Face).

## 2. Goals and non-goals

Goals (A): collections of battle results with notes; server-side exports with stable formats; an unlisted share link that exposes only what the owner confirmed; caps that keep it cheap. Goals (B): reproducible monthly release; dataset card generated from the data; PII and consent rules enforced before upload; deletion requests honoured at the next release; no secret in the repository.

Non-goals (A): folders inside collections, collaboration, public collection discovery, full-text search across saved items (a plain list is enough), PDF export (the client already prints). Non-goals (B): re-defining the BE-21 schema or the scrubber; real-time dataset updates; including private-arena (BE-26) or flagged data; training or fine-tuning anything; a leaderboard dataset of model ratings (small, can be a second file in the same repository later).

## 3. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| Collections tables, items, export generation, share tokens | **.NET API** | User data over `comparisons` and `thread_messages` with ownership rules |
| BE-21 export job (JSONL to R2) | **.NET API** (BE-21) | Already assigned in the roadmap section 0 |
| Hugging Face publish workflow | **GitHub Actions** in `dualmindlabs/DualMind_UI` (or the dataset's own repository) | Heavy, scheduled, needs a token held as an Actions secret; not an API concern. It reads the R2 object and runs `huggingface_hub` |
| Collections UI, share page | **Web** | `/collections` |

## 4. User-visible behaviour (part A)

- A "Save" action on any finished battle or answer opens a menu: choose a collection or "New collection". A saved item shows the prompt, both answers, the verdict, and an editable note.
- `/collections` lists collections (name, item count, updated); `/collections/:id` lists items with drag-to-reorder, notes, remove, and **Export** (Markdown, JSON, JSONL, CSV). Exports download immediately for up to 500 items.
- **Share**: "Create a link" explains exactly what becomes visible (prompts, answers and notes of every item, not your name) and requires a confirmation; the link can be revoked at any time. The shared view is read-only at `/c/:token` and never shows the owner.
- Deleting a collection deletes its share links; the underlying battles are untouched.

## 5. API

### 5.1 Collections (.NET, Bearer unless stated)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/collections` | create `{ name, description? }`; `Idempotency-Key` |
| `GET` | `/api/collections?cursor&limit` | list mine |
| `GET` / `PATCH` / `DELETE` | `/api/collections/{collectionId}` | read (with first page of items), rename, delete |
| `POST` | `/api/collections/{collectionId}/items` | add `{ comparisonId, threadMessageId?, note? }`; idempotent on `(collectionId, comparisonId)` |
| `PATCH` | `/api/collections/{collectionId}/items/{itemId}` | note, position |
| `DELETE` | `/api/collections/{collectionId}/items/{itemId}` | remove |
| `GET` | `/api/collections/{collectionId}/export?format=md\|json\|jsonl\|csv` | download; `Content-Disposition: attachment`; `Cache-Control: private, no-store` |
| `POST` / `DELETE` | `/api/collections/{collectionId}/share` | create or revoke `{ token }`; create requires `{ confirm: true }` |
| `GET` | `/api/shared-collections/{token}` | anonymous, read-only |

Items can only reference battles the caller owns (`comparisons.user_id = caller`) and that are revealed (voted), so saving cannot expose a pending blind battle's model identities.

JSON export record (`jsonl` is the same, one object per line; `csv` flattens with a header):

```json
{
  "collection": "coding answers", "exportedAt": "2026-10-21T12:00:00Z", "formatVersion": 1,
  "items": [
    { "position": 1, "comparisonId": "6f1c...", "date": "2026-10-20", "prompt": "…",
      "left":  { "model": "Example Model 1", "text": "…", "timeMs": 2100 },
      "right": { "model": "Example Model 2", "text": "…", "timeMs": 3400 },
      "verdict": "right", "note": "good explanation of recursion" }
  ]
}
```

Errors: `validation_error` (name 1 to 80 characters, note up to 1,000, format), `not_found` (also for others' collections and unowned battles), `conflict` (collection or item limits, a battle already in the collection, idempotency reuse), `rate_limited`, `payload_too_large` is not used (exports stream).

Limits: 50 collections per user, 500 items per collection, 5 exports per minute (BE-3 `write`), export built by streaming query pages so memory stays flat.

### 5.2 Hugging Face release (no public API)

A workflow `publish-dataset.yml` (cron monthly on the 3rd, plus manual dispatch):
1. Fetch `exports/<YYYY-MM>/battles.jsonl` and `manifest.json` that BE-21 wrote to the R2 bucket `dualmind-arena-public` (via a read-only R2 token stored as an Actions secret, or a Worker route that serves the object with a shared secret).
2. Verify the manifest: row count, SHA-256 of the file, schema version, `scrubberVersion`, and that no row carries `flagged`, `arena_id`, or missing consent.
3. Generate the dataset card (`README.md` with YAML front matter) from the manifest and the data: licence, languages, size category, task categories, field table, counts per model and category, collection method, known limitations, the privacy and removal process, citation, and the methodology version of ratings.
4. Upload to the dataset repository with `huggingface_hub` (`HF_TOKEN` as an Actions secret), as a commit on `main` and a tag `YYYY-MM`.
5. Post a summary (rows, size, link) to the Actions run.

## 6. Data model (proposed, additive; part A only)

```sql
create table collections (
  collection_id uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references users(user_id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  idempotency_key text,
  unique (owner_id, idempotency_key)
);
create table collection_items (
  item_id       uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections on delete cascade,
  comparison_id uuid not null references comparisons on delete cascade,
  thread_message_id uuid,
  note          text check (char_length(note) <= 1000),
  position      int not null,
  added_at      timestamptz not null default now(),
  unique (collection_id, comparison_id)
);
create table collection_shares (
  token text primary key,                         -- 128-bit random, base64url
  collection_id uuid not null references collections on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
```

RLS on, no policies. Rollback: drop the three tables. `on delete cascade` from `comparisons` means that deleting a battle (BE-22) removes it from collections, and the export never contains a deleted battle. Part B adds **no** database tables; its state is the R2 manifest and Hugging Face's own git history. The `consent_version` and `scrubberVersion` fields it relies on are defined by BE-21.

## 7. Design

### 7.1 Export formats

Fixed `formatVersion: 1`; additive changes only. Markdown: heading per item with prompt, two answers in blockquotes labelled with model names, the verdict and the note. CSV: RFC 4180 quoting, and **formula-injection defence**: cells starting with `=`, `+`, `-`, `@`, tab or carriage return get a leading single quote (OWASP CSV-injection guidance), because answers are untrusted text that spreadsheets would execute. Filenames: `dualmind-<slug>-<date>.<ext>` with the collection name slugified.

### 7.2 Sharing semantics

A share exposes **copies at read time** of the items' prompt and answers and the owner's notes, so it follows the items. Because sharing reveals content the owner may not have meant to publish (battles can contain personal text), the create call requires `confirm: true` and the UI lists what is visible. A battle from a private arena (BE-26) cannot be added to a collection at all (`conflict`, `detail: "private arena battles cannot be saved"`) in v1, to keep the isolation rule absolute. Share pages set `X-Robots-Tag: noindex` and a short cache (60 seconds) so revocation is quick.

### 7.3 Hugging Face dataset content (aligned with BE-21 and Arena's public fields)

Row fields (proposed, final schema owned by BE-21): `conversation_id` (random, not the comparison id), `date` (rounded to the day), `prompt` (and, when BE-27 lands, `turns` as a list), `model_a`, `model_b`, `response_a`, `response_b`, `winner` (`model_a`, `model_b`, `tie`, `both_bad`), `category`, `language`, `token_counts`, `battle_kind`, `methodology_version`. Never included: user ids, handles, emails, hashes of users, IPs, thread ids, anything from private arenas, flagged or moderated rows, rows with PII scrub hits, battles younger than 30 days (a delay that allows takedown and reduces gaming).

The card states the licence (proposal: CC BY 4.0 for the dataset, as Arena does for prompts; model outputs are subject to each provider's terms, which the card says), the consent wording and its version, the scrubbing method and its limits ("redaction is imperfect"), the removal contact, and known biases (small and young user base, English dominance, battles come from signed-in users).

### 7.4 Deletion and corrections

Per BE-22, a user's deletion removes their battles from the database; the next monthly release excludes them. **Already published releases cannot be recalled**; the consent text and the dataset card say so, and a takedown request for a specific row is handled by publishing a corrected release and asking Hugging Face to remove the old revision (a manual, documented procedure, not automated).

### 7.5 Secrets and permissions

`HF_TOKEN` (write access to the one dataset repository only) and an R2 read token are Actions secrets created by Harsh; neither is ever printed, written to a file in the repo or put in the dataset card. The workflow runs on a schedule and manual dispatch only, from the default branch, with `permissions: contents: read`.

## 8. Privacy and abuse

Part A: collections and exports are private; shares are explicit, revocable, noindex, and show no owner. Exports contain only the caller's own battles. Abuse: the caps and `write` limit bound storage and CPU; the CSV neutralisation protects spreadsheet users. Part B: the highest-risk piece of the whole slice because it is irreversible publication of user-derived text; every control above exists for that reason, plus a **dry-run mode** that builds the card and checks without uploading, required before the first real release and run by a human (Harsh) once.

## 9. UI screens

Web: a "Save to collection" popover on battle and answer views, `/collections`, `/collections/:id` (list, notes, reorder, export menu, share dialog), `/c/:token` (shared view). Reuse the share dialog and copy components built for shared threads (`web/src/features/share`) and the battle pane for read-only display ([design-direction.md](../../redesign/design-direction.md)). The Hugging Face dataset is linked from the About and Developers pages and the open-data page (BE-21's), with the dataset card as the source of truth.

## 10. Dependencies

Part A: vote validation and baseline schema (revealed battles only), BE-22 (cascade and deletion), BE-3. Part B: **BE-21 is a hard prerequisite** (export job, consent text, scrubber, manifest), plus BE-13 flags, BE-14 flags and BE-26 isolation (rows excluded), BE-12 (category field), and a Hugging Face account and token from Harsh. BE-27 changes the row shape (`turns`) in a later schema version.

## 11. Effort and impact

Effort **H** in total: **BE-34a** about 2.5 days backend plus 2 days web; **BE-34b** about 1.5 days (workflow, card generator, dry run, docs), after BE-21 exists. Impact **M**: part A is a modest user convenience, part B is a strong, visible open-data artefact for the portfolio. Because B depends on BE-21 and consent decisions, A can ship first.

## 12. Test plan

- Part A unit: ownership checks (cannot add another user's battle, cannot add an unrevealed one or a private-arena one), idempotent add, limits (50, 500), reorder positions stay dense, export golden files for each format including quotes, newlines, commas, emoji and RTL text, CSV formula neutralisation (`=HYPERLINK(...)` becomes inert), share create needs `confirm`, revoke returns 404 on the next read.
- Part A integration (scratch Postgres): migration up and down; deleting a comparison removes items; deleting a user removes collections and shares.
- Contract: OpenAPI for all routes; export `Content-Type` and `Content-Disposition` headers per format.
- Part B: script tests on fixture manifests: row-count and hash mismatch aborts, a row with `flagged` or without consent aborts, card generation is deterministic (golden file), PII regex pass over the fixture finds nothing; dry run uploads nothing (the upload function is injected and asserted not called).
- Workflow lint: `actionlint` in CI for the workflow file; secrets referenced only as `${{ secrets.NAME }}`.
- E2E: save to a collection, export, share and revoke (mock adapter).

## 13. Rollout

Flag `be34_collections` (default off) for part A: preview first, then production; migration needs Harsh's go. Part B has no flag: it runs only when Harsh dispatches the workflow, first as a dry run, then a first real release of a small month, and only after BE-21's consent text is live and Harsh has reviewed the card. Kill switch: part A flag off; part B disable the workflow (and request removal of a bad revision on Hugging Face).

## 14. Open questions for Harsh

1. Hugging Face: which account or organisation owns the dataset (and name), and will Harsh create the write token? (Nothing is created by this work.)
2. Licence for the dataset: CC BY 4.0 (proposed, matches Arena for prompts) or something stricter; is a gated "accept the terms" download wanted?
3. Delay before a battle can be published: 30 days (proposed)?
4. Consent: opt-in per account (cleaner) or a notice at first use with an opt-out (more data, more legal risk)? This is BE-21's decision but BE-34b cannot ship without it.
5. Part A caps (50 collections, 500 items) and whether collection share links are wanted at all in v1.
6. Include a ratings file (model, rating, interval, methodology) in the same dataset repository?
