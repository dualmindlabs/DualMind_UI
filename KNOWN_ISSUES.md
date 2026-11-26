# Known issues: DualMind Arena (frontend)

This file lists verified bugs in the Arena frontend (this repo) and its hosting: the `dualmind-arena` Cloudflare Worker and an old Vercel project. The statuses were refreshed on 2026-11-23 against `master` (`4fb584a`) and the live site at `https://arena.dualmindlab.tech`. The detail sections below keep the evidence from 2026-10-18 and are marked where it is out of date. API, data and backend CI issues are tracked in the backend repo (see the last section).

Found a security problem? Please report it privately to the maintainers instead of opening a public issue.

Last updated: 2026-11-23

**Status:** Confirmed = reproduced in code and/or live. Likely = strong evidence, not reproduced end to end. Not reproduced = could not confirm.
**Numbering:** `#1`–`#11` are the Arena bugs reported on 2026-10-17. The backend file uses the same numbers. `N7` was found while verifying them on 2026-10-18. `N8`-`N10` are new on 2026-11-23.

## Summary

| # | Issue | Severity | Status |
|---|---|---|---|
| 3 | `/share/<id>` links are broken: the id is dropped by a redirect | Medium | Fixed by PR #58 (share page, slice S11) |
| 10 | Last Cloudflare build of `master` failed; the live site runs an older Worker than `master` | Medium | Build fixed (the `master` build passes); live behaviour is the pre-launch gate, see N8 |
| 7 | Text-to-speech calls `/api/audio/tts`, which the API doesn't have (`/api/speech/generate`) | Low | Fixed by PR #49 (Worker alias) |
| 11 | Old Vercel integration (`v0-dual-mind-ui`) fails on every push | Low | Confirmed |
| N7 | Unused API client methods call routes that don't exist | Low | Confirmed in code on 2026-10-18; not re-checked live |
| N8 | The arena host redirects every request, `robots.txt` and `sitemap.xml` included, to the waitlist | Medium | By design until launch; confirmed live 2026-11-23 |
| N9 | `master` still carries the classic arena; the release PR [#87](https://github.com/dualmindlabs/DualMind_UI/pull/87) is open | Medium | Open, waiting for a merge decision |
| N10 | Dead scripts and retired pages sat in the repository root | Low | Fixed by this change: deleted or moved to `legacy/` |

---

## Medium

### 3 · `/share/<id>` links are broken: the id is dropped by a redirect

- **Severity:** Medium · **Status:** Fixed by [PR #58](https://github.com/dualmindlabs/DualMind_UI/pull/58) (redesign slice S11): every share link form (`/share/<id>`, `/share/?id=`, `?thread=`, `?threadId=`) now answers 200 with the web app's share page, never a redirect, and the legacy `share/` page is no longer deployed (`server/share.js`, `server/routing.js`) · **Found:** 2026-10-17 (verified 2026-10-18)
- **Where:**
  - `components/ShareModal.js:33-34` builds links as `/share/<threadId>`.
  - `worker.js:78-96` rewrites every `/share*` request to `/share/index.html` (`:83`) and passes the asset response through. With the default `html_handling` (nothing set in `wrangler.jsonc:12-15`), the asset server answers `/share/index.html` with `307 → /share/`, a relative redirect that loses the id.
  - `components/SharedThreadView.js:26-45` then finds no id in the path or query and shows "Invalid share link".
- **How to reproduce:**
  - `curl -sI https://arena.dualmindlab.tech/share/123e4567-e89b-12d3-a456-426614174000` returns `307` with `location: /share/` (and the `no-store` / `nosniff` / `DENY` headers set by the share handler).
  - Open any real share link in a browser: it lands on `/share/` with "Invalid share link".
  - `https://arena.dualmindlab.tech/share/?id=<threadId>` keeps the id and returns 200.
- **Impact:** every link copied from the Share dialog is dead, so sharing a battle doesn't work.
- **Suggested fix:** in `worker.js:83`, fetch `/share/` (the canonical asset path) instead of `/share/index.html`, and return the page with status 200. Alternatively, set `"html_handling": "none"`, or have `ShareModal.js:34` generate `/share/?id=<id>`. Note that `master`'s waitlist redirect (`worker.js:24-32`) runs before the share handler and would send share links to the waitlist once deployed (see #10).

### 10 · Last Cloudflare build of `master` failed; the live site runs an older Worker than `master`

- **Severity:** Medium · **Status:** Build fixed. On 2026-11-23 the "Workers Builds: dualmind-arena" check on `master` (`4fb584a`) is a success, so the failing build described below is gone. What the live Worker serves is covered by N8. Evidence below is from 2026-10-18. · **Found:** 2026-10-17 (verified 2026-10-18)
- **Where:** Cloudflare Workers Builds for the `dualmind-arena` Worker (`wrangler.jsonc`, `worker.js`, `build.js`).
- **How to reproduce:**
  - `gh api repos/dualmindlabs/DualMind_UI/commits/75eed48/check-runs` shows "Workers Builds: dualmind-arena" = **failure** (2026-08-26 23:53 UTC). The last successful `master` build was `ca59c8f`.
  - The live site doesn't match `master`. `master`'s `worker.js:24-32` sends every non-`/api/` request that reaches the Worker to `https://early.dualmindlab.tech/` with a 302, but production still answers `/share/<id>` with the older share handler (#3) and unknown paths with a plain 404. Production is therefore running a Worker version older than `ca59c8f`, even though that build reported success. Check Workers → `dualmind-arena` → Deployments to see which version is active.
  - The failure doesn't look code-related: the PR #5 preview build (`75eed48` plus docs only) **passed** on 2026-10-17.
- **Impact:** `master` changes from 2026-08-26/27 (waitlist redirect with `ref=arena`, the `build.js` waitlist sync) aren't live, and the deployed state is unclear.
- **Suggested fix:** first decide whether the waitlist redirect should go live; deploying `master` as is sends share links and unknown paths to the waitlist. Then re-run the Workers Build for `master` (or push a new commit) and confirm the active deployment matches.
  - Also note that `/` and other paths that match a static file are served before the Worker runs (no `run_worker_first` in `wrangler.jsonc:12-15`), so the redirect would only cover some URLs (Likely, based on the Workers static-assets default).

---

## Low

### 7 · Text-to-speech calls `/api/audio/tts`, which the API doesn't have (`/api/speech/generate`)

- **Severity:** Low · **Status:** Fixed by PR #49 (the Worker forwards `/api/audio/tts` to `/api/speech/generate`; the legacy code is unchanged, the new typed client already calls the real route) · **Found:** 2026-10-17 (verified 2026-10-18)
- **Where:** `js/api/services/ArenaService.js:89-90` posts `{ text }` to `/api/audio/tts`. The API route is `POST /api/speech/generate` with body `{ text, voice? }`, which returns `audio/wav`. The caller is `js/ui/app.js:1414`, and its fallback to the browser's `speechSynthesis` is at `js/ui/app.js:1438-1441`.
- **How to reproduce:** `curl -X POST -H 'Content-Type: application/json' -d '{}' https://arena.dualmindlab.tech/api/audio/tts` returns 404, and so does the same request to `https://api.dualmindlab.tech/api/audio/tts`. In the app, "Read aloud" logs `Backend TTS failed, falling back to browser API`.
- **Impact:** the server voice is never used. Users get the browser's built-in voice, or nothing on browsers without `speechSynthesis`.
- **Fix:** `server/audio-alias.js` (BE-2). The alias is deprecated and removed after the legacy app is gone.
- **Original suggested fix:** change `ArenaService.js:90` to `/api/speech/generate` (the `{ text }` body already fits), and keep the browser fallback.

### 11 · Old Vercel integration (`v0-dual-mind-ui`) fails on every push

- **Severity:** Low · **Status:** Still failing: on 2026-11-23 the combined status of `master` is `failure` because of "Vercel – v0-dual-mind-ui", while every GitHub Actions and Workers Builds check on that commit passes · **Found:** 2026-10-17 (verified 2026-10-18)
- **Where:** the GitHub ↔ Vercel integration for the Vercel project `v0-dual-mind-ui`. Nothing in this repo configures it, and the site is served from Cloudflare.
- **How to reproduce:** `gh api repos/dualmindlabs/DualMind_UI/commits/master/status` shows "Vercel – v0-dual-mind-ui" = failure. The last 35 Vercel deployments (every `master` push since 2026-02-07, plus the PR #5 preview) all failed. The last success was `18f420f` on 2026-02-07.
- **Impact:** a red ✗ on every commit and PR, so the combined commit status is always "failure" and real CI failures are easy to miss.
- **Suggested fix:** disconnect this repo from the Vercel project (or delete the unused project) in the Vercel dashboard. Alternatively, add a `vercel.json` with `"git": { "deploymentEnabled": false }`.

### N7 · Unused API client methods call routes that don't exist

- **Severity:** Low · **Status:** Confirmed (live) · **Found:** 2026-10-18
- **Where:**
  - `js/api/services/UserService.js:35-36` (`GET /api/users/me`).
  - `js/api/services/ModelService.js:32-33` (`GET /api/models/{id}`).
  - `js/api/DualMindApi.js:93-94` (`GET /api/version`).
- **How to reproduce:** all three return 404 on `https://api.dualmindlab.tech`. None of these methods is called anywhere in the app today.
- **Impact:** none yet, but anyone who uses these helpers gets a 404.
- **Suggested fix:** remove the three methods, or add the matching API routes before using them.

---

## New on 2026-11-23

### N8 · The arena host redirects every request to the waitlist

- **Severity:** Medium · **Status:** By design until launch. Confirmed live on 2026-11-23.
- **Where:** `worker.js` (`FORCE_WAITLIST = true`, the pre-launch gate). While it is true, every request, `/robots.txt` and `/sitemap.xml` included, gets a temporary 302 to `https://early.dualmindlab.tech/?ref=arena`, unless the visitor has the preview cookie (`?preview=dualmind-preview`).
- **How to reproduce:** `curl -sI https://arena.dualmindlab.tech/robots.txt` and `/sitemap.xml` both answer `302` with `location: https://early.dualmindlab.tech/?ref=arena`.
- **Impact:** search engines cannot read the arena's robots file or sitemap yet. That is intended before launch.
- **What is already correct for launch:** `build.js` writes `dist/robots.txt` and `dist/sitemap.xml` on every build, from the pages in `dist/`, using `VITE_SITE_URL` (default `https://arena.dualmindlab.tech`, the same default as the web app's canonical URLs and the Worker route in `wrangler.jsonc`). The robots file disallows `/api/` and points at the sitemap on that host. There is deliberately no static copy in `web/public/`: the build overwrites it, so a second copy could only drift. The waitlist host has its own file, `waitlist-worker/public/robots.txt`.
- **To open the arena:** set `FORCE_WAITLIST` to `false` (see the comment at the top of `worker.js`).

### N9 · `master` still carries the classic arena

- **Severity:** Medium · **Status:** Open, needs a decision.
- **Where:** [#87](https://github.com/dualmindlabs/DualMind_UI/pull/87) (`feat/arena-cutover` into `master`) removes the classic arena (`index.html`, `js/`, `css/`, `components/`, the legacy `leaderboard/` and `models/` files) and brings the redesign. It is open and 74 commits ahead of `master`. Merge order and conflicts are in `docs/RELEASE-MERGE.md` on that branch. Until it merges, this file describes `master`, and some code paths named above (`js/api/...`, `components/ShareModal.js`) disappear with it.

### N10 · Dead scripts and retired pages in the repository root

- **Severity:** Low · **Status:** Fixed by the change that updated this file.
- **Deleted** (no reference in code, workflows or `package.json`; only audit documents mention them): `start.bat`, `startup.bat`, `commit_and_push.sh`, `commit_and_push.ps1` (wrapped `git add .` and pushed without review), `test-everything.js` (a browser-console script for old ports), `test-supabase-auth.js` (a Node script that carried the public Supabase URL and anon key) and `build-deploy.js` (an older build script that copies files that no longer exist, such as `arena-core.js` and `admin-email-system/`; `npm run build` uses `build.js`).
- **Moved to `legacy/`** (kept for reference, not served, not built): the retired sign-in pages and share page, a mock API server, the unused stylesheet and FPS monitor, and a Playwright spec for the old sign-up page. See `legacy/README.md`. The relative links inside the moved pages are not updated, so they will not render from there.
- **Left in place on purpose:** `serve.json` (read by `npm run dev`), and `config.js`, `theme.js`, `manifest.json`, `.assetsignore` (listed in `build.js`).

---

## Cycle 2 launch gaps (2026-11-26)

Fixed in the cycle 2 PR for [#132](https://github.com/dualmindlabs/DualMind_UI/issues/132): phone sign-in is off by default with an allow-listed country code, the gate passes the legal pages, the waitlist worker is hardened, the prompt and destination survive sign-up and OAuth, in-app browsers are warned, model data is in the HTML of `/leaderboard/` and `/models/`, the UI works with masked model names, and the legacy session copy and `/auth-verify` are gone.

Still open, by design or because it needs an owner:

- **Owner actions**: Twilio geographic permissions (India only) and Supabase's hourly SMS limit; Supabase's redirect allow-list must accept `/auth-callback.html?redirect=...`; after deploy, check that `early.dualmindlab.tech` still answers once `workers_dev` is off (its custom domain is not in `wrangler.jsonc`); set the Turnstile site key, `TURNSTILE_SECRET_KEY` and `VITE_ANALYTICS_TOKEN` only when those features are switched on.
- **Funnel events** have no sink yet: Cloudflare Web Analytics counts page views only, so `dm:funnel` events need a decision (a second tool, or a Back endpoint).
- **A vote queued offline** on a masked battle shows the names only after a reload of the thread: the queue flush does not feed the open turn.
- **The rating copy** no longer says that every vote moves an Elo rating: the live ratings were found not to follow from the recorded votes (cycle 3 red-team), so every page says they are "under audit". Remove that wording once the backend commits the `v_leaderboard` definition and the ratings are recomputed or the crowd board (Bradley-Terry) is on.
- **Sign-in notice emails** are throttled only in the browser: confirm the `email-wel-safe` function has its own per-user limit.
- **Grievance Officer** (Terms, "Complaints and reports"): no officer is named yet. `web/src/lib/site/links.ts` holds an empty name (the Terms print no officer line until it is set) and `grievance@dualmindlab.tech` as configurable text; the owner must name a person and confirm that the mailbox exists before launch. The minimum age (13) is unchanged: that is the owner's decision.
- **Review URL after the cycle 2 PR merges**: `workers_dev` stays off (the zone rules matter more), so the live preview host `dualmind-arena.creharsh.workers.dev` goes away. Review on `https://arena.dualmindlab.tech/?preview=dualmind-preview` (sets the cookie once) or on a branch alias `https://<branch-slug>-dualmind-arena.creharsh.workers.dev`.

## Cycle 4 trust sweep (2026-11-26)

Fixed in the cycle 4 PR for [#136](https://github.com/dualmindlabs/DualMind_UI/issues/136). Still open:

- **The only real control for a password change is server-side**: Supabase "Secure password change" must be on (owner). Every check in the page can be skipped by calling `updateUser` from devtools.
- **The waitlist share image** (`waitlist-worker/public/og.jpg`) still shows an "Enter the arena" button on a page where nobody can enter; the picture needs a new file name when it is redrawn.
- **Retired models**: until the API sends `active` on every row, `web/src/features/leaderboard/lib/retired.ts` names them by hand.
- **Ranks differ** between the page (rated models only) and `/leaderboard.md`, the crawler table and the ItemList (the API's `eloRank`); the fix belongs in the leaderboard service.
- **Owner action: proxy secret.** The Worker now sends the visitor address (`X-DualMind-Client-IP`) and `X-DualMind-Proxy-Secret` to the API when the Worker secret `BACKEND_PROXY_SECRET` is set; set the same value as `Limits__TrustedProxySecret` on the API, or every guest still counts as one address.
- **The cookie list** now covers every key the app writes; add a new key there when you add one.

## Related issues in the other repo

The backend issues are tracked in the private backend repo's [KNOWN_ISSUES.md](https://github.com/dualmindlabs/DualMind_Back/blob/master/KNOWN_ISSUES.md) (access required). They include:

- **#4** Swagger page returns 404.
- **#5** Telegram bot's "Create Account" link uses the wrong domain.
- **#8** Backend CI doesn't run on pull requests to `master` (fixed on the backend's `master`).
- **#9** Last backend deploy failed (the backend's latest `master` deploys succeeded on 2026-11-22; what production serves was not checked).
- **#1, #2, #6 and N1–N6:** leaderboard data, API behaviour and configuration items that are kept out of this public file.
