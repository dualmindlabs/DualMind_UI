# 0007. Backend features on Cloudflare, at the edge of the existing API

- Status: Amended by [ADR 0008](./0008-features-in-the-dotnet-api.md) (2026-10-21): data features move to the .NET API; the Worker keeps edge concerns
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

- The Arena's system of record is the DualMind API (ASP.NET Core on Azure, `api.dualmindlab.tech`) with Supabase (Auth and Postgres). It owns users, threads, battles, votes and the Elo stats ([docs/api/endpoints.md](../api/endpoints.md)).
- The web app talks to it only through the `dualmind-arena` Worker's same-origin `/api/*` proxy ([ADR 0006](./0006-same-origin-api-proxy.md)). The Worker is deployed by Cloudflare Workers Builds, which also publishes a preview URL per branch ([ADR 0005](./0005-workers-builds-deploys-and-previews.md)).
- The endpoint map found contract problems the UI suffers from: `POST` retries that create duplicate battles, at least three error body shapes, a text-to-speech route that returns 404, battles that are not streamed, leaderboard numbers with no history or uncertainty.
- The backend phase should add many well-designed features ([feature-roadmap.md](../backend/feature-roadmap.md)), built on Cloudflare, tested in CI, with no destructive change to production data and no secrets in the repository. Research: [docs/backend/research.md](../backend/research.md).

## Decision

1. **Where the code runs.** New backend features live in this repository under `server/` and run in the existing `dualmind-arena` Worker, mounted at **`/api/v2/*`** with a small router (Hono). `/api/*` (v1) keeps proxying to the DualMind API unchanged. Same deploy path (Workers Builds), same previews. A separate Worker joined by a service binding stays an option if CPU or bundle size ever demand it.
2. **Data ownership.**
   - Supabase stays the identity provider; the DualMind API stays the system of record for users, threads, battles and votes.
   - Cloudflare **D1** holds an **edge ledger**: an append-only record of the battles and votes that pass through the proxy (comparison id, model ids and sides, prompt hash, category, lengths, latency, vote choice, a salted hash of the user id). It is a read model for analytics features (ratings with confidence intervals, history, head-to-head, categories, personal stats). It never stores prompt or answer text by default, and nothing writes back into the DualMind API's data.
   - Derived data (rating runs, snapshots, caches) lives in D1 and **KV**; exports and images in **R2**.
   - The capture is the Worker's own observation of traffic; it adds no dual writes to the system of record. Coverage starts when the new web app (which uses the proxy for every call) handles the traffic.
3. **Production data safety.** Two D1 databases, `DB` (production) and `DB_PREVIEW`. The Worker picks `DB` only when the request's host is `arena.dualmindlab.tech`; previews (`*.workers.dev`), local runs and tests use `DB_PREVIEW` or Miniflare. Migrations are additive only (new tables and columns, no drops or rewrites of data), reviewed in a PR, applied to the preview database first.
4. **API conventions for `/api/v2`.**
   - JSON, camelCase only, cursor pagination (`?cursor=&limit=`), ISO 8601 times.
   - Errors as RFC 9457 `application/problem+json` with `type`, `title`, `status`, `detail`, `requestId`; one shape everywhere.
   - `Idempotency-Key` on every `POST` that creates something; replays return the stored response.
   - Rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After` on 429).
   - The contract is written as zod schemas and published as **OpenAPI 3.1** (generated, committed, checked in CI against the code).
5. **Auth.** The Worker verifies Supabase access tokens itself (JWKS with `jose` when the project uses asymmetric signing keys; otherwise the project's JWT secret as a Worker secret) and puts the user id on the request context. Public reads need no token; per-user features require one.
6. **Abuse and safety.** The Workers Rate Limiting binding (per user, falling back to a hashed IP), Turnstile for anonymous write paths, prompt moderation with a guard model on Workers AI before a battle is forwarded, and a vote-integrity job (duplicates, minimum read time, bursts, side bias, identity leaks) that flags votes instead of deleting them.
7. **Heavy computation.** Bradley-Terry fits with bootstrap confidence intervals run as a scheduled job. On Workers Paid it is a Cron Trigger plus a Workflow in the Worker; on the Free plan it runs in GitHub Actions (nightly), reads the ledger through the Cloudflare API and writes rating runs back. Either way each run is stored with a `methodologyVersion` and its inputs' time window, so results are reproducible.
8. **Observability.** A request id on every call (already done by the proxy), structured JSON logs, Workers Logs, and Workers Analytics Engine metrics (requests, latency and errors per route, battles per model, vote counts) feeding a public status page and an internal dashboard.
9. **Testing.** Vitest with Cloudflare's Workers test integration (Miniflare with real D1, KV, Queues and Durable Object bindings) for unit and integration tests; contract tests that check every `/api/v2` response against the OpenAPI document; end-to-end tests through `wrangler dev` as today. All in GitHub Actions; nothing heavy on the VM.

## Consequences

- Features ship without touching the DualMind API's code or data, and each one can be switched off by removing its route.
- The ledger only sees traffic that goes through the proxy. Historic votes stay in the system of record; ratings computed from the ledger start from the day capture begins, and the leaderboard says so.
- The Worker grows; route modules stay small and each has its own tests.
- Some features need account resources or settings that only Harsh can create (D1 databases, KV, Turnstile site key and secret, Workers plan). Code is written so a missing binding returns `501 not_enabled` instead of failing, so PRs can merge before the resources exist; a short "activation" PR adds the bindings to `wrangler.jsonc` afterwards.

## Alternatives considered

- **Build the features in the ASP.NET API:** keeps one backend, but it is a separate private repository and deploy pipeline, and the brief is to build on Cloudflare.
- **Move the system of record to D1:** cleaner long term, but a migration of production data and of the API's responsibilities; too risky for this phase.
- **Read the raw votes from Supabase Postgres through Hyperdrive:** gives full history, but needs a database credential and couples the Worker to the API's schema. Kept as a later option for back-filling the ledger, read-only.
- **A separate `dualmind-api` Worker:** cleaner separation, but a second Workers Builds project to connect in the dashboard. Revisit if needed.
