# Known issues: DualMind Arena (frontend)

This file lists verified bugs in the Arena frontend (this repo) and its hosting: the `dualmind-arena` Cloudflare Worker and an old Vercel project. Each item was checked against `master` (`75eed48`) and the live site at `https://arena.dualmindlab.tech`. API, data and backend CI issues are tracked in the backend repo (see the last section).

Found a security problem? Please report it privately to the maintainers instead of opening a public issue.

Last updated: 2026-10-21

**Status:** Confirmed = reproduced in code and/or live. Likely = strong evidence, not reproduced end to end. Not reproduced = could not confirm.
**Numbering:** `#1`–`#11` are the Arena bugs reported on 2026-10-17. The backend file uses the same numbers. `N7` was found while verifying them on 2026-10-18.

## Summary

| # | Issue | Severity | Status |
|---|---|---|---|
| 3 | `/share/<id>` links are broken: the id is dropped by a redirect | Medium | Fixed by PR #58 (share page, slice S11) |
| 10 | Last Cloudflare build of `master` failed; the live site runs an older Worker than `master` | Medium | Confirmed |
| 7 | Text-to-speech calls `/api/audio/tts`, which the API doesn't have (`/api/speech/generate`) | Low | Fixed by PR #49 (Worker alias) |
| 11 | Old Vercel integration (`v0-dual-mind-ui`) fails on every push | Low | Confirmed |
| N7 | Unused API client methods call routes that don't exist | Low | Confirmed |

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

- **Severity:** Medium · **Status:** Confirmed · **Found:** 2026-10-17 (verified 2026-10-18)
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

- **Severity:** Low · **Status:** Confirmed · **Found:** 2026-10-17 (verified 2026-10-18)
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

## Related issues in the other repo

The backend issues are tracked in the private backend repo's [KNOWN_ISSUES.md](https://github.com/dualmindlabs/DualMind_Back/blob/master/KNOWN_ISSUES.md) (access required). They include:

- **#4** Swagger page returns 404.
- **#5** Telegram bot's "Create Account" link uses the wrong domain.
- **#8** Backend CI doesn't run on pull requests to `master`.
- **#9** Last backend deploy failed; the API still runs the 2026-09-15 build.
- **#1, #2, #6 and N1–N6:** leaderboard data, API behaviour and configuration items that are kept out of this public file.
