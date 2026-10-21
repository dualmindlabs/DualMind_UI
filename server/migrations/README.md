# D1 migrations

Numbered SQL migrations for the backend ledger databases (`DB` = `dualmind-arena-ledger`, `DB_PREVIEW` = `dualmind-arena-ledger-preview`), applied with `wrangler d1 migrations apply`.

Rules (ADR 0007, docs/backend/feature-roadmap.md section 4):

- Additive only: new tables, new columns, new indexes. Never drop or rewrite production data.
- Each migration ships in the PR of the feature that needs it, with its design document.
- Applied to the preview database first. How migrations reach production is still an open decision (docs/redesign/needs-harsh.md); until then nobody applies them to production.
