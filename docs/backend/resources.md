# Backend resources on Cloudflare

The Cloudflare resources created for the backend phase ([ADR 0007](../adr/0007-backend-on-cloudflare.md), [feature roadmap](./feature-roadmap.md)). Created on 2026-10-21 with wrangler 4.149.0 from the VM's logged-in session, on Harsh's approval of 2026-10-21 ("OK to create D1/KV/Queue/R2 resources"). Account: **DualMind Labs**. IDs are not secrets; they are also in `wrangler.jsonc`.

| Kind | Name | ID | Binding | Purpose |
| --- | --- | --- | --- | --- |
| D1 | `dualmind-arena-ledger` | `19fc71bd-1236-4f5e-af29-c618bc58e2e6` | `DB` | Production ledger: idempotency keys, battle and vote events, rating runs, snapshots |
| D1 | `dualmind-arena-ledger-preview` | `f2f963c9-1ed6-499e-b11e-285897228b89` | `DB_PREVIEW` | Same schema for previews, local runs and tests |
| KV | `dualmind-arena-cache` | `7906c64bd2ce42ed987eab78490d5ee4` | `CACHE` | Production caches (leaderboard, head-to-head, moderation verdicts) |
| KV | `dualmind-arena-cache-preview` | `915a45a0464a4ea982b9740c9aae03ec` | `CACHE_PREVIEW` | Preview caches |
| Queue | `arena-events` | | `EVENTS` (producer) | Production battle and vote events for the ledger |
| Queue | `arena-events-dlq` | | (dead-letter for `arena-events`) | Failed production events |
| Queue | `arena-events-preview` | | `EVENTS_PREVIEW` (producer) | Preview events |
| Queue | `arena-events-preview-dlq` | | (dead-letter) | Failed preview events |
| R2 | `dualmind-arena-public` | | `PUBLIC_BUCKET` | Share-card images, open dataset exports |
| R2 | `dualmind-arena-public-preview` | | `PUBLIC_BUCKET_PREVIEW` | Preview copies |

## Production vs preview

Cloudflare Workers Builds deploys production from `master` and uploads a preview version for every branch, with the **same** bindings. To keep previews away from production data, code chooses the binding by host: the production binding only when the request host is `arena.dualmindlab.tech`, the `*_PREVIEW` binding otherwise. Tests and `wrangler dev` use local simulations of both.

## Not touched

The account already has a D1 database named `dualmind_arena` (`755b2a52-…`) that predates this work. It is not used or changed by the backend phase.

## Migrations

Approved by Harsh on 2026-10-21: additive D1 migrations are applied by GitHub Actions, to the preview database first and to production after the PR merges. Additive only (new tables, columns, indexes), never drops or rewrites, always reviewed in a PR with a rollback note.

## Still to decide


- Queue consumers are added with the first feature that processes events; Queues may need the Workers Paid plan for consumers at volume.
