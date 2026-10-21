# BE-25: Developer API keys and usage dashboard

Status: **design** (2026-10-21). Not built; build waits for Harsh's go on backend work. Wave W6 ([feature-roadmap.md](../feature-roadmap.md)). Uses the shared [conventions for BE-25 to BE-34](./README.md#conventions-for-net-features-be-25-to-be-34). Builds on [BE-3](./BE-3-rate-limits.md) (rate limits), [BE-4](./BE-4-leaderboard-cache.md) (cached public reads) and [BE-5](./BE-5-api-docs.md) (developer portal, OpenAPI).

## 1. Summary

A signed-in user can create named API keys in a developer page, use them as `Authorization: Bearer dm_live_...` on the **public read API** (leaderboard, models, history, head-to-head, model cards, gallery), see how many calls each key made, and revoke a key. Requests with a key get a higher, per-key rate limit than anonymous callers and are counted per day. Keys never grant write access in this version.

Why: BE-5 publishes an OpenAPI document and a developer portal, but today anyone can call the public routes anonymously and nobody can be told apart from a scraper. Keys make the API a real product surface (a portfolio point: key hashing, scopes, per-key limits, usage metering) without adding a billing system.

## 2. Goals and non-goals

Goals:
- Create, list, rename and revoke keys; show the secret **once**.
- Verify a key on every keyed request in under 5 ms at the edge (KV-cached verdict) without a database call on the hot path.
- Per-key rate limit and a daily quota, with the headers BE-3 already defines.
- A usage dashboard: requests per day per key, errors, rate-limited calls, top routes, for the last 30 days.
- Keys are safe to leak less: only a hash is stored, the prefix is greppable, revocation takes effect within 60 s.

Non-goals (this version):
- **Write or battle scopes.** A battle costs provider money (two model calls). A `battle:create` scope needs a budget model first (open question 3).
- Billing, plans, invoices, credits (out of scope in [new-features.md](../../redesign/new-features.md): "credits purchases, pricing pages, payment checkout").
- OAuth apps, webhooks, organisations or teams.
- Per-key IP allow lists.

## 3. Which side builds it (ADR 0008)

| Piece | Lives in | Reason |
| --- | --- | --- |
| Key records, hashing, scopes, revocation, usage aggregates, dashboard reads | **.NET API** | Data features with a source of truth live in the .NET database ([ADR 0008](../../adr/0008-features-in-the-dotnet-api.md)); keys are tied to `users` |
| Key verification on public reads, per-key rate limit, request counting | **Worker** | An edge concern: it must run before the cache and cost no database call; BE-3 already owns limiting. The public reads are cached at the Worker (BE-4) and never reach .NET on a hit, so only the Worker sees every call |
| Developer page: create, list, usage charts | **Web** | `/developers/keys` |

## 4. User-visible behaviour

- `/developers/keys` (signed in): list of keys (name, prefix `dm_live_ab12cd34`, created, last used, status), "Create key" (name, 1 to 40 characters), a one-time reveal dialog with a copy button and the warning "this is the only time the key is shown", revoke with confirmation.
- Usage tab per key: a 30-day bar chart (requests per day, with rate-limited and error counts as separate series) and a table of routes. Data is eventually consistent: up to 10 minutes late (section 7.3), and the page says so.
- A revoked or unknown key gets `401` problem `unauthorized` with `detail: "API key revoked or unknown"`; a key over its quota gets `429` `rate_limited` with `Retry-After`.
- Anonymous calls keep working at the BE-3 `read` limit. A key raises the limit; it is not required for the public reads.

## 5. API

### 5.1 Key management (.NET, Bearer = Supabase JWT only; a key cannot manage keys)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/users/me/api-keys` | create; `Idempotency-Key` required (a retry returns the same key id but **not** the secret again: 200 with `secret: null` and `secretShown: true`) |
| `GET` | `/api/users/me/api-keys` | list (no secrets) |
| `PATCH` | `/api/users/me/api-keys/{keyId}` | rename |
| `DELETE` | `/api/users/me/api-keys/{keyId}` | revoke (soft: `revoked_at`); idempotent, `204` |
| `GET` | `/api/users/me/api-keys/{keyId}/usage?from=2026-10-01&to=2026-10-31&groupBy=day\|route` | usage rows |

`POST` request and response:

```json
{ "name": "my notebook" }
```

```json
{
  "keyId": "0b7c1c8e-3a5f-4a0e-9f0e-0f6f0a2b6a11",
  "name": "my notebook",
  "prefix": "dm_live_ab12cd34",
  "scopes": ["public:read"],
  "createdAt": "2026-10-21T10:00:00Z",
  "secret": "dm_live_ab12cd34_Zx3...43 more characters...",
  "secretShown": false,
  "limits": { "perMinute": 60, "perDay": 5000 }
}
```

`GET` usage response:

