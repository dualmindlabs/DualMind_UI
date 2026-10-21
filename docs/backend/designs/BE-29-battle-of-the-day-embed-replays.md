# BE-29: Battle of the day, embed widget and replays

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on BE-13 (moderation), BE-14 (integrity), BE-19 (share cards), BE-22 (data controls), the existing shared-thread feature (`threads.visibility`, `/share/:threadId`). Feeds [BE-28](./BE-28-model-cards.md) (sample battles).

## 1. Summary

Three linked things:
1. **Battle of the day**: one curated real battle per day, chosen by a documented, mostly automatic rule from battles whose owners allowed public display, shown on the home page and an archive.
2. **Embed widget**: any featured or shared battle can be embedded as an `<iframe>` (and discovered through oEmbed) on a blog or portfolio.
3. **Replays**: a featured battle plays back with the two answers appearing over time, so a visitor sees the arena in motion without running models.

Why: the landing page promises "live data, real battle replay" ([design-direction.md](../../redesign/design-direction.md) section 1), and a portfolio reviewer should be able to watch a real battle in ten seconds without an account or provider cost.

## 2. Goals and non-goals

Goals: consent first (public display only if the owner opted in); one place for featuring rules and takedown; embeds that cannot leak private data and cannot run third-party script; a replay that is honest about being a replay.

Non-goals: live battles in the embed (no provider calls from a visitor, ever, in v1); a comments or reactions system (out of scope); crowd voting that moves ratings (the visitor "your pick" is shown but never rated); paid placement; a mobile app widget.

## 3. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| `featured_battles`, consent flag, selection job, archive and read endpoints, takedown | **.NET API** | Stateful product data over `comparisons` and `threads`; selection needs the vote and integrity data |
| Embed page (`/embed/b/:id`), its CSP exception, oEmbed endpoint, caching of the public JSON, the OG image (BE-19) | **Worker** | Edge concerns: headers and CSP, cache, image rendering, R2 (ADR 0008 item 2) |
| Replay player, home module, archive page | **Web** | UI |

## 4. User-visible behaviour

- Home page "Battle of the day": prompt, two answers replaying side by side, verdict revealed at the end ("the author preferred B, Model Y"), link to the archive and "Try this prompt" (opens the composer with the prompt, using BE-33 if live).
- `/battles` (archive, newest first) and `/battles/:featuredId` (a single battle with Share, Embed and a visitor "which would you pick?" that shows the split after picking, not rated).
- Share dialog (existing share feature) gets "Allow this battle to be featured and embedded" (default off; section 8) and an "Embed" tab with the iframe snippet.
- Replay: answers appear at the pace the models took (recorded `model*_time_ms` and answer length); a "skip to end" button; a visible label "Replay of a recorded battle". Reduced motion: no animation, full text shown at once.

## 5. API

