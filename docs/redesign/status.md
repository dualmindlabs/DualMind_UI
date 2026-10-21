# Redesign status

The running log of the Arena redesign: what merged, what is in progress, what comes next. One line per change, newest first, written so it can be copied into Notion as is. Plan and slice numbers: [migration-plan.md](./migration-plan.md) section 8. Things that need Harsh: [needs-harsh.md](./needs-harsh.md).

Last updated: 2026-10-21 01:10 UTC.

## Merged

| Date (UTC) | PR | What |
| --- | --- | --- |
| 2026-10-21 | [#34](https://github.com/dualmindlabs/DualMind_UI/pull/34) | **S2a UI kit and shell:** 30 shadcn/ui primitives (Base UI) on our tokens, site header (transparent, condenses into a pill), app header, footer, phone menu (Base UI drawer), command palette (Ctrl/Cmd+K), toasts, prose styles |
| 2026-10-20 | [#36](https://github.com/dualmindlabs/DualMind_UI/pull/36) | **S2b effects library:** 27 effects (React Bits, Magic UI, Motion Primitives, Aceternity free tier) ported to our tokens, each with a reduced-motion version, WebGL gate with static posters, licence headers and inventory |
| 2026-10-20 | [#35](https://github.com/dualmindlabs/DualMind_UI/pull/35) | Content for about, how it works, FAQ, privacy, terms and cookies; privacy and cookies now match what the site really does |
| 2026-10-20 | [#33](https://github.com/dualmindlabs/DualMind_UI/pull/33) | **S5 typed API client:** 20 endpoint functions, zod schemas, one error model, GET-only retries, request ids, SSE parser, offline vote queue, mock adapter; 236 tests, 98% coverage |
| 2026-10-20 | [#32](https://github.com/dualmindlabs/DualMind_UI/pull/32) | Backend plan: [research](../backend/research.md), [feature roadmap](../backend/feature-roadmap.md) (25 features in 5 waves), [ADR 0007](../adr/0007-backend-on-cloudflare.md) |
| 2026-10-20 | [#31](https://github.com/dualmindlabs/DualMind_UI/pull/31) | This status log and [needs-harsh.md](./needs-harsh.md) |
| 2026-10-20 | [#30](https://github.com/dualmindlabs/DualMind_UI/pull/30) | API proxy: 65 s timeout for battle and chat calls |
| 2026-10-20 | [#24](https://github.com/dualmindlabs/DualMind_UI/pull/24) | **S1b worker hygiene:** enforced CSP on new pages (build-time script hashes), report-only CSP on legacy pages, security headers, caching table, tested redirects table, hardened `/api` proxy (header allow-list, request ids, no CORS, clean 502/504) |
| 2026-10-20 | [#23](https://github.com/dualmindlabs/DualMind_UI/pull/23) | Licence inventory ([licences.md](./licences.md)) and a ranked [buy list](./buy-list.md) for paid component kits |
| 2026-10-20 | [#22](https://github.com/dualmindlabs/DualMind_UI/pull/22) | **S1 foundation:** `web/` app (React 19, React Router 8 SPA + prerender, Vite 8, Tailwind 4, TypeScript strict), design tokens, theme, `/design/` style guide, composed build, Worker asset caching, web CI with screenshots and axe, architecture doc and ADRs 0001-0006 |
| 2026-10-20 | [#21](https://github.com/dualmindlabs/DualMind_UI/pull/21) | [Endpoint map](../api/endpoints.md): every API call the UI makes, with the contract problems found |
| 2026-10-20 | [#20](https://github.com/dualmindlabs/DualMind_UI/pull/20) | Removed the ad tags, `ads.txt`, the third-party `sw.js` and the copied careers page (`/careers/` redirects to `/about/`) |
| 2026-10-20 | [#19](https://github.com/dualmindlabs/DualMind_UI/pull/19) | Redesign plan: design direction, screen inventory, migration plan, new features, component catalog |

## In progress

| Slice | PR | What |
| --- | --- | --- |
| S3 | (in progress) | Landing page at `/`: live hero with the real prompt box, recorded demo battle, live numbers, leaderboard preview, OG image, Lighthouse budgets |
| S4 | (next) | About, how it works, FAQ, privacy, terms, cookies and 404 on the new shell |
| S7 | (next) | Leaderboard and models pages with live data, filters and model details |

## Next

1. S3 landing page (`/` for signed-out visitors), S4 info and legal pages, S7 leaderboard and models, S6 auth (merge waits on the Supabase allow-list, see needs-harsh.md).
2. S8-S12: arena shell, battle flow and reveal, side by side and direct modes, share, settings.
3. S13 cutover (legacy files removed), S14 quality pass.
4. Backend phase: research, feature roadmap, designs as ADRs, then slices with API tests.