```json
{
  "keyId": "0b7c1c8e-3a5f-4a0e-9f0e-0f6f0a2b6a11",
  "from": "2026-10-01", "to": "2026-10-31", "timeZone": "UTC",
  "complete": false,
  "items": [
    { "day": "2026-10-21", "requests": 412, "ok": 398, "clientErrors": 9, "serverErrors": 0, "rateLimited": 5 }
  ]
}
```

`groupBy=route` rows are `{ routeGroup, requests, rateLimited }` where `routeGroup` is a fixed label such as `leaderboard`, `models`, `history`, `headToHead`, `gallery` (never a raw path, so no query data is stored).

Errors (problem+json, [problems.md](../../api/problems.md)): `validation_error` (name length, bad range over 90 days), `unauthorized`, `forbidden` (a key tries to manage keys), `conflict` (same `Idempotency-Key`, different body), `rate_limited`. New slug proposed: `quota_exceeded` (429, with `limit`, `resetAt`) for the daily quota, distinct from the per-minute `rate_limited`; if Harsh prefers fewer slugs, both use `rate_limited` and the body says which.

Limits: 5 active keys per user (`409 conflict`, `detail: "key limit reached"`), 10 key creations per day per user, key management routes under the BE-3 `write` group.

### 5.2 Using a key (Worker, on the public read routes)

`Authorization: Bearer dm_live_...`. A value that starts with `dm_live_` is treated as a key; anything else follows the existing JWT path. Responses add `RateLimit-Policy: "apikey";q=60;w=60` and `X-DualMind-Key: <prefix>` is **not** added (no echo of key material).

