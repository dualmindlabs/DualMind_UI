# DualMind Arena redesign: new feature proposals

Status: **proposal** (2026-10-20). Frontend first; features that need API changes are grouped for the later backend phase.

DualMind Arena is a portfolio project. Every feature here is judged by one question: **does it make the product better and more impressive to someone trying it or reading the code?** Growth, marketing, monetisation, credits purchases, referrals and newsletter features are deliberately left out.

Related: [design-direction.md](./design-direction.md), [migration-plan.md](./migration-plan.md) (slice numbers S1-S15), [screen-inventory.md](./screen-inventory.md).

Effort: S = under a day, M = 1-3 days, L = 3-5 days.

---

## Tier 1: built into the redesign slices

These cost little extra when built with the slice they belong to.

| # | Feature | What it does | Why it's worth it | Slice | Effort |
| --- | --- | --- | --- | --- | --- |
| F-1 | Command palette | `Ctrl/Cmd+K`: new battle, switch mode, jump to a thread, open a model or the leaderboard, toggle theme, sign out | Power-user polish; keyboard-first product | S2, S8 | S |
| F-2 | Recorded demo battles | Signed-out visitors can run 3-5 real, curated battles (recorded answers, clearly labelled "recorded"), vote and see the reveal, without an account and without API calls | Anyone reviewing the project can try the core flow in 10 seconds, even while the Arena is behind the waitlist | S3 | M |
| F-3 | Answer metrics on reveal | Per side: response time (`responseTimeMs`), length, tokens (`usage`) when present; time to first token in streamed modes | Makes the comparison feel like an instrument, not a chat | S9 | S |
| F-6 | Keyboard-first arena | Vote with 1-4, `N` new battle, `Esc` stop, `[` sidebar, `?` shortcut overlay; can be turned off | Speed, accessibility (WCAG 2.1.4 compliant) | S8, S9 | S |
| F-7 | Prompt starters | Category chips (code, reasoning, writing, math, fun) with curated prompts, plus "Surprise me" | A blank box is the hardest UI; starters show what the Arena is good at | S8 | S |
| F-8 | Thread organisation | Search, Today / Yesterday / Last 7 days / Older groups, rename, delete, pin (pin stored locally until the API supports it) | Roadmap item 6; history becomes usable | S8 | M |
| F-16 | Display settings | Theme (system/dark/light), reduced-motion override, density (comfortable/compact), larger text option | Accessibility and comfort, stored per device | S12 | S |
| F-17 | API status | Small status dot in header/footer from `/health`, with a popover ("API healthy, version 1.0.0") and an offline banner | Honest system state instead of silent mock answers | S2, S5 | S |
| F-18 | Offline-aware voting | Votes made offline are queued with a visible "1 vote pending" chip and sent on reconnect, with a toast | Keeps today's queue, makes it visible and trustworthy | S9 | S |

---

## Tier 2: frontend-only, after the cutover (S13)

| # | Feature | What it does | Why it's worth it | Effort |
| --- | --- | --- | --- | --- |
| F-4 | Answer diff view | A third "Diff" view (and a third tab on phones) that highlights word-level differences between A and B (`diff`, BSD-3) | Helps judge near-identical answers; a feature most arenas lack | M |
| F-5 | Vote reasons | After voting, optional one-tap tags: more accurate, clearer, better code, more concise, safer. Stored locally until B-4 ships | Richer verdicts, sets up category leaderboards | S |
| F-9 | Interactive Elo explainer | On `/how-it-works/`: pick two ratings and a result, watch both ratings update with the K-factor maths shown | Explains the ranking honestly; shows the maths behind the product | S |
| F-10 | Leaderboard insights | Provider filter, search, "provisional" badges for low sample sizes, win-rate chart, compare any two models' current stats side by side | Data you can trust and explore | M |
| F-11 | Model pages | `/models/<slug>/` prerendered at build time from a stats snapshot, refreshed live on load: rank, Elo, record, provider, recent movement (once B-3 exists) | Linkable, SEO-friendly detail pages | M |
| F-12 | Battle image card | "Save as image": a branded PNG of the prompt, both answers (trimmed) and the verdict, rendered in the browser | Makes a single battle easy to show in a portfolio or a post | S |
| F-13 | Export polish | Today's md/json/csv/html/pdf export, restyled with the brand, plus a print stylesheet | Existing feature, now presentable | S |
| F-14 | Voice input and read aloud | Dictate a prompt with the Web Speech API where supported; read answers aloud through the fixed TTS route (`/api/speech/generate`) | Accessibility; fixes KNOWN_ISSUES.md #7 | M |
| F-19 | Installable app (optional) | Web manifest, real icons, a first-party service worker that caches only the app shell (never API data) | Native feel on phones; replaces today's broken manifest and third-party worker | M |

---

## Tier 3: needs the backend (later phase, after the frontend)

These need API or data changes in DualMind_Back. Each lists the contract the frontend would expect, so the backend phase can start from it.

| # | Feature | Backend change | Frontend payoff | Effort (API + UI) |
| --- | --- | --- | --- | --- |
| B-1 | True streaming battles | `POST /api/arena/dualchat/stream`: one SSE stream with events tagged `a` / `b` (`delta`, `done`, `error`) and a `comparisonId` event first | Both panes stream real tokens in parallel; time-to-first-token per model | L |
| B-2 | Rating change on reveal | Vote response returns `{ eloBefore, eloAfter }` for both models | The reveal shows "+14 / -14", the most satisfying moment in the app | S |
| B-3 | Leaderboard history | Daily snapshots, `GET /api/arena/model-stats/history?days=30` | Sparklines, rank movement arrows, "rising" badges | M |
| B-4 | Vote reasons and categories | Store reason tags and a prompt category with each vote; per-category stats | Category leaderboards (coding, reasoning, writing) | M |
| B-5 | Head-to-head matrix | `GET /api/arena/head-to-head`: pairwise win rates and counts | Heatmap on the leaderboard, head-to-head in model sheets | M |
| B-6 | Confidence intervals | Bootstrap intervals for each model's rating, computed nightly | Honest ranking: overlapping intervals shown as ties | M |
| B-7 | Your verdicts | `GET /api/users/me/stats`: votes cast, favourite models, agreement with the crowd | A personal page that makes voting feel meaningful | M |
| B-8 | Safe retries | Idempotency key header for battle and chat `POST`s | No duplicate battles on flaky networks | S |
| B-9 | Share previews | Per-share Open Graph image rendered at the edge (Worker) from thread data | Rich link previews for shared battles | M |
| B-10 | Account data controls | Export-my-data and delete-account endpoints | Complete settings page, privacy done right | M |
| B-11 | Gauntlet mode | One prompt, four models, a short bracket of pairwise votes, results card | A memorable showcase mode built on the same vote and Elo machinery | L |

### Backend and API testing phase (after the frontend)

- Generate TypeScript types from the API's OpenAPI document (published in the developer docs) with `openapi-typescript`, and fail CI when the client and the schema drift.
- Contract tests: run the frontend's Zod schemas against recorded responses from a **local** API (never production `POST`s), in the backend repo's CI.
- End-to-end smoke against a staging API once one exists (Supabase dev project + local API in a container in CI).

---

## Explicitly out of scope

- Credits purchases, pricing pages, payment checkout (the unmerged `feature/energy-system` branch is not ported).
- Referral programmes, newsletter capture, waitlist growth features, ads, tracking pixels.
- Social feeds, comments, public profiles.
