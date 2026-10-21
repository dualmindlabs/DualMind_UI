# 0008. Data features live in the .NET API; the Worker keeps edge concerns

- Status: Accepted (2026-10-21); amends [ADR 0007](./0007-backend-on-cloudflare.md)
- Date: 2026-10-21
- Deciders: @harshbhx

## Context

ADR 0007 proposed building the backend features (ledger, ratings, integrity, personal stats and more) as `/api/v2` routes in the Arena Worker, with an edge ledger in D1 as a read model. The [review of the API repository](../backend/api-repo-review.md) since showed that the DualMind API (ASP.NET Core, `dualmindlabs/DualMind_Back`, hosted on Cloudflare Containers) owns the real data and has the fixable root causes of the contract problems: `comparisonId` minted after both providers finish (duplicate battles on retry), fallback answers recorded as the original model's, unauthenticated routes, unvalidated votes, six error body shapes. Fixing them at the source beats compensating at the edge. Harsh decided on 2026-10-21: keep .NET and add the new backend features there.

## Decision

1. **Data features live in the .NET API** (`dualmindlabs/DualMind_Back`), with real database tables, migrations in that repository, tests in `tests/DualMind.API.Tests`, and CI through its existing workflow (heavy `dotnet` work only in GitHub Actions). This covers: idempotency keys, battle and vote integrity, ratings (Bradley-Terry with confidence intervals), rating history, categories, head-to-head, personal stats, fair pairing, data controls, moderation of stored content, and a streaming `dualchat` endpoint.
2. **The Cloudflare Worker keeps edge concerns:** the hardened `/api` proxy, problem+json normalisation (BE-1), the TTS alias (BE-2), rate limits (BE-3), caching (BE-4), security headers and CSP, the already merged `/api/v2` edge routes (health, OpenAPI), the developer portal and machine-readable pages (BE-5), the streaming edge arena on Workers AI (BE-17), share cards (BE-19), live updates (BE-18) and the status page (BE-20).
3. **D1, KV, Queues and R2** (already created, [resources.md](../backend/resources.md)) stay for edge needs: caches, status history, share-card images, and edge-arena battles. The "edge ledger" of ADR 0007 is dropped; the .NET API's database is the single source of truth.
4. **Guardrails:** changes to `DualMind_Back` go through branches and PRs with CI; no deploy and no migration against its database without Harsh's go; migrations are reviewed with a rollback note; no mass deletes until Harsh says "clean up" (the database currently holds test data).

## Consequences

- The contract problems are fixed where they start; the UI's typed client and the Worker's normalisation stay as defence in depth.
- Two repositories ship backend features; the roadmap marks where each feature lives.
- The .NET work depends on Harsh's go for deploys of `DualMind_Back`.

## Alternatives considered

- **Keep ADR 0007 (features in the Worker, edge ledger):** no access needed to the API, but it duplicates data, cannot fix the root causes, and splits the source of truth.
- **Rewrite the API on Workers:** rejected by Harsh (keep .NET).
