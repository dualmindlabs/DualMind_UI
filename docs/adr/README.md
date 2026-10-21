# Architecture decision records

Short records of the decisions that shape the Arena frontend: what was decided, why, and what it costs. The overview is in [docs/architecture.md](../architecture.md).

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](./0001-react-vite-react-router-framework-mode.md) | React + Vite + React Router framework mode (SPA + prerender) | Accepted |
| [0002](./0002-strangler-migration-composed-dist.md) | Strangler migration with a composed `dist/` | Accepted |
| [0003](./0003-shadcn-base-ui-and-vendored-effects.md) | shadcn/ui (Base UI) primitives and vendored effects, with their licences | Accepted |
| [0004](./0004-own-battle-state-machine-and-streamdown.md) | Own battle state machine and Streamdown for answers | Accepted |
| [0005](./0005-workers-builds-deploys-and-previews.md) | Cloudflare Workers Builds deploys, with branch preview URLs | Accepted |
| [0006](./0006-same-origin-api-proxy.md) | Same-origin `/api` through a hardened Worker proxy | Accepted |
| [0007](./0007-backend-on-cloudflare.md) | Backend features on Cloudflare at `/api/v2`, with an edge ledger in D1 | Amended by 0008 |
| [0008](./0008-features-in-the-dotnet-api.md) | Data features live in the .NET API; the Worker keeps edge concerns | Accepted |

## Writing a new ADR

1. Copy [template.md](./template.md) to `NNNN-short-title.md` with the next number.
2. Keep it short: the context a reader needs, the decision, the consequences (good and bad) and the options you did not pick.
3. Add it to the table above in the same pull request as the change it describes.
4. Never rewrite an accepted ADR to change the decision: write a new one that supersedes it and set the old one's status to "Superseded by NNNN".
