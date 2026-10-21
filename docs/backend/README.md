# Backend phase

Documents for the DualMind backend features built on Cloudflare after the frontend redesign.

| Document | What it holds |
| --- | --- |
| [research.md](./research.md) | What leading AI arenas and evaluation sites offer, ranking methods and vote integrity, the Cloudflare platform |
| [feature-roadmap.md](./feature-roadmap.md) | 35 backend features (BE-0 to BE-34) with impact, effort, Cloudflare services, account needs and the build waves |
| [approvals.md](./approvals.md) | What Harsh approved for the backend phase, with guardrails |
| [resources.md](./resources.md) | The Cloudflare resources created for the backend (D1, KV, Queues, R2) and their bindings |
| [api-repo-review.md](./api-repo-review.md) | Review of the existing `DualMind_Back` repository: data model, endpoints diffed against the UI contract, root causes of the four contract problems, and a migration plan with a first-PR list |
| [ADR 0007](../adr/0007-backend-on-cloudflare.md) | The architecture: `/api/v2` in the Arena Worker, an edge ledger in D1, production data safety, API conventions, auth, testing |
| [designs/](./designs/README.md) | One design document per feature, written before its build PR (W1, BE-0 to BE-5, is written and built; W6, BE-25 to BE-34, is written and not built; shared conventions and open questions for BE-25 to BE-34 are in its README) |

The existing API contract (v1) is in [docs/api/endpoints.md](../api/endpoints.md).