### 5.1 .NET

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/featured/today` | anonymous | today's battle (UTC date), 404 `not_found` if none yet |
| `GET` | `/api/featured?cursor&limit&model=` | anonymous | archive `{ items, nextCursor }` |
| `GET` | `/api/featured/{featuredId}` | anonymous | one battle with replay timing |
| `POST` | `/api/featured/{featuredId}/pick` | anonymous (hashed) or JWT | `{ choice: "left" | "right" | "tie" }`, `Idempotency-Key` optional; returns the split |
| `PUT` | `/api/threads/{threadId}/messages/{messageId}/featuring` | owner | `{ allow: true | false }` consent |
| `DELETE` | `/api/featured/{featuredId}` | owner or `AdminOnly` | takedown (soft, immediate) |
| `POST` | `/api/admin/featured` | `AdminOnly` | manually feature a battle (`kind: daily | curated`, `featuredOn`, `headline`) |

Featured battle response (identity of models is revealed because the battle is over and voted):

```json
{
  "featuredId": "f2a1...", "kind": "daily", "featuredOn": "2026-10-21", "headline": null,
  "prompt": "Explain tail recursion to a ten year old.",
  "left":  { "modelSlug": "example-model-1", "displayName": "Example Model 1", "text": "…", "timeMs": 2100, "tokens": 211 },
  "right": { "modelSlug": "example-model-2", "displayName": "Example Model 2", "text": "…", "timeMs": 3400, "tokens": 340 },
  "verdict": "right",
  "crowd": null,
  "replay": { "kind": "recorded-pace", "left": { "durationMs": 2100 }, "right": { "durationMs": 3400 } },
  "createdAt": "2026-10-20T14:00:00Z"
}
```

`crowd` is `{ left, right, tie, total }` only after the viewer picked (or when `total >= 20`; below that it stays hidden to avoid noise). `replay` carries timings only; the player derives the pacing from text length and `durationMs` (the app stores no per-token timestamps today: `comparisons` has `model1_time_ms` and `model2_time_ms`, api-repo-review 2.2), so it is labelled a replay, not a recording of the stream.

Errors: `not_found`, `gone` (proposed, 410 for a taken-down battle, so caches and embeds drop it), `rate_limited`, `validation_error`, `forbidden` (consent route for another user's battle).

### 5.2 Worker

- `GET /embed/b/:featuredId` (HTML): a minimal page rendering the battle. Response headers: `Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors *` for this route only (the rest of the site keeps its frame restrictions), `X-Frame-Options` omitted, `Referrer-Policy: no-referrer`, `Cache-Control: public, max-age=300, stale-while-revalidate=3600`. The embed script is first party and static; no third-party script, no cookies, no storage.
- `GET /api/v2/oembed?url=<battle url>&maxwidth&maxheight&format=json` returns an oEmbed 1.0 `rich` object whose `html` is the iframe snippet. Only DualMind battle URLs are accepted (`validation_error` otherwise).
- `GET /api/v2/featured/today` and `/api/v2/featured/{id}`: cached copies of the .NET routes with the BE-4 cache pattern (5 minutes, ETag). A `410` from upstream is cached for 60 seconds and purges the entry.
- The `og:image` for a featured battle comes from BE-19.

## 6. Data model (proposed, additive)

```sql
create table featured_battles (
  featured_id   uuid primary key default gen_random_uuid(),
  comparison_id uuid not null unique references comparisons on delete cascade,
  thread_message_id uuid,                          -- the shared surface the owner consented on
  kind          text not null check (kind in ('daily','curated','sample')),
  featured_on   date,                              -- set for 'daily'
  headline      text check (char_length(headline) <= 120),
  picked_by     text not null check (picked_by in ('auto','admin','owner')),
  score         real,                              -- the auto-pick score, kept for audit
  status        text not null default 'live' check (status in ('live','taken_down')),
  created_at    timestamptz not null default now(),
  taken_down_at timestamptz
);
create unique index featured_daily_day on featured_battles (featured_on) where kind = 'daily' and status = 'live';

create table featuring_consent (
  comparison_id uuid primary key references comparisons on delete cascade,
  user_id       uuid not null references users(user_id) on delete cascade,
  allowed       boolean not null,
  consent_version text not null,                   -- the wording the user saw
  changed_at    timestamptz not null default now()
);