Which routes: the cacheable public reads listed in [feature-roadmap.md](../feature-roadmap.md) as they ship (BE-4 leaderboard first). A key on a route that does not accept keys is ignored, not rejected (the route's own rules apply).

## 6. Data model (proposed, .NET Postgres, additive)

Migration `NNNN_api_keys.sql` (next free number; see conventions), rollback `DROP TABLE` in reverse order.

```sql
create table api_keys (
  key_id        uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(user_id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  prefix        text not null unique,            -- 'dm_live_' + 8 chars, shown in the UI
  secret_hash   bytea not null,                  -- HMAC-SHA-256(pepper, full key); never the key
  scopes        text[] not null default '{public:read}',
  per_minute    int not null default 60,
  per_day       int not null default 5000,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,                     -- updated at most once per hour per key
  revoked_at    timestamptz,
  idempotency_key text,
  unique (user_id, idempotency_key)
);
create index api_keys_user on api_keys (user_id) where revoked_at is null;

create table api_key_usage_daily (
  key_id        uuid not null references api_keys(key_id) on delete cascade,
  day           date not null,
  route_group   text not null,
  requests      int not null default 0,
  ok            int not null default 0,
  client_errors int not null default 0,
  server_errors int not null default 0,
  rate_limited  int not null default 0,
  primary key (key_id, day, route_group)
);
alter table api_keys enable row level security;
alter table api_key_usage_daily enable row level security;   -- no policies: service role only
```

Key format: `dm_live_` + 8 random base32 characters (the public prefix and the lookup handle) + `_` + 32 random bytes in base62 (about 190 bits). The hash is an HMAC with a server pepper (`API_KEY_PEPPER`, a new secret in the .NET container, set by Harsh) rather than a slow password hash, because the secret is high-entropy and verification must be fast; a database leak alone does not allow forging keys without the pepper. Rotating the pepper invalidates all keys (documented; keys are cheap to recreate).

`last_used_at` and usage counts are written by the aggregation endpoint (7.3), not per request.

## 7. Design

### 7.1 Verification at the edge

```text
request with Bearer dm_live_<prefix>_<secret>
  KV CACHE["apikey:" + sha256(fullKey)]  ->  { keyId, userId, scopes, perMinute, perDay, status }   (TTL 60 s)
  miss -> POST .NET /api/internal/api-keys/introspect { prefix, keyHash }  (shared-secret header)
          -> 200 verdict | 404 unknown/revoked   (negative verdicts cached 30 s)
```

The Worker never sees the pepper: it sends the full key over the private Worker-to-API hop and .NET computes the HMAC and compares in constant time; the KV entry is keyed by an unsalted SHA-256 of the key (a high-entropy secret, so the hash is safe as a cache key) and holds no secret. Revocation: .NET calls back nothing; the Worker honours the verdict for at most 60 s, so revocation takes effect within a minute. An introspect failure (API cold or down) falls back to the last cached verdict up to 10 minutes, then to anonymous treatment (the call still works as an anonymous read), never to an error.

### 7.2 Limits

A new BE-3 group `apikey` (binding `RL_APIKEY`, `namespace_id: "1006"`, 60 per 60 s) keyed `k:<keyId>`. The per-key `per_minute` column cannot change a binding's limit (the binding has one fixed limit), so v1 uses one tier; per-key overrides need a Durable Object limiter (open question 2). Daily quota: counted in the usage pipeline (7.3), enforced approximately: the Worker keeps a per-key daily counter in KV with a 5-minute write granularity and denies with `quota_exceeded` after `per_day` plus a 10% tolerance. This is an abuse control, not exact billing; the page says "approximate".

### 7.3 Counting

The Worker enqueues one small message per keyed request on the existing `EVENTS` queue (`{ kind: "api_call", keyId, group, status, day }`, no path, no IP, no query). A queue consumer sums messages in the batch and calls `POST /api/internal/api-usage` on .NET with the totals (`INSERT ... ON CONFLICT DO UPDATE SET requests = requests + excluded.requests` through one Postgres function), at most once a minute per batch. Delay is minutes; loss on queue failure goes to the existing dead-letter queue and is acceptable for metering. `complete: false` on the usage response while the current day is open.

Alternative considered: Workers Analytics Engine datapoints (BE-20 pipeline) with SQL reads; rejected for v1 because reading it needs an Analytics API token in .NET and a second query path, while the Queue and Postgres aggregate are both already in the plan.

## 8. Privacy and abuse

- Public in responses: nothing about other users. A key's owner sees their own keys and counts only.
- Stored: prefix and an HMAC; no IPs, no user agents, no request paths with query strings. Usage rows carry route group labels.
- Account deletion (BE-22): `on delete cascade` removes keys and usage.
- Abuse: email-confirmed Supabase accounts only (`email_confirmed_at` in the JWT claims; if absent, the check is skipped and noted as an open point); 5 keys per user; per-key limits; an admin can revoke any key (`PATCH /api/admin/api-keys/{keyId}`, `AdminOnly`) and block a user's creation. Scraping the whole leaderboard is allowed and cheap (cached); the point of the limit is to stop floods, not data reuse.
- Leaked keys: the `dm_live_` prefix is distinctive so a user (or GitHub secret scanning, if Harsh later registers the pattern) can find leaks. No auto-revocation in v1.
- Attribution: not required (open question 4).

## 9. UI screens

- `/developers/keys` and `/developers/keys/:keyId` (new, under the BE-5 `/developers/` section; new route modules in `web/src/app/routes/`, listed in `routes.ts`). Style per [design-direction.md](../../redesign/design-direction.md); the usage chart follows the data-visualisation rules in the component catalog (one accessible series colour scheme, table fallback).
- The reveal dialog and copy button reuse existing dialog and clipboard components.
- BE-5's portal page links to it ("Get a key") and its examples show the header.

## 10. Dependencies

BE-3 (limiter and headers), BE-4 (a cacheable public route to protect), BE-5 (portal, OpenAPI security scheme `bearerAuth` with the key format), BE-6 (`Idempotency-Key` handling). BE-22 (deletion) for cascade behaviour. Public data routes from BE-8, BE-11, BE-28, BE-33 become key-aware as they ship; none is required to ship BE-25 (the leaderboard alone is enough).

## 11. Effort and impact

Effort **H**: about 4 days backend (.NET tables, endpoints, introspection, usage function; Worker verify, limiter group, queue consumer) and 2 days web. Impact **M**: strong showcase of API product thinking; no user growth claim.

## 12. Test plan

- .NET unit: key generation format and entropy, HMAC verify with constant-time compare, revoke, 5-key cap, idempotent create (second call returns no secret), usage upsert adds, usage range validation.
- .NET integration against a scratch Postgres in CI (the same job proposed for migrations in api-repo-review 5.4 #7): migration up and down; deny-all RLS (an `anon` role read fails).
- Worker (Miniflare): verdict cache hit and miss with a fake .NET; revoked key becomes anonymous after the TTL; introspect failure falls back; `RL_APIKEY` 429 body and headers; the queue message has no path or IP; a key header on a route without key support is ignored.
- Contract: key routes validated against the generated OpenAPI; `securitySchemes` documents the key.
- E2E: Playwright with the mock adapter creates a key, sees it once, revokes it.

## 13. Rollout

Flag `be25_api_keys` (default off) in `system_settings`; the Worker checks the flag value through the introspect response so a disabled feature answers keys as anonymous. Preview first with test data; migration needs Harsh's go. Kill switch: flag off. Order: migration, .NET routes, Worker verify behind the flag, web page, then docs in BE-5.

## 14. Open questions for Harsh

1. Free limits: 60 per minute and 5,000 per day per key, 5 keys per user (Artificial Analysis uses 100 per day on its free tier, [research.md](../research.md)). Higher, lower, or no daily cap?
2. Per-key custom limits (a friend, a demo) need a Durable Object limiter. Worth it, or one tier is enough?
3. Should a later `battle:create` scope exist at all, given provider cost? If yes, a daily cap per user and an energy or budget ledger come first (api-repo-review 2.3: no energy ledger exists).
4. Require attribution ("Data from DualMind Arena") for API users, as Artificial Analysis does?
5. Legal: a short API terms page (no resale of raw data? no scraping beyond limits?) before launch.
