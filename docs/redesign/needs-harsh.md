# Needs Harsh

Things only Harsh can do (dashboard access, purchases, decisions). Work continues around them. Newest first; tick an item off by moving it to "Done".

Last updated: 2026-10-21 04:15 UTC.

## Open

| # | What | Why | When it blocks |
| --- | --- | --- | --- |
| 7 | **Backend phase: open answers.** (a) Is the Supabase project on asymmetric JWT signing keys (Settings > JWT Keys)? If not, the Worker needs `SUPABASE_JWT_SECRET` (you set it with `wrangler secret put`). (b) A `PRIVACY_SALT` Worker secret for hashed IPs in rate limits (you set it; any long random string). (c) Same-origin only for `/api/v2` (no CORS for other sites)? (d) Should the Mintlify developer docs import the v2 OpenAPI file? (e) Is the account on Workers Paid (decides where rating jobs run)? | Auth verification, rate limits and docs for the backend waves | Backend wave W1 (a, b); later (c-e) |
| 8 | **Terms of service: governing law.** The new terms keep the old wording ("applicable laws", binding arbitration, no jurisdiction named). Pick the country/state whose law applies, or say "remove arbitration". | A real legal page should name it | Never blocks |
| 1 | **Sign-in settings for the new pages (slice S6, [PR #43](https://github.com/dualmindlabs/DualMind_UI/pull/43)).** (a) **Before the cutover (S13), not needed to merge S6:** in Cloudflare, Workers & Pages > `dualmind-arena` > Settings > Build > **Build variables**, add `VITE_SUPABASE_URL` (the project URL, the value `supabase.url` has in `config.js`) and `VITE_SUPABASE_ANON_KEY` (the public anon key from `config.js`; never the service-role key), for production and preview builds. Until then `build.js` reads the same public values from `config.js`, which S13 deletes. (b) **Supabase: nothing needed for production.** Every redirect target stays the same (`/auth-callback.html`, `/update-password.html`, the bare origin for OAuth). (c) **Optional, only to test sign-in on PR previews:** in Supabase, Authentication > URL Configuration > Redirect URLs, add `https://*-dualmind-arena.creharsh.workers.dev/**` and keep every existing entry. | Without (a) sign-in stops working when `config.js` goes at the cutover; (c) lets email links and OAuth return to preview URLs | (a) before S13; (c) never blocks |
| 2 | **Old Vercel project** `v0-dual-mind-ui`: disconnect it from the GitHub repo (Vercel dashboard > project > Settings > Git, or delete the project). | It fails on every commit and makes every PR look "unstable" (KNOWN_ISSUES.md #11) | Never blocks; cosmetic |
| 3 | **Paid component kits:** read [buy-list.md](./buy-list.md). Nothing paid is copied until you decide; purchased code needs a private repo or must stay out of this public one. | Better blocks for the landing and app screens | Never blocks |
| 4 | **Aceternity UI (optional):** email support@aceternity.com asking for a written OK to keep a few free components in a public portfolio repository. | Its licence does not say whether a public repo counts as redistribution ([licences.md](./licences.md)) | Never blocks; we keep the count small |
| 5 | **Local checkout:** `~/projects/DualMind_UI` on the VM has an uncommitted edit to `wrangler.jsonc` (an `observability` line without a trailing comma, which breaks the file). Keep or discard it. | The repo's `wrangler.jsonc` on master is fine; this is only the local copy | Never blocks |

## Done

| Date | What |
| --- | --- |
| 2026-10-21 | Approved creating D1/KV/Queue/R2 resources (done, [#46](https://github.com/dualmindlabs/DualMind_UI/pull/46)) and additive D1 migrations applied by GitHub Actions (preview first, production after merge, never drops or rewrites, rollback note in each PR) |
| 2026-10-21 | Approved the backend direction (Supabase and the Azure API stay; add-ons on Cloudflare) and asked for more features |
| 2026-10-20 | Approved the design direction, clean auth URLs, removal of ads and the careers page; deploys stay on Workers Builds; repo stays public; use the best components and buy licences later if worth it |
