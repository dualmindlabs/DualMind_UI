# Redesign status

The running log of the Arena redesign: what merged, what is in progress, what comes next. One line per change, newest first, written so it can be copied into Notion as is. Plan and slice numbers: [migration-plan.md](./migration-plan.md) section 8. Things that need Harsh: [needs-harsh.md](./needs-harsh.md).

Last updated: 2026-10-21 13:55 UTC. Definition of done: [startup-grade-checklist.md](./startup-grade-checklist.md).

## Merged

| Date (UTC) | PR | What |
| --- | --- | --- |
| 2026-10-21 | [#58](https://github.com/dualmindlabs/DualMind_UI/pull/58) | **S11 share:** share dialog (private, unlisted, public), `/share/<id>` page with the reveal applied, per-share link previews injected by the Worker, branded share card; share links work again (KNOWN_ISSUES #3) |
| 2026-10-21 | [#56](https://github.com/dualmindlabs/DualMind_UI/pull/56) | [UI audit](./ui-audit.md) of every screen with a prioritized fix list and a performance plan |
| 2026-10-21 | [#53](https://github.com/dualmindlabs/DualMind_UI/pull/53) | **S8 arena B:** blind battles, vote bar (keys 1-4), reveal with names and metrics shown only after the vote, follow-ups, side by side and direct (streaming), offline vote queue; **the new arena is the default** at signed-in `/` (`?arena=legacy` for one release) |
| 2026-10-21 | [#52](https://github.com/dualmindlabs/DualMind_UI/pull/52) | **S8 arena A:** arena shell, thread history (grouped, searchable, rename, delete), composer with mode switch and model picker, hardened Markdown |
| 2026-10-21 | [#55](https://github.com/dualmindlabs/DualMind_UI/pull/55) | ADR 0008, [startup-grade checklist](./startup-grade-checklist.md), backend approvals |
| 2026-10-21 | [#54](https://github.com/dualmindlabs/DualMind_UI/pull/54) | Review of the API repository ([api-repo-review.md](../backend/api-repo-review.md)): data model, endpoints, root causes of the contract problems, migration plan, first .NET PRs |
| 2026-10-21 | [#51](https://github.com/dualmindlabs/DualMind_UI/pull/51) | **BE-3 rate limits:** per-user limits with IETF RateLimit headers, 429 problem+json with Retry-After, client toast, vote queue respects Retry-After |
| 2026-10-21 | [#49](https://github.com/dualmindlabs/DualMind_UI/pull/49) | **BE-1 + BE-2:** one problem+json error shape at the proxy (opt-in), working text-to-speech route (KNOWN_ISSUES #7 fixed) |
| 2026-10-21 | [#48](https://github.com/dualmindlabs/DualMind_UI/pull/48) | **BE-0 `/api/v2` platform:** Hono + zod-openapi, problem+json, request context, Supabase JWT verification, binding chooser, OpenAPI with drift check; live at `/api/v2/health` |
| 2026-10-21 | [#47](https://github.com/dualmindlabs/DualMind_UI/pull/47) | Backend approvals and resources recorded |
| 2026-10-21 | [#43](https://github.com/dualmindlabs/DualMind_UI/pull/43) | **S6 sign-in:** one Supabase client, `/login/` `/signup/` `/forgot-password/` (301s from the old pages), email-link pages at the same addresses, session migration, OTP and OAuth; verified on production |
| 2026-10-21 | [#46](https://github.com/dualmindlabs/DualMind_UI/pull/46) | Backend resources created on Cloudflare (D1, KV, Queues, R2, each with a preview copy) and bound to the Worker; [resources.md](../backend/resources.md) |
| 2026-10-21 | [#45](https://github.com/dualmindlabs/DualMind_UI/pull/45) | Backend wave 1 design documents ([BE-0 to BE-5](../backend/designs/README.md)) |
| 2026-10-21 | [#44](https://github.com/dualmindlabs/DualMind_UI/pull/44) | Status log and morning summary update |
| 2026-10-21 | [#41](https://github.com/dualmindlabs/DualMind_UI/pull/41) | **S4 info, legal, 404:** about (with credits and licences), how it works (timeline, beam diagram, rating section), FAQ (deep links, FAQPage data), privacy, terms, cookies (summary, table of contents, print styles), 404 with a real status; sitemap and robots generated at build |
| 2026-10-21 | [#40](https://github.com/dualmindlabs/DualMind_UI/pull/40) | **S3 landing:** live hero with the real prompt box, live numbers, model strip, playable recorded demo battle with reveal, "fair by design" bento, timeline, live top 5, OG image; signed-in visitors handed to the old app until the arena slice. Lighthouse mobile: accessibility, best practices and SEO 100, performance 80-83 |
| 2026-10-21 | [#38](https://github.com/dualmindlabs/DualMind_UI/pull/38) | **S7 leaderboard and models:** public live data without sign-in, podium, sortable and searchable table, provider filter, provisional badge under 100 battles, details sheet with chart, phone card layout; live model directory |
| 2026-10-21 | [#39](https://github.com/dualmindlabs/DualMind_UI/pull/39) | Shared API provider and page meta helper (Open Graph, JSON-LD) |
| 2026-10-21 | [#37](https://github.com/dualmindlabs/DualMind_UI/pull/37) | Status log update and morning summary |
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
| Audit fix 1 | [#57](https://github.com/dualmindlabs/DualMind_UI/pull/57) | Landing performance: hero paints first, lazy tooltip and API client, split below-the-fold sections |

## Next

1. Remaining audit fix PRs ([ui-audit.md](./ui-audit.md)): fonts and CSS; Lighthouse on six routes plus state screenshots and failing budgets; leaderboard data presentation (display names, provisional handling) plus share cards for leaderboard and models; arena polish (display names on reveal, syntax highlighting, shortcuts overlay); touch targets, auth dead ends, credits page, one tagline.
2. S12 settings, S13 cutover (legacy files removed, CSP everywhere, build variables for Supabase), i18n readiness, README screenshots.
3. Backend work is paused by Harsh until he says so (docs for BE-25 to BE-34 are allowed).
