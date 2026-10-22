# UI audit: the redesigned Arena frontend

Audited 2026-10-21 against `master` at `328e4f6` (CI run [39570236764](https://github.com/dualmindlabs/DualMind_UI/actions/runs/39570236764), all green), plus the in-flight arena branches. Bar: [startup-grade-checklist.md](./startup-grade-checklist.md) and [design-direction.md](./design-direction.md).

## Status after 22 Oct

Checked against `master` at `4b561d0` (after #70, #71, #75, #76 and #78), the code and the screenshots of master run [39714203217](https://github.com/dualmindlabs/DualMind_UI/actions/runs/39714203217). "Fixed" names the PR; "open" says why. [#82](https://github.com/dualmindlabs/DualMind_UI/pull/82) and [#83](https://github.com/dualmindlabs/DualMind_UI/pull/83) are this check's own fixes.

| ID | Item | Status |
| --- | --- | --- |
| P0-1 | Landing performance 73-74 | Open: Harsh dropped performance work on 21 Oct ([#57](https://github.com/dualmindlabs/DualMind_UI/pull/57) closed, branch kept) |
| P0-2 | Speed shown before the vote | Fixed: [#53](https://github.com/dualmindlabs/DualMind_UI/pull/53), blind-integrity test in [#66](https://github.com/dualmindlabs/DualMind_UI/pull/66); timing moves to the pane footer in [#77](https://github.com/dualmindlabs/DualMind_UI/pull/77) |
| P0-3 | Raw model names, unrated models ranked | Fixed: [#60](https://github.com/dualmindlabs/DualMind_UI/pull/60), threshold 5 battles in [#68](https://github.com/dualmindlabs/DualMind_UI/pull/68) |
| P1-1 | Typed landing prompt got the demo answer | Fixed: [#69](https://github.com/dualmindlabs/DualMind_UI/pull/69) |
| P1-2 | Lighthouse on more routes, performance as an error | Open: performance work dropped (P0-1) |
| P1-3 | Share images | Fixed: leaderboard and models in [#60](https://github.com/dualmindlabs/DualMind_UI/pull/60); every other page (sign-in pages, email pages, settings, `/design/`) in [#82](https://github.com/dualmindlabs/DualMind_UI/pull/82) |
| P1-4 | 44 px touch targets | Fixed: [#62](https://github.com/dualmindlabs/DualMind_UI/pull/62); the 404 "Ctrl K" hint on phones in [#83](https://github.com/dualmindlabs/DualMind_UI/pull/83) |
| P1-5 | Credits wall on About | Fixed: [#61](https://github.com/dualmindlabs/DualMind_UI/pull/61) |
| P1-6 | Unattributed login quote | Fixed: [#62](https://github.com/dualmindlabs/DualMind_UI/pull/62) |
| P1-7 | Expired email link dead end | Fixed: [#62](https://github.com/dualmindlabs/DualMind_UI/pull/62) |
| P1-8 | No state screenshots | Fixed: [#64](https://github.com/dualmindlabs/DualMind_UI/pull/64); settings, share and offline states in [#65](https://github.com/dualmindlabs/DualMind_UI/pull/65), [#58](https://github.com/dualmindlabs/DualMind_UI/pull/58), [#70](https://github.com/dualmindlabs/DualMind_UI/pull/70) |
| P1-9 | i18n: strings in components, `en-US` formatters, zone-less time | Part: time zone and page-locale formatters in [#78](https://github.com/dualmindlabs/DualMind_UI/pull/78); the message catalog is open (planned after the S13 cutover) |
| P1-10 | Three taglines | Fixed: [#61](https://github.com/dualmindlabs/DualMind_UI/pull/61), [#62](https://github.com/dualmindlabs/DualMind_UI/pull/62), last lines in [#78](https://github.com/dualmindlabs/DualMind_UI/pull/78) |
| P1-11 | Arena picker | Fixed: [#66](https://github.com/dualmindlabs/DualMind_UI/pull/66) |
| P1-12 | Arena PRs red | Fixed: [#52](https://github.com/dualmindlabs/DualMind_UI/pull/52), [#53](https://github.com/dualmindlabs/DualMind_UI/pull/53) merged |
| P1-13 | Footer: status, GitHub, contact | Fixed for GitHub and Contact in [#61](https://github.com/dualmindlabs/DualMind_UI/pull/61); the Status link is open until the status page exists (B8) |
| P1-14 | HTML caching when the gate opens | Open: belongs to the S13 cutover |
| P2-1 | Link inset in hero actions | Fixed on master (checked in [#78](https://github.com/dualmindlabs/DualMind_UI/pull/78)) |
| P2-2 | Hero placeholder cut on phones | Fixed: [#71](https://github.com/dualmindlabs/DualMind_UI/pull/71) |
| P2-3 | Grey 404 glitch | Fixed: [#71](https://github.com/dualmindlabs/DualMind_UI/pull/71) |
| P2-4 | Chart without a name | Fixed on master (checked in [#78](https://github.com/dualmindlabs/DualMind_UI/pull/78)) |
| P2-5 | Eyebrow `h2`s | Fixed on master (checked in [#78](https://github.com/dualmindlabs/DualMind_UI/pull/78)) |
| P2-6 | Forced colors | Fixed: [#62](https://github.com/dualmindlabs/DualMind_UI/pull/62); the wordmark vanished with the dark theme stored, and 404, share, arena vote and settings had no forced-colors check: [#83](https://github.com/dualmindlabs/DualMind_UI/pull/83) |
| P2-7 | en-US spelling, CTA lexicon | Fixed for the info pages in [#61](https://github.com/dualmindlabs/DualMind_UI/pull/61); the rest of the screens (settings, sign-in errors, theme switch, credits, a starter prompt, "Open the leaderboard") and a source-wide spelling test in [#83](https://github.com/dualmindlabs/DualMind_UI/pull/83). `/design/` keeps "colour" (internal style guide, noindex) |
| P2-8 | Sitemap `lastmod`, auth pages listed | Fixed: [#61](https://github.com/dualmindlabs/DualMind_UI/pull/61) |
| P2-9 | Arena scroll cue, history rows | Fixed: [#66](https://github.com/dualmindlabs/DualMind_UI/pull/66) |
| P2-10 | Sticky header in full-page shots | Fixed: [#71](https://github.com/dualmindlabs/DualMind_UI/pull/71) |

Other checks from the definition of done:

| Check | Status |
| --- | --- |
| Meta and share card on every route | Fixed in [#82](https://github.com/dualmindlabs/DualMind_UI/pull/82): every page that uses `pageMeta` falls back to `og-default.png` with the large card and `og:locale`; share links keep their Worker-written tags |
| Favicon and manifest | Fixed in [#82](https://github.com/dualmindlabs/DualMind_UI/pull/82): `favicon.ico`, 192 and 512 px and maskable icons, `site.webmanifest` (fetched with credentials so it passes the waitlist gate). The legacy `manifest.json` (missing icons, linked from nowhere) goes with the S13 cutover |
| Print styles | Fixed in [#82](https://github.com/dualmindlabs/DualMind_UI/pull/82): no header or footer on any page; a shared battle prints its transcript and address |
| Focus visible | Checked in [#83](https://github.com/dualmindlabs/DualMind_UI/pull/83): a Tab walk on ten screens fails on any stop without a ring; the code block's ring was cut off on three sides by its clipping figure, which now draws the ring itself. Open: in the arena thread the first pane's Copy button, scrolled to the top edge of the thread, loses the top of its ring (`scroll-padding` on the thread scroller, a file the arena lanes hold) |
| Reduced motion | No gap: CSS and Motion provider, a still version of every effect, screenshots on landing, leaderboard, models, shell, effects, design and the reveal |
| Empty states | No gap: arena and history, leaderboard and models (empty and no match), settings export, share (private, no answers), palette and model picker |
| Console errors in CI | No gap: the only console errors in master run 39714203217 are `ERR_INTERNET_DISCONNECTED` from the offline tests; each page spec fails on console errors |
| F3 manual screen-reader pass | Open: needs a person with VoiceOver or NVDA |
| F6 per-battle share images | Open: BE-19 (backend) |
| F11 arena flow | In review: [#77](https://github.com/dualmindlabs/DualMind_UI/pull/77) |
| B2 developer portal | Fixed: [#73](https://github.com/dualmindlabs/DualMind_UI/pull/73) (merged during this check; `/developers/` is in the head checks of [#82](https://github.com/dualmindlabs/DualMind_UI/pull/82)) |
| R1 README screenshots | Open: the arena flow review lane takes them after [#77](https://github.com/dualmindlabs/DualMind_UI/pull/77) |
| R4 short ROADMAP.md | Open: needs a decision on what to promise in public |

## How this was done, and its limits

Nothing was built or run on the VM. Evidence:

- CI screenshot artifacts (`web-screenshots`) from master (193 files), `feat/arena-shell` run 39573397307 and `feat/arena-battle` run 39573438290. About 40 of them were looked at directly (landing, leaderboard, models, 404, login, signup, forgot-password, auth-callback error, FAQ, privacy, About, arena empty / vote / reveal / waiting / history / picker). The rest (how-it-works, terms, cookies, design, update-password, effects, shell) were judged from the route source, the CI axe result and the live HTML, not looked at pixel by pixel.
- The Lighthouse reports from the same runs (3 runs each, mobile preset, `/` only).
- Live HTML and headers fetched with `curl` from https://arena.dualmindlab.tech (preview cookie).
- Read-only reading of `web/src`.

What could not be judged from stills: motion quality (hero entrance, the reveal), real screen-reader behaviour, and anything behind a loading, error or empty state, because **no screenshot exists for those states** on leaderboard, models or auth (finding P1-8). Findings that rest on a hypothesis say so.

## Scorecard

✅ meets the bar · 🟡 gaps worth fixing · ❌ fails the bar · ➖ not applicable. "States" = empty, loading and error states. Perf marks come from the one measured route (`/`, 73-74) and from payload reasoning elsewhere.

| Screen | Design system | A11y AA | Perf | States | Feel | Copy | SEO / OG | i18n |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` landing | ✅ | ✅ | ❌ 73-74 | 🟡 | 🟡 | 🟡 | ✅ | 🟡 |
| `/leaderboard/` | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 no OG image | 🟡 |
| `/models/` | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 no OG image | 🟡 |
| `/about/` | ✅ | ✅ | ✅ | ➖ | ✅ | 🟡 | ✅ | ✅ content file |
| `/how-it-works/` | ✅ | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ content file |
| `/faq/` | ✅ | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ + JSON-LD | ✅ content file |
| `/privacy/`, `/terms/`, `/cookies/` | ✅ | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ content file |
| 404 | ✅ | ✅ | ✅ | ➖ | 🟡 | ✅ | ✅ noindex | ✅ |
| `/login/` | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 |
| `/signup/` | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 |
| `/forgot-password/` | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ noindex | 🟡 |
| `/update-password.html` | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ noindex | 🟡 |
| `/auth-callback.html` | ✅ | ✅ | ✅ | 🟡 no resend | 🟡 | ✅ | ✅ | 🟡 |
| `/design/` | ✅ | ✅ | 🟡 387 KB HTML | ➖ | ✅ | ✅ | ✅ noindex | ➖ |
| Arena (#52, #53, in flight) | ✅ | 🟡 | ❓ not measured | 🟡 | 🟡 | 🟡 | ➖ | 🟡 |

**Headline:** the visual system is consistent and close to the bar on every screen; axe is 100 on all of them. What stands between this and "real AI company" is (1) landing performance (73-74 on mobile, not the 80-83 the checklist states), (2) a few places where raw data or internal plumbing shows through (leaderboard names and unrated models, the credits wall on About), (3) the blind-battle UI showing speed before the vote, and (4) missing proof: no Lighthouse beyond `/`, no state screenshots, the share image is missing on leaderboard and models.

---

## P0: broken, unfair, or clearly unprofessional

### P0-1. Landing is a 73-74 on mobile Lighthouse, below the checklist's claim and the 90 bar

- **Screen:** `/`
- **Evidence:** `lighthouse` artifact of run 39570236764: performance 73 / 74 / 74 (median 0.74), FCP 3.9-4.0 s, LCP 4.6-4.7 s (90% of it "render delay", 4.2 s), TBT 10-120 ms, CLS 0.021, a11y/best-practices/SEO 100. `assertion-results.json`: the 0.9 performance assertion fails as a warning. The checklist (F4) says 80-83; the arena branches measure 67-79 on the same page. Details in the Performance plan below.
- **Why it matters:** the landing page is the first impression and the first thing a reviewer runs Lighthouse on. The warning is also silent in CI.
- **Fix:** the ranked changes in "Performance plan" (hero H1 off the critical path, 150 KB less JavaScript before first paint, fonts, enforcement).
- **Effort:** M (two small PRs).

### P0-2. The blind battle shows speed before the vote

- **Screen:** arena vote state (PR #53)
- **Evidence:** `battle/web-screenshots/battle-vote-desktop-dark.png`: both pane headers show "1.8 s" and "2.3 s" while the names are hidden; the revealed state adds "Time / Length / Tokens" footers (`battle-revealed-desktop-dark.png`).
- **Why it matters:** latency and answer length are fingerprints of a model (small fast models vs large slow ones). The product's promise is "names hidden until you vote"; this quietly weakens the data the leaderboard is built on.
- **Fix:** hide timing, length and token counts until the vote is recorded; show them in the reveal only. Keep the copy button. Add a unit test that the vote-state DOM contains no timing text.
- **Effort:** S.

### P0-3. Leaderboard and model names look like raw database output, and unrated models are ranked

- **Screens:** `/leaderboard/`, `/models/`, landing leaderboard preview, arena model picker
- **Evidence:** `leaderboard-desktop-dark-full.png`: rows such as `llama-3.3-70b-instruct-fp8-fast`, `@cf/meta/llama-3.1-70b-instr…` (truncated with no way to read the rest, `models-desktop-dark-fold.png`) sit beside curated names ("Llama 3.1 8B Instant", "Gemma 3n E2B IT"). From rank 36 down, models with 0-1 battles tie at Elo 1000 / 0.0% win rate and still get rank numbers. The arena picker (`arena-model-picker-dark.png`) lists "Compound Mini #2 · 1110" while the public board has it at rank 9, 1051 (fixture data, but it ships in the review screenshots).
- **Why it matters:** this is the data page. Raw slugs and zero-battle rows read as unfinished; a real company shows human names and only ranks what is rated.
- **Fix:** one display-name map (provider + family + size, slug in a tooltip and in the details sheet); below a minimum (suggest 10 battles) show "Not yet rated" in a collapsed group without rank numbers; full text in `title`/tooltip for any truncated id; make arena fixtures consistent with the board. Needs Harsh's decision on the minimum.
- **Effort:** M.

---

## P1: noticeable quality gaps

| ID | Screen | Evidence | Why it matters | Fix | Effort |
| --- | --- | --- | --- | --- | --- |
| P1-1 | Landing | `landing-demo-revealed-mobile-dark.png`; `hero-composer.tsx` sends any typed prompt to the recorded battle | A visitor types their own question and gets an unrelated answer. The status line explains it, but it feels broken and breaks "Ask once" in the subhead | Typed prompt: route to `/login/?next=/&prompt=...` and carry it into the arena after sign-in (handoff exists); keep the chips as the demo | M |
| P1-2 | CI | `web/lighthouserc.json`: one URL, performance is `warn` | Perf regressions go unnoticed; every other page is unmeasured | Add `/leaderboard/`, `/models/`, `/login/`, `/faq/`, `/about/`; performance `error` at 0.85 now, 0.9 after the perf PRs; add an initial-JS budget (gz) as a hard check | S |
| P1-3 | Leaderboard, Models | Live `curl`: no `og:image`, `twitter:card=summary`; info pages have `og-default.png`, landing has its own | The two most shareable data pages get a bare link card | Pass an image in their `meta`; better, a per-page OG card (title + live top three) generated in CI like `og-landing.png` | S (default image) / M (per-page cards) |
| P1-4 | All touch layouts | `hit-area` utility is `max(100%, 24px)` (`styles/base.css:144`); landing chips `h-8`, compact theme toggle `size-7` | design-direction section 7 promises 44x44 on touch; 24px is only the WCAG 2.2 minimum | `@media (pointer: coarse)` raises the hit area to 44px; check chips, theme toggle, sort/provider toggles, FAQ rows | S |
| P1-5 | About | `info-about-desktop-dark-full.png` | The page ends in a 12-card licence wall ("COPIED IN", "Used within this website only, not redistributed") and names the .NET service. It is internal compliance text on a marketing page; there is no team, mission or contact block | Move credits to `/credits/` (linked from the footer); About gets mission, how the project is run, contact and the open-source link | M |
| P1-6 | Login | `auth-login-desktop-dark.png`: right panel is near black with an unattributed quote ("Both answers were right. Only one of them was useful.") | Reads as a fake testimonial; the panel adds no information | Label it as an example ("From a battle on a code-review prompt") or replace it with one real stat; keep the art | S |
| P1-7 | Auth callback | `auth-auth-callback-error-mobile-light.png`: "This link did not work" with only "Back to sign in" | Expired links are the common case; the user has to start over | Offer "Send a new link" (reset) or "Resend" depending on the flow; add a footer with Privacy/Terms like the other auth pages | S |
| P1-8 | Leaderboard, Models, Auth | Screenshot set has fold/full/details only; `board-state.tsx` has error, empty and no-match cards that no test screenshots | F2 is marked 🟡 and cannot be verified from CI today | Playwright route-mock cases: loading skeleton, API 500 (with request id), empty board, no search match, rate-limited; screenshot each in dark + light, phone + desktop; same for login error, lockout, offline | M |
| P1-9 | All components | About 60 inline UI strings in `components/layout`, `features/leaderboard`, `features/auth/components`, `features/marketing/components`; number and date formatters hard-code `en-US` (`leaderboard/lib/format.ts:8`, `number-ticker.tsx:40`); "Updated 8:45 AM" has no zone | F7 is open; the checklist wants strings out of components | Typed message catalog per feature (the `content/` pattern already works for info and auth copy); one `format` module taking the locale from `<html lang>`; show the update time with its zone | M-L |
| P1-10 | Brand copy | Landing "Two models. One prompt. You decide.", arena "Two minds. Your verdict.", footer "Two minds, one verdict", signup H1 repeats the landing H1 | Three taglines for one product; the signup page leads with marketing, not the task | One primary line, one supporting line; signup H1 becomes "Create your account" with the tagline as the subhead; document in design-direction.md | S |
| P1-11 | Arena (#53) | `arena-model-picker-dark.png`: popover covers the hero heading; ids truncated; only 3 models listed | Looks unfinished next to the rest | Anchor the picker above or below the composer without covering the heading, show display names (see P0-3), scroll the full list | S |
| P1-12 | Arena (#52/#53) | Latest runs: shell run red on Prettier, battle run red on ESLint and on the Playwright step (log no longer retrievable) | Not mergeable yet; the autofix job exists | Let `web-autofix` apply, then fix whatever Playwright reports | S |
| P1-13 | Footer | `landing-desktop-dark-full.png` | No status page, GitHub or contact link; a real company footer has them (B8 status page is pending) | Add Status (when B8 lands), GitHub, Contact (`support@` already exists) | S |
| P1-14 | Performance, all pages | Live HTML: `cache-control: private, no-store` on the preview-gated HTML; `/design/` is 387 KB of HTML | Fine behind the preview gate; must be checked when the gate opens | When launching, serve prerendered HTML with `s-maxage` and `stale-while-revalidate`; keep `/design/` noindex and consider not shipping it to production | S |

---

## P2: polish

| ID | Screen | Evidence | Fix | Effort |
| --- | --- | --- | --- | --- |
| P2-1 | Leaderboard, Models (phone) | `leaderboard-mobile-dark-fold.png`, `models-mobile-light-fold.png`: the secondary "How ratings work" / "Open the leaderboard" link is inset from the primary button's left edge | Remove the link-button's left padding in hero action rows | S |
| P2-2 | Landing (phone) | `landing-mobile-dark-fold.png`: hero composer placeholder is cut ("Why do AI benchmarks stop being...") | Shorter rotating placeholders on narrow screens, or let the field wrap | S |
| P2-3 | 404 | `info-404-mobile-dark-fold.png`: the glitch "404" is grey and low contrast (decorative, but it is the visual anchor) | Use `--fg-soft`; keep the glitch only for the first second | S |
| P2-4 | Leaderboard | `win-rate-chart.tsx` has no accessible name or summary (the numbers are in the text beside it) | `role="img"` with a one-line summary, or `aria-hidden` | S |
| P2-5 | Leaderboard | Eyebrow labels such as "Top three" are `h2`s; the page has 5 h2s, 3 of them labels | Use `p` for pure eyebrows, keep h2 for sections | S |
| P2-6 | All | No `forced-colors` handling (`styles/` only has `prefers-contrast` and reduced motion) | Add a `forced-colors: active` block: focus ring, borders and badges use system colours | S |
| P2-7 | Copy | "licence", "optimise" (British) next to "Privacy Policy", "Terms of Service"; CTA wording varies ("Sign in", "Go to the Arena", "Start a battle", "Bring your own prompt") | Pick en-US or en-GB and lint it; short CTA lexicon: Start a battle / Sign in / Create account / See the leaderboard | S |
| P2-8 | SEO | `sitemap.xml` has no `lastmod`; lists `/login/` and `/signup/` | Add `lastmod` from the build; drop the auth pages | S |
| P2-9 | Arena | `arena-empty-mobile-dark.png`: the category tab row is clipped at "F..." with no scroll cue; thread rows show the time inline and clip titles | Edge fade on scrollers; time on a second line on narrow widths | S |
| P2-10 | Landing | Full-page screenshots show the sticky header mid-page (`landing-demo-revealed-mobile-dark.png`) | Screenshot artifact of full-page capture; hide the sticky header in full-page shots so reviewers are not misled | S |

Things checked and found good: tokens and type are used consistently (no raw hex in components outside brand icons and the design page), motion uses `--dur-*` and `--ease-*` tokens, skip link and landmarks are present on every prerendered page (`header`, `nav` with labels, `main#main`, `footer`), one `h1` per page, canonical on every indexable page, `noindex` on forgot-password, update-password and design, JSON-LD on landing and FAQ, scroll padding for the sticky header, reduced motion handled in CSS and in the Motion provider, fonts self-hosted and immutable-cached, no raster images in the UI (nothing to convert to AVIF/WebP except the three OG PNGs).

---

## Performance plan

### Measured (master run 39570236764, mobile preset, 3 runs, `/`)

| Metric | Value |
| --- | --- |
| Performance score | 73, 74, 74 (arena-shell branch 67-73, arena-battle 67-79) |
| FCP / LCP / SI | 3.9-4.0 s / 4.6-4.7 s / 3.9-4.0 s |
| TBT / CLS | 10-120 ms / 0.021 |
| LCP element | `h1#hero-title` BlurText word span; TTFB 469 ms, load delay 0, load time 0, **render delay 4,220 ms (90%)** |
| Transfer | 575 KiB: JavaScript 406 KB gz (about 350 KB requested in the first 300 ms), fonts 130 KB, CSS 25 KB, HTML 21 KB |
| Main thread | 2.6 s: other 956 ms, script evaluation 728 ms, style and layout 510 ms, render 284 ms |
| Unused JS (Lighthouse) | 53 KiB: the React DOM chunk (`jsx-runtime-*.js`, 41 KB, 67% unused) and the API chunk (`api-*.js`, 41 KB, 64% unused) |
| Render-blocking | `root-*.css` 25 KB, 169 ms; discovered chain CSS -> `dm-mono-400` font |
| DOM | 982 elements |

Live page: 37 `modulepreload` links in the HTML head (entry, root, 13 shared chunks, plus the below-the-fold landing sections `leaderboard`, `timeline`, `spotlight-card`, `logo-loop`, `home`), three preloaded fonts (114 KB). The unthrottled network trace finishes by about 450 ms, so the 4 s FCP is Lighthouse's simulated slow mobile link (1.6 Mbit/s, 4x CPU): bytes and main-thread work in the first paint path are what cost time. Why FCP itself is 4 s could not be pinned down from the report alone (hypothesis: the preloaded fonts and 350 KB of eager chunks compete with the CSS on the simulated link); the first PR below measures it step by step.

### Ranked changes (expected gains are estimates; each PR should report before/after LHCI medians)

| # | Change | Where | Expected | Effort |
| --- | --- | --- | --- | --- |
| 1 | **Do not hide the LCP text behind a JS-less animation chain.** The hero H1 is split into per-word spans that animate in with a 14 px blur and staggered delays (110 ms per word, 480 ms offset on line two). Make the headline paint at full opacity in the first frame (animate the second line and the ornaments only), or reduce the effect to opacity and a small translate on phones. Alternatively make the subhead the LCP element. | `hero-section.tsx`, `components/vendor/reactbits/blur-text.tsx` | LCP -1.5 to -3 s; +8 to +15 score. Verify in CI first: it is a hypothesis from the 90% render delay | S |
| 2 | **Stop eager-loading the base-ui tooltip stack.** `TooltipProvider` in `AppProviders` pulls `tooltip` (18 KB), `usePopupHandleStore` (22 KB), `floating-ui.utils`, `DirectionContext`, `stateAttributesMapping` (9 KB), `composite` (4 KB): about 55 KB gz before any tooltip exists. Mount the provider inside the first component that renders a tooltip (lazy), or use `title`/CSS tooltips on marketing pages. | `components/layout/app-providers.tsx`, `components/ui/tooltip.tsx` | -40 to -55 KB JS | S |
| 3 | **Take zod and the API client off the landing critical path.** `ApiProvider` imports `lib/api` (client + 8 zod schemas) eagerly: 41 KB, 26 KB of it unused at load. Create the client lazily on first query (dynamic `import('@/lib/api')` in `useApiClient`), or give the landing live strip a tiny `fetch` with a hand-written parse. | `api-provider.tsx`, `use-api-client.ts`, `use-live-stats.ts` | -26 to -41 KB JS; less script evaluation | M |
| 4 | **Code-split below-the-fold landing sections** (`battle-section`, `features-section`, `steps-section`, `leaderboard-preview`, `closing-cta`, logo loop) with `React.lazy` plus the existing `use-in-view` hook, and stop preloading their chunks (React Router emits `modulepreload` for every route chunk it can see). | `landing-page.tsx`, `home.tsx` | -50 to -70 KB JS before first paint; 37 -> about 15 preloads | M |
| 5 | **Subset the fonts.** Bricolage 77 KB (opsz + wght axes, Latin): subset to Basic Latin plus the punctuation actually used and drop the optical-size axis (keep wght): about 35-40 KB. Keep DM Mono at one weight (500) on first paint, load 400 lazily (-15 KB and removes the CSS -> font chain). Playfair Italic 22 KB: subset to Basic Latin, about 10-12 KB. Keep preloads to Bricolage and Playfair only. Check whether the JetBrains Mono import in the root CSS is needed outside code blocks (it is only downloaded where used, but it adds `@font-face` CSS). | `root.tsx`, a `scripts/subset-fonts` step or pre-subset files in `public/fonts` | -50 to -65 KB fonts; +2 to +5 score | M |
| 6 | **Trim and split the CSS.** 25 KB gz is render-blocking; `print.css`, `prose.css` and the effects CSS load on every page. Load `prose` only on info/legal routes and `print` with `media="print"`; consider inlining the above-the-fold CSS. | `styles/app.css`, route `links` | -6 to -10 KB blocking CSS, -100 ms FCP | S |
| 7 | **Keep motion on the lazy path.** `LazyMotion` already loads `domAnimation` after hydration (good); confirm that nothing on the landing imports `motion` eagerly (`features-dom-max` 14 KB loads late at 379 ms, which is fine) and that `logo-loop` and `webgl-gate` are not in the initial preload set. | `motion-provider.tsx`, `logo-loop.tsx` | Covered by #4 | S |
| 8 | **Reduce DOM and style cost.** 982 elements and 510 ms of style and layout: the per-word BlurText spans and the marquee and timeline duplicates are the biggest contributors. Render the marquee items once with CSS duplication, and `content-visibility: auto` on below-the-fold sections. | `blur-text.tsx`, `model-strip.tsx`, section wrappers | -150 to -250 ms main thread; small score gain | S |
| 9 | **Serve with caching when the gate opens**: `s-maxage` and `stale-while-revalidate` for prerendered HTML, `Link: rel=preload` early hints for the two fonts. | `worker.js`, `server/` | TTFB 469 ms -> under 150 ms on a cache hit | S |
| 10 | **Measure more than `/`**: add leaderboard, models, login, faq, about to `lighthouserc.json` and fail below 85 (then 90). The leaderboard ships Recharts and the models page a 53-card grid, and neither has ever been measured. | `web/lighthouserc.json`, `web.yml` | Visibility, not score | S |

Rough target after #1 to #6: initial JS about 250 KB gz (from 406), fonts about 65 KB (from 130), LCP under 3 s, performance 88-92. If the first PR does not move the score, the likely culprit is the simulated-throttle cost of main-thread work and the next step is a Lighthouse trace comparison per change.

---

## Fix PR plan

Six small PRs, in this order. Each states the checklist items it moves (per the checklist's rule).

1. **`perf(web): paint the landing headline first and trim the critical path`**
   - Files: `web/src/features/marketing/components/hero-section.tsx`, `web/src/components/vendor/reactbits/blur-text.tsx`, `web/src/components/layout/app-providers.tsx`, `web/src/components/ui/tooltip.tsx`, `web/src/components/layout/api-provider.tsx`, `web/src/hooks/use-api-client.ts`, `web/src/features/marketing/components/landing-page.tsx`.
   - Acceptance: LHCI median mobile performance on `/` at least 85, LCP at most 3.0 s, initial JS at most 260 KB gz, `modulepreload` count at most 20, axe still 0, reduced-motion screenshots unchanged. Moves F4.
2. **`perf(web): subset fonts and split CSS`**
   - Files: `web/src/app/root.tsx`, font files under `web/public/fonts` (or a subset script), `web/src/styles/app.css`, `prose.css`, `print.css`.
   - Acceptance: fonts at most 70 KB on first load, no layout shift from font swap (CLS at most 0.02), performance at least 90 on `/`. Moves F4, F5.
3. **`ci(web): Lighthouse on every public route, state screenshots, budgets that fail`**
   - Files: `web/lighthouserc.json`, `.github/workflows/web.yml`, `web/tests/e2e/leaderboard.spec.ts`, `auth.spec.ts`, a new `states.spec.ts`.
   - Acceptance: LHCI runs on 6 routes; performance below 0.85 and initial-JS budget breaches fail the job; screenshots exist for loading, error, empty and no-match on leaderboard and models, and for login/signup error states, in both themes and both sizes. Moves F2, F5.
4. **`feat(web): human model names, rated-only ranking and share cards`**
   - Files: `web/src/features/leaderboard/lib/entries.ts`, `lib/format.ts`, `components/leaderboard-table.tsx`, `board-card-list.tsx`, `features/models/components/model-card.tsx`, `features/marketing/components/leaderboard-preview.tsx`, `web/src/app/routes/leaderboard.tsx`, `models.tsx`, `public/og/`.
   - Acceptance: no raw slug is the primary label anywhere (slug in tooltip and details); models under the minimum battles are shown as "Not yet rated" without rank; truncated text has a full-text tooltip; `og:image` and `twitter:card=summary_large_image` on both pages; times show a zone. Needs Harsh's decision on the minimum battles. Moves F6, F2.
5. **`fix(web): arena blind integrity and picker polish`** (after #52 and #53 merge)
   - Files: the arena answer-pane and vote-bar components from #53, model picker from #52.
   - Acceptance: no timing, length or token text in the DOM before the vote (unit test); picker no longer covers the heading and shows display names; arena fixtures match the leaderboard fixtures. Moves F11.
6. **`fix(web): touch targets, auth dead ends, About, tagline, forced colours`**
   - Files: `web/src/styles/base.css`, `features/auth/components/auth-callback-page.tsx`, `brand-panel.tsx`, `signup-page.tsx`, `features/info/content/about.ts`, a new `/credits/` route, `components/layout/site-footer.tsx`, `features/marketing/content/landing.ts`.
   - Acceptance: every interactive control has at least a 44 px hit area under `pointer: coarse` (Playwright bounding-box test on the shell and landing); expired-link screen offers a new link; credits on `/credits/` (About keeps a short thanks); one tagline across landing, signup and footer; `forced-colors` screenshot shows visible focus. Moves F3, F7 (first catalog), F10.

Not in the six, queued for later: the hero-composer handoff (P1-1, needs the sign-in prompt carry-over and a decision from dm-design-lead), the i18n catalog beyond the first feature (P1-9), per-page generated OG cards (P1-3), and the P2 list.
