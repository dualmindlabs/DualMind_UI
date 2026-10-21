# Backend approvals

Decisions Harsh made for the backend phase, with the date and the guardrails that come with them. Newest first.

| Date (UTC) | Approval | Guardrails |
| --- | --- | --- |
| 2026-10-21 08:51 | Keep .NET: new data features go into `dualmindlabs/DualMind_Back` ([ADR 0008](../adr/0008-features-in-the-dotnet-api.md)) | Branches + PRs with CI; heavy `dotnet` work only in GitHub Actions; no deploy and no database migration without Harsh's go |
| 2026-10-21 08:40 | Use the API repository `dualmindlabs/DualMind_Back` (read first, then PRs) | Never push `master`; review first ([api-repo-review.md](./api-repo-review.md)) |
| 2026-10-21 08:37 | The connected database holds **test data**: test battles and `POST`s on previews are fine; schema/table redesign allowed where the backend needs it | Schema changes only via reviewed PRs with migrations and a rollback note; no mass deletes until Harsh says "clean up"; real users' data, if any appears, stays untouched; no secrets in the repo |
| 2026-10-21 04:00 | Additive D1 migrations applied by GitHub Actions | Preview database first, production after merge; additive only; rollback note in each PR |
| 2026-10-21 03:44 | Backend direction; create the D1/KV/Queue/R2 resources (done, [resources.md](./resources.md)) | Non-destructive creation only |
| Not approved yet | `PRIVACY_SALT` Worker secret, same-origin-only `/api/v2`, Mintlify import of the v2 OpenAPI, Azure/Containers deploy of `DualMind_Back` changes | Ask first |