create table featured_picks (
  featured_id uuid references featured_battles on delete cascade,
  voter_hash  bytea not null,                      -- HMAC(pepper, user id or anonymous cookie id)
  choice      text not null check (choice in ('left','right','tie')),
  created_at  timestamptz not null default now(),
  primary key (featured_id, voter_hash)
);
```

RLS on, no policies. Rollback: drop the three tables. `featured_picks` is never read by the rating jobs (a test asserts it).

## 7. Design

### 7.1 Eligibility and the daily pick

Eligible: `featuring_consent.allowed`, `comparisons.status = 'complete'`, a decisive or tie vote, no BE-14 flag on the comparison or the voter, BE-13 clean on both answers (re-run at feature time), no private-arena (`arena_id is null`), both answers 40 to 1,500 characters, not already featured, neither model deprecated, and no pair repeat in the last 14 days.

Score (proposal, logged in `score`): `0.4 * pairRarity + 0.3 * lengthBalance + 0.2 * answerQuality + 0.1 * recency`, where `pairRarity` favours model pairs with few featured battles, `lengthBalance` penalises one very short answer, and `answerQuality` is a cheap heuristic (no refusal phrases, no error text). There is **no crowd signal** to rank by: each comparison has one voter (the author), so "interesting" cannot be measured from votes yet. The job picks the top scorer at 00:30 UTC, writes the row idempotently (`unique (featured_on)`), and an admin can replace it before 06:00 UTC. If no eligible battle exists, no daily battle is shown and the home page hides the module (never a fake or reused one without saying so).

### 7.2 Consent

Opt-in at share time and per battle (open question 1). The consent row stores the wording version. Revoking consent sets the featured row `taken_down` at once; the Worker purge happens within the cache TTL (5 minutes) and the 410 answers embeds.

### 7.3 Embed security

The embed page is static HTML plus a first-party script, built from the cached JSON; all text is rendered as text (no markdown HTML injection: the battle text goes through the same safe renderer the app uses, streamdown with raw HTML disabled, ADR 0004). `frame-ancestors *` is deliberate and limited to `/embed/*`; nothing there reads cookies, tokens or storage. A site-wide kill switch (`be29_embeds` flag) makes the route answer 404.

### 7.4 Replay

Client-side only: text is revealed over `durationMs` (capped between 2 s and 20 s) in word chunks, both sides in parallel; no extra server data. The label and a "skip" control are mandatory.

## 8. Privacy and abuse

- Default private. Public display is per battle opt-in, with plain wording: "Anyone can see this prompt and both answers on DualMind and on sites that embed it. Don't include personal information." The prompt and answers are displayed without the author name; no user id or handle appears.
- PII risk: the prompt may contain personal data. BE-21's scrubber (email, phone, card, IBAN, keys, IP) runs at feature time and a hit blocks featuring; borderline cases go to the admin queue. A takedown link ("Report this battle") exists on the page.
- Private-arena, flagged, moderated and unvoted battles are never eligible.
- `featured_picks` stores an HMAC, not an id; anonymous visitors use a first-party random cookie id on the main site and nothing in the embed (the embed shows the result, picking happens on dualmind pages).
- Abuse: one pick per hash, rate limited; picks never affect ratings. Embeds are cached, so a viral embed costs the Worker, not the API.

## 9. UI screens

Home page module (the landing route, `web/src/app/routes/home.tsx`), `/battles` and `/battles/:featuredId` (new routes), the embed route (`/embed/b/:id`, a minimal layout without app chrome, in the Worker-served shell), a share dialog tab, and the admin queue in the existing admin area (not designed here). Replay and answer panes reuse the battle components ([design-direction.md](../../redesign/design-direction.md)). The embed has a light and dark variant from `prefers-color-scheme`.

## 10. Dependencies

Hard: consent UI on the share feature, BE-13 (or a basic scrubber), the .NET vote and integrity PRs. Soft: BE-14 (flags), BE-19 (image), BE-21 (scrubber code shared), BE-22 (deletion removes featured rows by cascade), BE-33 (try this prompt), BE-28 (sample list).

## 11. Effort and impact

Effort **M**: about 3 days backend (tables, consent, selection job with the admin override, endpoints, Worker embed and oEmbed routes) and 3 days web (replay player, home module, archive, embed layout). Impact **M**: a vivid showcase moment (it makes the home page real) with real privacy work; this is polish, not growth.

## 12. Test plan

- .NET unit: eligibility filter (each rule has a row that fails only that rule), score determinism, unique daily constraint under two concurrent job runs, consent revoke takes down, takedown returns 410, picks unique per hash and never read by ratings.
- Selection fixtures: no eligible battle gives no daily; a pair repeated within 14 days is skipped.
- Worker (Miniflare): embed headers exactly as specified (and absent on other routes), oEmbed rejects foreign URLs, 410 purges the cache, HTML escaping of prompt and answer text with hostile input (`<script>`, markdown links with `javascript:`), cache headers.
- Contract: OpenAPI for new routes, oEmbed output validates against the 1.0 `rich` required fields (`type`, `version`, `html`, `width`, `height`).
- E2E: Playwright embed page inside a test iframe from another origin renders; reduced-motion shows full text.

## 13. Rollout

Flags `be29_featured` and `be29_embeds`, default off. Ship consent and admin featuring first (manual curation works with zero algorithm), then the daily job, then embeds, then the home module. Preview first; migration needs Harsh's go. Kill switch: flags off (embed 404, module hidden).

## 14. Open questions for Harsh

1. Consent default and scope: per battle at share time (proposed, default off) or an account setting?
2. Daily pick: fully automatic with an admin override (proposed) or admin-only (Harsh picks), given there is no crowd signal yet?
3. Visitor "your pick" counts: keep (proposed, never rated) or drop to avoid a second kind of vote?
4. Embed `frame-ancestors *` (any site) or an allow list? Any site is the point of an embed; an allow list is safer but blocks others.
5. Legal: wording of the public-display consent, and whether the answers of third-party models may be republished on embeds (check each provider's terms; the same question as BE-21).
