# BE-32: Profiles, badges and reputation

Status: **design** (2026-10-21). Not built. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on BE-15 (your verdicts), BE-14 (vote integrity), BE-13 (moderation), BE-22 (data controls).

**Scope conflict to resolve first.** [new-features.md](../../redesign/new-features.md) lists "social feeds, comments, public profiles" as explicitly out of scope. Harsh later picked this feature in the 21 Oct poll, so this design treats the poll as the newer decision, but keeps the public part **minimal and opt-in** and flags the conflict as open question 1. If Harsh confirms the older rule, ship only the private half (badges and stats visible to the user alone).

## 1. Summary

Each user has a profile with a unique handle. By default it is **private**: only the user sees their badges, vote counts and streaks (BE-15 data). A user can switch the profile to **public**: a page at `/u/<handle>` shows the handle, a generated avatar, the month they joined and their badges, and optionally their vote count. **Badges** reward participation (votes cast, streaks, categories explored, early adoption, seasons present). **Reputation** is an internal voter-quality weight used by BE-14; it is **not** a public score.

Why: voting is the product's engine, and a sense of progress makes a careful voter feel seen (BE-15's personal page). Badges give that progress a shape. Keeping reputation internal avoids turning vote quality into a game.

## 2. Goals and non-goals

Goals: private by default; handles that are safe and moderated; badges defined as data with versioned criteria and evidence; awards by an idempotent job; public pages that cannot leak email, id or votes; deletion that actually deletes.

Non-goals: a public voter leaderboard (it invites vote farming and conflicts with BE-14); followers, feeds, comments, direct messages; profile photos or free-text bios in v1 (moderation burden); reputation shown as a number; paid or purchasable badges; badges for **agreeing with the crowd** (Goodhart: rewarding agreement teaches users to vote with the majority and corrupts the data the ratings depend on).

## 3. Which side builds it (ADR 0008)

**.NET API**: profiles, handles and awards are user data in the database; badge criteria read votes and activity. The **Worker** serves link-preview tags for `/u/<handle>` (same mechanism as `/share`, `server/share.js`) and the BE-3 limiter classification. **Web** builds the pages.

## 4. User-visible behaviour

- First sign-in after launch: nothing changes. The Profile page (settings area) asks for a handle (3 to 20 characters of `a-z 0-9 _`, no reserved words), shows the avatar (an identicon generated from the handle in the browser: no uploads), the badge shelf with progress to the next badge, and the toggle "Make my profile public" with a preview of exactly what visitors see.
- Badges appear with a toast when earned (next page load; awards are hourly, not instant).
- Public page: handle, joined month, badges (with dates), vote count if "show my vote count" is on. Nothing else. Visiting a private or unknown handle returns the same 404 so handles cannot be probed for privacy status.
- Changing the handle is limited to once per 30 days; the old handle is released after 30 days.

## 5. API (.NET)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/users/me/profile` | Bearer | my profile, handle, visibility, settings |
| `PUT` | `/api/users/me/profile` | Bearer | create or update `{ handle?, isPublic?, showVoteCount? }` |
| `GET` | `/api/handles/check?handle=` | Bearer | availability and validation (rate limited) |
| `GET` | `/api/users/me/badges` | Bearer | earned badges plus progress for unearned ones |
| `GET` | `/api/badges` | anonymous | catalogue of badges (non-hidden) with criteria text |
| `GET` | `/api/profiles/{handle}` | anonymous | public profile or `404` |
| `POST` | `/api/internal/jobs/badges` | job secret | award run |
| `POST` | `/api/admin/profiles/{handle}/suspend` | `AdminOnly` | hide a profile, release or reserve the handle |

Public profile response:

```json
{
  "handle": "harsh",
  "joinedMonth": "2026-09",
  "avatar": { "kind": "identicon", "seed": "harsh" },
  "voteCountBucket": "100+",
  "badges": [ { "badgeId": "first-vote", "name": "First vote", "awardedOn": "2026-09-12" } ]
}
```

`voteCountBucket` is a coarse bucket (`1-9`, `10+`, `50+`, `100+`, `500+`, `1000+`) rather than an exact number, present only with `showVoteCount`. Own badges response adds `progress: { current, target }` for unearned badges.

Errors: `validation_error` (handle charset, length, reserved), `conflict` (handle taken, 30-day change limit, with `retryAfter`), `forbidden` (suspended), `not_found`, `rate_limited`, `unprocessable_content` (handle failed moderation, proposed slug).

## 6. Data model (proposed, additive)

```sql
create table user_profiles (
  user_id     uuid primary key references users(user_id) on delete cascade,
  handle      text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  is_public   boolean not null default false,
  show_vote_count boolean not null default false,
  handle_changed_at timestamptz not null default now(),
  suspended_at timestamptz,
  created_at  timestamptz not null default now()
);
create table handle_reservations (            -- old handles, reserved for 30 days; reserved words
  handle text primary key, reserved_until timestamptz, reason text not null
);
create table badge_definitions (
  badge_id    text primary key,
  name        text not null, description text not null,
  criteria    jsonb not null,                -- { "type": "votes", "count": 100 }
  version     int not null default 1,
  hidden      boolean not null default false,
  active      boolean not null default true
);
create table user_badges (
  user_id uuid not null references users(user_id) on delete cascade,
  badge_id text not null references badge_definitions,
  awarded_at timestamptz not null default now(),
  evidence jsonb not null default '{}',
  primary key (user_id, badge_id)
);
```

