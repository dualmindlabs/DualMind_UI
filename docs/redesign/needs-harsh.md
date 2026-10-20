# Needs Harsh

Things only Harsh can do (dashboard access, purchases, decisions). Work continues around them. Newest first; tick an item off by moving it to "Done".

Last updated: 2026-10-20 22:00 UTC.

## Open

| # | What | Why | When it blocks |
| --- | --- | --- | --- |
| 1 | **Supabase redirect allow-list.** In Supabase, Authentication > URL Configuration > Redirect URLs, keep every existing entry and add: `https://arena.dualmindlab.tech/**`, `https://*-dualmind-arena.creharsh.workers.dev/**`, `http://localhost:5173/**`. Site URL stays `https://arena.dualmindlab.tech`. | Lets sign-in, email links and OAuth return to the new pages and to PR previews | Before the auth slice (S6) merges |
| 2 | **Old Vercel project** `v0-dual-mind-ui`: disconnect it from the GitHub repo (Vercel dashboard > project > Settings > Git, or delete the project). | It fails on every commit and makes every PR look "unstable" (KNOWN_ISSUES.md #11) | Never blocks; cosmetic |
| 3 | **Paid component kits:** read [buy-list.md](./buy-list.md). Nothing paid is copied until you decide; purchased code needs a private repo or must stay out of this public one. | Better blocks for the landing and app screens | Never blocks |
| 4 | **Aceternity UI (optional):** email support@aceternity.com asking for a written OK to keep a few free components in a public portfolio repository. | Its licence does not say whether a public repo counts as redistribution ([licences.md](./licences.md)) | Never blocks; we keep the count small |
| 5 | **Local checkout:** `~/projects/DualMind_UI` on the VM has an uncommitted edit to `wrangler.jsonc` (an `observability` line without a trailing comma, which breaks the file). Keep or discard it. | The repo's `wrangler.jsonc` on master is fine; this is only the local copy | Never blocks |

## Done

| Date | What |
| --- | --- |
| 2026-10-20 | Approved the design direction, clean auth URLs, removal of ads and the careers page; deploys stay on Workers Builds; repo stays public; use the best components and buy licences later if worth it |
