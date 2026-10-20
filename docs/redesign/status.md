# Redesign status

The running log of the Arena redesign: what merged, what is in progress, what comes next. One line per change, newest first, written so it can be copied into Notion as is. Plan and slice numbers: [migration-plan.md](./migration-plan.md) section 8. Things that need Harsh: [needs-harsh.md](./needs-harsh.md).

Last updated: 2026-10-20 22:00 UTC.

## Merged

| Date (UTC) | PR | What |
| --- | --- | --- |
| 2026-10-20 | [#24](https://github.com/dualmindlabs/DualMind_UI/pull/24) | **S1b worker hygiene:** enforced CSP on new pages (build-time script hashes), report-only CSP on legacy pages, security headers, caching table, tested redirects table, hardened `/api` proxy (header allow-list, request ids, no CORS, clean 502/504) |
| 2026-10-20 | [#23](https://github.com/dualmindlabs/DualMind_UI/pull/23) | Licence inventory ([licences.md](./licences.md)) and a ranked [buy list](./buy-list.md) for paid component kits |
| 2026-10-20 | [#22](https://github.com/dualmindlabs/DualMind_UI/pull/22) | **S1 foundation:** `web/` app (React 19, React Router 8 SPA + prerender, Vite 8, Tailwind 4, TypeScript strict), design tokens, theme, `/design/` style guide, composed build, Worker asset caching, web CI with screenshots and axe, architecture doc and ADRs 0001-0006 |
| 2026-10-20 | [#21](https://github.com/dualmindlabs/DualMind_UI/pull/21) | [Endpoint map](../api/endpoints.md): every API call the UI makes, with the contract problems found |
| 2026-10-20 | [#20](https://github.com/dualmindlabs/DualMind_UI/pull/20) | Removed the ad tags, `ads.txt`, the third-party `sw.js` and the copied careers page (`/careers/` redirects to `/about/`) |
| 2026-10-20 | [#19](https://github.com/dualmindlabs/DualMind_UI/pull/19) | Redesign plan: design direction, screen inventory, migration plan, new features, component catalog |

## In progress

| Slice | PR | What |
| --- | --- | --- |
| S2a | (open soon) | shadcn/ui primitives, site header, footer, mobile nav, command palette, toasts |
| S2b | (open soon) | Vendored effects (React Bits, Magic UI, Motion Primitives, Aceternity free) with reduced-motion and WebGL gates |
| S5 | (open soon) | Typed API client: schemas, error model, retries, request ids, SSE parser, vote queue, mock adapter |
| Fix | [#30](https://github.com/dualmindlabs/DualMind_UI/pull/30) | 65 s proxy timeout for battle and chat calls |
| Backend research | docs | Arena products, ranking methods and vote integrity, Cloudflare stack, feeding `docs/backend/` |

## Next

1. S3 landing page (`/` for signed-out visitors), S4 info and legal pages, S7 leaderboard and models, S6 auth (merge waits on the Supabase allow-list, see needs-harsh.md).
2. S8-S12: arena shell, battle flow and reveal, side by side and direct modes, share, settings.
3. S13 cutover (legacy files removed), S14 quality pass.
4. Backend phase: research, feature roadmap, designs as ADRs, then slices with API tests.