RLS on, no policies. Handle lookups use `lower(handle)` uniqueness (the check forces lowercase). Rollback: drop the four tables. Seed badge definitions in the migration (reviewed in the PR).

Initial badge set (proposal): `first-vote`, `votes-10`, `votes-100`, `votes-1000` (valid, unflagged votes), `streak-7` (7 consecutive UTC days with a vote), `explorer` (votes in 4 categories, BE-12), `multi-turn` (10 completed multi-turn battles, BE-27), `season-regular` (voted in 3 distinct seasons, BE-30), `early-voter` (an account that voted before a fixed date, hidden after the date passes), `curator` (3 prompts published in the gallery, BE-33). **No badge depends on agreement with the crowd or on which model won.**

## 7. Design

### 7.1 Awards job

Hourly `POST /api/internal/jobs/badges`, idempotent: for each active definition, a SQL function finds users meeting the criteria who do not hold the badge and inserts `user_badges ... on conflict do nothing`, with evidence (counts, dates). Counting uses the same "valid vote" rule as ratings (BE-14 flags excluded), so flagged votes do not earn badges. A badge is never revoked automatically when later votes are flagged unless the count drops below its threshold by more than the flagged amount (kept simple: re-evaluation at deletion or admin action only; open question 2).

### 7.2 Reputation (internal)

A per-user `reliability` used by BE-14 to weight or flag votes (gold prompts, agreement with attention checks, bursts). It lives with BE-14's tables, is **never exposed in any API**, and does not feed badges. This section exists so the word "reputation" in the feature title is accounted for: the user-visible form of reputation is the badge shelf; the weight is an integrity input.

### 7.3 Handle safety

Reserved list (`admin`, `support`, `dualmind`, model and provider names, profanity list), confusables blocked by the lowercase `[a-z0-9_]` rule, BE-13 text check if live, impersonation takedown by admin suspend. No email or full name is ever derived into a handle.

### 7.4 Public page caching

`GET /api/profiles/{handle}` is cacheable for 5 minutes at the Worker; a switch to private must disappear quickly: the Worker caches for 60 seconds only, and the .NET response carries `Cache-Control: public, max-age=60`. A suspended or private profile answers 404 immediately upstream.

## 8. Privacy and abuse

- Private by default; public is an explicit switch with a preview. Public shows handle, join month, badges and an optional bucketed count; no email, user id, display name, avatar image, votes, model preferences, arena or thread data.
- The `users.user_id` is never in a public payload; handles map internally.
- GDPR: profile and badges are deleted with the account (cascade, BE-22). A deleted handle is reserved for 30 days to prevent immediate impersonation.
- Abuse: handle squatting (limit one handle per account, 30-day release, an admin can reclaim), scraping profiles (rate limits; `/u/` pages `noindex` by default, indexable only if Harsh decides), vote farming for badges (valid-vote rule, streak needs a real vote per day, badge thresholds small enough that farming gains nothing the user cares about).
- Legal: a public profile processes personal data (a chosen pseudonymous handle); the privacy page ([privacy.tsx](../../../web/src/app/routes/privacy.tsx)) needs a sentence on it.

## 9. UI screens

Settings, new "Profile" page: handle form with live availability check, identicon preview, visibility switch, badge shelf with progress; public route `/u/:handle` (new route module, `noindex` by default); badge toasts. Styling per [design-direction.md](../../redesign/design-direction.md); the identicon is generated client-side from the handle (no external service, no third-party avatar fetch). BE-15's stats page is the natural neighbour (shared "You" section).

## 10. Dependencies

Hard: the scope decision (question 1), BE-15 (activity counts, streak). Soft: BE-14 (valid vote rule), BE-12, BE-27, BE-30, BE-33 (criteria sources), BE-13 (handle check), BE-22 (deletion).

## 11. Effort and impact

Effort **M**: about 3 days backend (tables, handle rules, award function and job, public route, Worker preview tags) and 2 days web. Impact **L** for a showcase ("polish, not a headline"); it conflicts with the earlier scope note, so it is the lowest-priority item of this slice.

## 12. Test plan

- Unit: handle validation table (length, charset, reserved, confusable attempts), 30-day change limit, reservation after change or delete, case-insensitive uniqueness under concurrent creation (one wins).
- Badge criteria on fixtures (counts at thresholds minus one, plus one; streak across a UTC midnight and a gap; flagged votes excluded); idempotent job (two runs, one award).
- Privacy tests: a private profile and an unknown handle are indistinguishable (same status, body and headers apart from timing); the public payload contains only the allowed keys (a JSON-schema test with `additionalProperties: false`); the count is bucketed.
- Authorisation: only the owner reads own badges and progress; suspend works for admins only.
- Integration: migration up and down; account delete cascades.
- E2E: set a handle, earn `first-vote` via the mock adapter, switch public and view `/u/handle` signed out.

## 13. Rollout

Flag `be32_profiles` (handles, private badges first), a second flag `be32_public_profiles` for `/u/`. Default off; preview first; migration needs Harsh's go. Kill switch: public flag off makes every profile 404.

## 14. Open questions for Harsh

1. The older scope note excludes public profiles. Keep the public part (opt-in, minimal) or ship private badges only?
2. Should badges ever be revoked (e.g. after fraud), or stay earned once awarded?
3. `/u/` pages: `noindex` (proposed) or indexable?
4. Legal: pseudonymous public handles need a privacy-policy sentence and an impersonation takedown contact. Who answers those emails?
