# Startup-grade checklist

Harsh's bar (2026-10-21): DualMind should feel like a real, professional AI company. This page turns that into acceptance criteria. **It is the definition of done for every slice**: a PR states which items it moves and must not move any backwards.

Status marks: ✅ done · 🟡 partly done · ⬜ not started. Last reviewed: 2026-10-21 09:00 UTC.

## Backend

| # | Criterion | Status | Where / next step |
| --- | --- | --- | --- |
| B1 | Versioned API with an OpenAPI document | 🟡 | `/api/v2` + committed OpenAPI with a drift check ([#48](https://github.com/dualmindlabs/DualMind_UI/pull/48)); the .NET API's own `openapi.yaml` is wrong (api-repo-review.md) |
| B2 | Developer portal `/developers/`: quickstart, auth, errors, rate limits, changelog, status link, curl/JS/Python snippets | ⬜ | BE-5 (design ready) |
| B3 | One problem+json error shape everywhere | 🟡 | At the edge ([#49](https://github.com/dualmindlabs/DualMind_UI/pull/49)); at the source in .NET W1 |
| B4 | Idempotency on creating requests | ⬜ | BE-6 in .NET W1 (mint `comparisonId` first + `Idempotency-Key`) |
| B5 | Cursor pagination on list endpoints | ⬜ | .NET W1/W2 (threads, messages) |
| B6 | Request ids end to end | 🟡 | Worker + client ([#24](https://github.com/dualmindlabs/DualMind_UI/pull/24)); .NET logging next |
| B7 | Structured logs + metrics | ⬜ | Analytics Engine (BE-20) + .NET structured logging |
| B8 | Public status page with uptime and latency | ⬜ | BE-20 |
| B9 | Health and readiness endpoints | 🟡 | `/health`, `/api/v2/health` ✅; readiness (DB, auth reachability) next |
| B10 | Rate limits and abuse protection | 🟡 | Rate limits ✅ ([#51](https://github.com/dualmindlabs/DualMind_UI/pull/51)); vote validation, sign-in on write routes, Turnstile next |
| B11 | Security headers, CSP | ✅ | Enforced CSP on new pages, headers ([#24](https://github.com/dualmindlabs/DualMind_UI/pull/24)) |
| B12 | Secrets hygiene | 🟡 | No secrets in the UI repo; GitGuardian ✅; the API uses the Supabase service-role key broadly (review finding) |
| B13 | Dependency and CodeQL scanning | 🟡 | Dependabot + CodeQL on the UI repo ✅; check the API repo |
| B14 | 80%+ test coverage on core logic | 🟡 | Web API client 98% ✅; Worker modules tested; .NET coverage unknown |
| B15 | Contract tests and load tests (k6 in Actions, results in docs) | ⬜ | After .NET W1 |
| B16 | Migrations with rollback notes | 🟡 | Process approved and documented; the .NET DB has no migrations in the repo yet |
| B17 | Runbooks (incident, backup/restore) and written SLOs | ⬜ | After the status page |
| B18 | CHANGELOG + semantic releases | 🟡 | CHANGELOG ✅; release tags next |
| B19 | ADRs | ✅ | 0001-0008 |

## Frontend

| # | Criterion | Status | Where / next step |
| --- | --- | --- | --- |
| F1 | Design-system consistency (tokens, one kit) | ✅ | Tokens, 30 primitives, `/design/` |
| F2 | Polished empty, loading and error states everywhere | 🟡 | Done on landing, leaderboard, models, auth, info; arena in S8 |
| F3 | Accessibility AA (axe in CI, keyboard, reduced motion) | 🟡 | axe zero serious/critical on every page ✅; manual screen-reader pass ⬜ |
| F4 | Lighthouse 90+ on every page | 🟡 | A11y/best practices/SEO 100; performance 80-83 on `/` (shared JS ~300 KB): S14 |
| F5 | Performance budgets enforced in CI | 🟡 | Budgets exist but warn; make them fail after S14 |
| F6 | SEO + OG cards | 🟡 | Meta, canonical, JSON-LD, sitemap ✅; OG image on `/`; shared battles get per-link tags (first prompt) and a share card from the Worker (S11, [#58](https://github.com/dualmindlabs/DualMind_UI/pull/58)); leaderboard and models images next; per-battle images are BE-19 |
| F7 | i18n-ready (strings out of components) | ⬜ | Content files exist for info pages; extract UI strings in S14 |
| F8 | Analytics-free privacy page that matches reality | ✅ | [#35](https://github.com/dualmindlabs/DualMind_UI/pull/35), [#41](https://github.com/dualmindlabs/DualMind_UI/pull/41) |
| F9 | Interaction feel: press/hover/focus states, motion tokens, reduced motion | ✅ | Kit + effects library |
| F10 | Real copywriting | ✅ | Landing, info, legal; arena copy in S8 |
| F11 | The core product screen (arena: battle, vote, reveal, history) on the new design | 🟡 | S8 PRs [#52](https://github.com/dualmindlabs/DualMind_UI/pull/52) / [#53](https://github.com/dualmindlabs/DualMind_UI/pull/53) |

## Repository

| # | Criterion | Status | Where / next step |
| --- | --- | --- | --- |
| R1 | README with architecture diagram, screenshots/GIF, badges | 🟡 | Diagram + badges ✅; screenshots/GIF of the new UI ⬜ |
| R2 | CONTRIBUTING, SECURITY.md, CODE_OF_CONDUCT | ✅ | |
| R3 | Issue and PR templates | ✅ | |
| R4 | Public roadmap | 🟡 | `docs/redesign/`, `docs/backend/feature-roadmap.md`; a short ROADMAP.md ⬜ |

## How to use it

- Each slice PR lists the checklist items it moves (e.g. "B4 ⬜ → ✅").
- dm-design-lead updates the marks when a slice merges, together with [status.md](./status.md).
