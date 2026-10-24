# Release merge: DualMind web UI

The redesign is collected on one branch, `feat/arena-cutover`, the head of the cutover PR
[#87](https://github.com/dualmindlabs/DualMind_UI/pull/87). `master` was not touched. Merging #87
into `master` ships the cutover and the whole redesign together; Workers Builds deploys `master`
to production, so that merge is the release.

Done on 24 Oct 2026, on Harsh's instruction of the same day (one branch per project, not `master`).

## Merge order

Each PR was merged into `feat/arena-cutover` with a merge commit (no squash, no rebase), in this
order. GitHub marked each PR as merged when the push landed.

| # | PR | Branch | Head | Merge commit |
| --- | --- | --- | --- | --- |
| 1 | [#89](https://github.com/dualmindlabs/DualMind_UI/pull/89) Redesign slice 0: Duel Editorial foundation (tokens, fonts, primitives) | `redesign/s0-foundation` | `ecca18d` | `124f58b` |
| 2 | [#91](https://github.com/dualmindlabs/DualMind_UI/pull/91) Redesign A1: arena shell, stage and empty state | `redesign/a1-arena-shell` | `710cbb3` | `b04216e` |
| 3 | [#90](https://github.com/dualmindlabs/DualMind_UI/pull/90) Redesign A2: arena duel, vote dock and reveal | `redesign/a2-arena-duel` | `ce2001b` | `e21aeab` |
| 4 | [#99](https://github.com/dualmindlabs/DualMind_UI/pull/99) Arena Stage: cinematic duel stage, tug-of-war vote, flip reveal | `arena-concept/stage` | `61d3dfa` | `5535ee5` |
| 5 | [#92](https://github.com/dualmindlabs/DualMind_UI/pull/92) Redesign slice B: landing page | `redesign/b-landing` | `6957c01` | `819d991` |
| 6 | [#93](https://github.com/dualmindlabs/DualMind_UI/pull/93) Redesign C: leaderboard | `redesign/c-leaderboard` | `1e767b0` | `82ad9fb` |
| 7 | [#94](https://github.com/dualmindlabs/DualMind_UI/pull/94) Redesign slice D: models directory | `redesign/d-models` | `4152514` | `aba175c` |
| 8 | [#95](https://github.com/dualmindlabs/DualMind_UI/pull/95) Redesign slice E: info pages and API reference | `redesign/e-info` | `ef967c6` | `700a8b1` |
| 9 | [#96](https://github.com/dualmindlabs/DualMind_UI/pull/96) Redesign slice F: global chrome (header, footer) | `redesign/f-chrome` | `3a62370` | `5992b9f` |
| 10 | [#97](https://github.com/dualmindlabs/DualMind_UI/pull/97) Redesign slice G: auth, settings, share | `redesign/g-auth-settings-share` | `8a2d216` | `6caccc2` |
| 11 | [#98](https://github.com/dualmindlabs/DualMind_UI/pull/98) Redesign slice H: 404 duel, crash and offline screens, /problems page | `redesign/h-errors` | `4e710f0` | `6795330` |

Before merging, each PR's base was checked: all eleven already targeted `feat/arena-cutover` and
were branched from it, with the foundation (#89) inside, so no retargeting was needed. Their CI
was green apart from two checks that do not count: the old Vercel project (fails on every commit,
needs-harsh item 2) and `Screenshots (before)` on #90, #93, #94 and #98, which is a reference run
on the base branch and is expected to fail for screens the base does not have yet.

## Conflicts and decisions

- **No text conflicts.** All eleven merges applied cleanly. Since the foundation (#89), no file is
  changed by more than one of #99, #92, #93, #94, #95, #96, #97 and #98, so Stage did not overlap
  the landing, header/footer or other slices.
- **#91 and #90 (arena shell and duel).** They merged cleanly in this order, and the result is
  byte for byte the tree of the integration merge inside the Stage branch (`cf7ed1e`), which had
  already combined them. #99 then applied on top and the tree matched the Stage branch head
  (`61d3dfa`) exactly, so the arena on this branch is exactly the reviewed Stage arena.
- **Stage replaces the look of #90 and #91** (Harsh chose Stage). Their code stays in history as
  the base Stage was built on; the visible arena is Stage.
- **Not merged, left open:** [#100](https://github.com/dualmindlabs/DualMind_UI/pull/100) (arena
  concept Focus) and [#101](https://github.com/dualmindlabs/DualMind_UI/pull/101) (arena concept
  Console). They are the rejected alternatives to Stage. Close them when you like.
- **Not part of this release:** [#88](https://github.com/dualmindlabs/DualMind_UI/pull/88) (hard
  UI pass, test only, targets `master`) and [#2](https://github.com/dualmindlabs/DualMind_UI/pull/2)
  (old v0 PR).

## Deploy safety

- Every workflow in `.github/workflows` runs on `pull_request` to `main`/`master` (web.yml also to
  `feat/arena-cutover`), on `push` to `main`/`master`, or by hand. The only deploying workflow,
  `deploy-waitlist.yml`, runs on pushes to `master` touching `waitlist-worker/`. Pushing
  `feat/arena-cutover` deploys nothing.
- Cloudflare Workers Builds deploys production only from `master` (ADR 0005,
  docs/architecture.md); other branches get a preview build, the `Workers Builds: dualmind-arena`
  check.

## CI on the branch

Green on the first run after the last merge (`6795330`), with no fixes needed: typecheck, ESLint,
Prettier and unit tests; the four Playwright shards and the composed build with its screenshots;
API (v2) typecheck, Workers tests and OpenAPI check; Build & Lint; CodeQL; GitGuardian; Workers
Builds (preview). Redesign screenshots: 190 shots passed, every page at desktop 1440 and phone 390
in dark and light (artifact `shots-after` of run 40053566277). Only the old Vercel project fails,
as on every commit (needs-harsh item 2). This file was added after that run; it changes no code.

## Left for Harsh

1. **Cloudflare build variables (needs-harsh item 1a, blocks merging #87).** Workers & Pages >
   `dualmind-arena` > Settings > Build > Build variables: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (the public URL and anon key, never the service-role key) for
   production and preview builds.
2. **Merge #87 into `master`** when ready ("merge the cutover"). That is the production deploy.
3. **Close #100 and #101** (rejected arena concepts).
4. **Follow-up S13b, after item 1:** delete `config.js` and `auth-verify.html`, drop the CDN-script
   CSP and enforce the CSP everywhere.
