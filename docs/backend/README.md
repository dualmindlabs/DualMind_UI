# Backend phase

Documents for the DualMind backend features built on Cloudflare after the frontend redesign.

| Document | What it holds |
| --- | --- |
| [research.md](./research.md) | What leading AI arenas and evaluation sites offer, ranking methods and vote integrity, the Cloudflare platform |
| [feature-roadmap.md](./feature-roadmap.md) | 25 backend features (BE-0 to BE-24) with impact, effort, Cloudflare services, account needs and the build waves |
| [ADR 0007](../adr/0007-backend-on-cloudflare.md) | The architecture: `/api/v2` in the Arena Worker, an edge ledger in D1, production data safety, API conventions, auth, testing |
| [designs/](./designs/README.md) | One design document per feature, written before its build PR (wave W1, BE-0 to BE-5, is written) |

The existing API contract (v1) is in [docs/api/endpoints.md](../api/endpoints.md).
