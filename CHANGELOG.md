# Changelog

All notable changes to the DualMind Arena web app are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project has no tagged releases yet, so changes are grouped by month (newest first). Entries before October 2026 were reconstructed from the git history.

## [Unreleased]

### Cycle 5 truth and auth ([#138](https://github.com/dualmindlabs/DualMind_UI/issues/138))

- **Models you can meet**: the leaderboard, the Models page and "In the arena now" no longer present every row as a model for blind battles. Pick-only models (the `cloudflare` provider is never drawn for a blind battle), retired models (15 Cloudflare ones gone from its catalogue, more Groq and Google ones) and non-chat models (Llama Guard, SQLCoder, phi-2, the LoRA bases) are labelled, and left out by default. A switch on both pages (`?show=all`) adds them. The API's `active` and `blindEligible` flags decide as soon as they are sent; until then `contract/availability.ts` holds the lists. `/leaderboard.md` has the same words in its Status column.
- **Saved copies**: when the DualMind API cannot be reached the Worker serves its last copy with `meta.stale` and `meta.checkedAt`; the pages say "Showing a saved copy" and "Data as of <time>". "Live, every minute" is gone: the page says when your browser last checked.
- **Passwords**: the reset form shows only after the `PASSWORD_RECOVERY` event (or a tab marker written from it, valid for one hour and cleared on sign-out). Made-up tokens in the address no longer count.
- **Sign-in links**: tokens in the address are read only on `/auth-callback.html` and `/update-password.html`, never on `/` or another page, and the callback page asks before it replaces the account that is signed in. OAuth now returns to `/auth-callback.html`.
- **Worker**: any method but GET and HEAD on a page or file path answers 405 (it used to throw, Cloudflare error 1101), a catch-all turns any exception into a plain 500 with the security headers, OPTIONS under `/api/` answers 405, and the limiter keys IPv6 visitors by their /64.
- **Caching**: `/og/landing.png` and `/og/leaderboard.png` redirect to the renamed `-v2` cards; root images (`/og-default.png`, favicons, app icons) are cached for a day, not a year.
- **Data license**: `/data/` says what may be done with the data (leaderboard numbers CC BY 4.0, answers under each provider's terms, no prompts published). `robots.txt` carries a `Content-Signal` line and `/llms.txt` links the page.
- **Copy**: the README's first line, the FAQ answer on accounts, and the "battles left today" counter, which is now a live region and says when the day ends.

### Cycle 4 trust sweep ([#136](https://github.com/dualmindlabs/DualMind_UI/issues/136))

- **Rating claims**: the live waitlist (hero, value points, leaderboard note, `og:description`), the landing closing call to action, the leaderboard heading, the footer line and web manifest, the sign-up and how-it-works descriptions, the methodology intro, the README and the design kit no longer say that votes change a public board of ratings. A guard test scans `web/src`, `waitlist-worker`, `server` and the README. The landing and leaderboard share images are `/og/landing-v2.png` and `/og/leaderboard-v2.png` (new names, so unfurlers refetch); `/og/*` is revalidated, not immutable.
- **Passwords**: the reset form needs the recovery tokens, the `PASSWORD_RECOVERY` event or a tab marker set after one of them, not `?type=recovery`; a reload of a real reset link keeps working. Settings offers "Email me a code instead" for accounts made with the email-code tab.
- **Retired models**: "In the arena now" skips them; the leaderboard and models pages badge them "Retired" (the API's `active` flag, or a short named list until the API sends it); the snapshot is dated 26 Nov 2026.
- **Win odds** after a vote are hidden while the ratings are under audit (`RATINGS_UNDER_AUDIT`).
- **Share pages**: the "Report this page" link is underlined and coloured; compare results carry the AI notice and the link too.
- **Terms**: the Grievance Officer line prints only for a real name.
- **Guest battle and private arena** render answers as Markdown (the hardened renderer, loaded as its own chunk); the privacy and cookie pages cover guest prompts, Turnstile and the storage keys they had left out.
- **Product**: "battles left today" counters (hidden when `GET /api/arena/quota` is absent), an "Updated" time on the leaderboard and models pages, "via platform" next to the maker in the vote reveal when the API sends `provider`.
- **Small fixes**: the prompt counter announces once, the landing handoff keeps up to 8,000 characters, only prompt errors say "Edit your prompt" (with "Put the prompt back"), "Receipts are off today" on the methodology page, `robots.txt` lets crawlers read `/api/v2/leaderboard` and `/api/v2/openapi.json`, the About page says the source is source-available.
- **Proxy**: `/api` forwards `CF-Connecting-IP` as `X-DualMind-Client-IP` with `X-DualMind-Proxy-Secret` (Worker secret `BACKEND_PROXY_SECRET`, skipped when unset), so the API's guest limits and quota work per visitor.
- **CI** also runs for pull requests whose base is `cycle3/truth-and-trust`.

### Cycle 3 truth and trust ([#134](https://github.com/dualmindlabs/DualMind_UI/issues/134))

- **Rating copy**: no page, preview tag, `/leaderboard.md`, `/llms.txt` or crawler table says that votes change the ratings; they say the ratings are computed by the leaderboard service and are under audit.
- **Guest battle**: the button and the line under the answers say the visitor signs up to run the prompt again as a rated battle (a guest battle has no owner, so it cannot be voted on).
- **Public shares**: an AI-generated notice and a "Report this page" link on every shared page; Terms have a "Complaints and reports" section with a Grievance Officer slot (name is a placeholder, see KNOWN_ISSUES).
- **Passwords**: Settings asks for the current password (or an emailed code for an account without one) before it saves a new one; `/update-password.html` shows its form only for a reset link.
- **Arena prompt box**: the same 8,000-character limit as Compare, with a counter; failures pick their message by error kind (rate limit, edit your prompt), not by words in the message.
- **Landing**: the "In the arena now" list drops four retired Groq models and keeps readable names; the home description is shorter.
- **Search**: the crawler table and `/leaderboard.md` give models with fewer than 5 battles no rank.
- **Privacy**: says that each model provider sets its own rules for prompts.

### Cycle 2 launch gaps ([#132](https://github.com/dualmindlabs/DualMind_UI/issues/132))

All risky features are behind flags and OFF by default (`web/src/config/features.ts`, `web/.env.example`).

- **Phone sign-in** (SMS pumping, P0): the Phone code tab is hidden unless `VITE_FEATURE_PHONE_SIGNIN` is set, and a number must start with `+` and an allow-listed country code (`+91` for now); a bare ten-digit number is no longer read as Indian. Owner steps: Twilio geographic permissions and Supabase's hourly SMS limit.
- **Waitlist gate**: `/privacy/`, `/terms/`, `/cookies/`, `/.well-known/*` and the files they load pass the gate (`server/gate.js`); `FORCE_WAITLIST="false"` as a Worker variable also switches the gate off. The waitlist links the Arena's privacy policy and terms and says how to leave the list.
- **Waitlist worker**: `workers_dev` off, the signup refuses any host but `early.dualmindlab.tech`, the rate limit keys an IPv6 client by its /64, a known email gets the same answer as a new one (no enumeration, and the device note no longer shows an email), unknown URLs get a 404 page, the raw-IP traffic log and the referer header are gone, security headers (HSTS, CSP, frame-ancestors) come from `_headers`, and the email placeholder has readable contrast.
- **Arena worker**: `workers_dev` off (branch preview URLs stay on); compare, critique, guest-battle and private-arena battles count as battle-class (6 per minute), private-arena votes as votes; public leaderboard reads that the Cache API can answer are not counted; `/share/<id>` looks the API up only for UUID ids and counts a lookup that misses the edge cache in the read group; `/auth-verify` and the diagnostics page are gone.
- **Auth funnel**: the prompt draft and the wanted page survive a sign-up (the confirmation link opens a new tab) and an OAuth round trip, through a one-hour, read-once localStorage record (`lib/session/auth-handoff.ts`); `emailRedirectTo` carries `?redirect=`; in-app browsers (LinkedIn, Instagram, Facebook, TikTok, ...) get a "Open this page in your browser to use Google" notice with a copy-link button.
- **Search**: `/leaderboard/` and `/models/` carry an ItemList (JSON-LD) and a `<noscript>` table of the top 20 models, written by the Worker with HTMLRewriter from the cached leaderboard (1.5 s timeout, fail-safe). Compare links, settings and the auth callbacks get a title, description and share card.
- **Blind battles**: the UI works whether or not the backend masks model names: names come from the vote response when the battle response has none, and a vote queued offline says the names appear when it is sent.
- **One session copy**: the legacy `dualmind.auth.supabase` copy of the tokens is no longer written (migration and clearing stay for one more release).
- **Accessibility and copy**: `dir="auto"` on the composer, prompts and answers; one date locale (en-US); a "do not put passwords, keys or personal data in prompts" line under both prompt boxes.
- **Guest battle** (`VITE_FEATURE_GUEST_BATTLE` plus the backend flag): one battle without an account with a Turnstile check; the visitor signs up to vote and see the models. The Turnstile script loads only when the visitor focuses the box.
- **Analytics** (`VITE_ANALYTICS_TOKEN`): the Cloudflare Web Analytics beacon, cookieless, only after consent and never with Do Not Track or Global Privacy Control; funnel events `visit`, `first_battle`, `vote`, `signup`, `share` are emitted as `dm:funnel` window events (Cloudflare Web Analytics has no custom events). The privacy and cookie pages describe it.
- **Private arena** (`VITE_FEATURE_PRIVATE_ARENA` plus the backend flag): `/private/` with your own prompt set (3 arenas of 50 prompts), blind battles, your own board; "Pro (coming soon)" is a placeholder, there is no billing.

### Removed

- The classic arena (cutover slice S13a, Harsh's go on 22 Oct): `/?arena=legacy`, "Open the classic arena" in the account menu and the command palette, `/legacy-app.html` (now a 404), the legacy home page and its `js/`, `css/` and `components/`. Signed-in visitors and Supabase auth returns stay on `/` for the new arena; a leftover `?arena=` parameter or `dm.arena` value is ignored. `config.js` stays until the Cloudflare build variables are set (needs-harsh item 1a).

### Added

- The arena is ready for the four API changes of #28, #29, #30 and #33 ([DualMind_Back#28](https://github.com/dualmindlabs/DualMind_Back/pull/28), [#29](https://github.com/dualmindlabs/DualMind_Back/pull/29), [#30](https://github.com/dualmindlabs/DualMind_Back/pull/30), [#33](https://github.com/dualmindlabs/DualMind_Back/pull/33)) and still works against today's API. A battle without a `comparisonId` (a backup model answered) is accepted, offers no vote and says why in one line ("One model was unavailable, so a backup answered. This battle is not rated."), without naming a model. A 503 `upstream_unavailable` reads "Both models are busy right now. Try again in a moment."; the slug is in the problem registry and `docs/api/problems.md`. A vote the API already counted (409) shows as counted; a vote refused with 403 or 404 closes the vote bar with a short message instead of offering the same call again; a thread that belongs to another account (403) shows "This conversation belongs to another account" with a New battle action. Each battle attempt sends an `Idempotency-Key` (a UUID) that a Try again of the same prompt reuses, and the `/api` proxy forwards that one extra header.
- A fast public leaderboard at the edge (backend feature BE-4, [design](docs/backend/designs/BE-4-leaderboard-cache.md)): `GET /api/v2/leaderboard` (and `HEAD`) returns the normalised `model-stats` list (one casing, no duplicate or alias fields, `winRate` and `eloRank` guaranteed, `provisional` per model below `PROVISIONAL_BELOW` battles) from the Cache API with a content-hash `ETag`, `If-None-Match` `304`, `Cache-Control` with stale-while-revalidate and stale-if-error, and RFC 9211 `Cache-Status`. The DualMind API is called at most about once a minute per location; during an outage the last good copy (up to 24 hours) is served, otherwise a 502 or 504 problem. No account resource is needed. The schema is shared with the web app through `contract/leaderboard.ts`.
- Sharing battles (redesign slice S11, [#58](https://github.com/dualmindlabs/DualMind_UI/pull/58)). A share dialog in the arena (the thread header, the history menu and "Share this thread" in the command palette) sets who can open a thread: Private, Unlisted (anyone with the link, not shown to search engines) or Public, saved at once through `PATCH /api/threads/{id}/visibility`; the link with copy and a toast, the system share sheet where the browser has one, and a note when the API's `public_sharing` flag is off. `/share/<id>` is a public page for anyone with the link: a read-only transcript with the reveal applied where the battle was voted on (model names, the picked answer, timing and length; otherwise both models stay anonymous), the arena's hardened Markdown renderer, nothing about the owner, copy link and "Run your own battle", with loading, "private or doesn't exist" and error-with-retry states. Link previews: the Worker writes the title (the first prompt), description, canonical, robots, Open Graph and Twitter tags into the page with `HTMLRewriter` for threads the API shares publicly, from an anonymous look-up with a 1.5 s timeout and a 2-minute edge cache, never naming the models; anything else gets generic tags. A static share card is at `/og/share.png` (a per-battle image is BE-19).
- Blind battles with voting and the reveal in the new arena (redesign slice S9), now the default for signed-in visitors at `/` (`/?arena=legacy`, or "Open the classic arena" in the account menu, keeps the legacy arena for one release; `/legacy-app.html` stays reachable). A `useBattle` state machine (submitting, answering, awaiting vote, voting, revealed; errors with a retry, stop, follow-up turns on the same pair in the same thread, new battle; unit-tested) drives three modes: Battle (two anonymous models; the answers appear with a readable progressive reveal of about 1.2 s per pane, both in parallel, with "Show all", instant under reduced motion; Text Shimmer and Border Beam while waiting), Side by side (the picked pair, named from the start, vote optional) and Direct (one model, streamed for real from `POST /api/arena/chat/stream`, with stop). The vote bar (A is better, Tie, Both are bad, B is better; keys 1 to 4 outside text fields; large targets, sticky above the composer) sends through the offline vote queue, with a visible "saved offline" chip until it is sent. The reveal decrypts both model names, runs a one-shot electric border that settles into a terra outline on the chosen answer, shows response time, length and tokens per side, and is announced once in a polite live region. A password recovery link that lands on `/` now continues to `/update-password.html`; other Supabase returns are finished by the new app.
- Per-user rate limits with standard headers (backend feature BE-3, [design](docs/backend/designs/BE-3-rate-limits.md)): `server/rate-limit.js` counts `/api/*` requests (v1 proxy and `/api/v2`) per route group with the Workers Rate Limiting binding (`ratelimits` in `wrangler.jsonc`, no account resource): battle and chat 6 per minute, vote 10 per 10 s, speech 10 per minute, other writes 30 per minute, reads 30 per 10 s; health checks are exempt. Keyed by the verified user id, else by the client address (HMAC with the optional `PRIVACY_SALT` secret; without it the raw address is only an in-memory key and is never logged). Allowed responses carry `RateLimit-Policy`; over the limit the Worker answers 429 with `Retry-After`, `RateLimit` and a `rate_limited` problem (or the small v1 body) before any model call. If the limiter cannot run, the request is let through with `X-RateLimit-Status: skipped`. The web app shows a toast with the wait time on a 429 and the vote queue waits for `Retry-After`.
- The signed-in arena shell at `/` (redesign slice S8), opt-in while the battle flow is built: `/?arena=new` (or `localStorage['dm.arena'] = 'new'`) keeps a signed-in visitor on `/` instead of the legacy arena, and `/?arena=legacy` (or "Open the classic arena" in the account menu) goes back. The head script marks `<html data-arena>` before the first paint, so the landing page never flashes; the arena's code is a lazy chunk. The arena has the app header with an account menu, a thread history (a 272 px panel that collapses to a 64 px rail with `[`, a drawer on phones) grouped Today, Yesterday, Last 7 days and Older, with client-side search, rename and delete (confirm dialog, toasts), skeleton, empty and error-with-retry states; `/?thread=<id>` deep links that render a thread's past turns (prompt, two answer panes A and B, the visitor's verdict, names hidden for battles without a vote; one pane in Direct), with an A / B switch and swipe on phones; the composer (prompt-kit Prompt Input: grows with the text, Enter or Ctrl/Cmd+Enter sends, Shift+Enter for a new line), the Battle / Side by side / Direct switch on a sliding highlight, model pickers on cmdk with rank and Elo (choices stored in the legacy `battle.model.left`, `battle.model.right` and `direct.model` keys), prompt starters in five categories with "Surprise me", arena commands in the palette, and the single-key shortcuts N, / and [ outside text fields. Answers render through Streamdown with no raw HTML, https-only links (new tab, `noopener noreferrer nofollow`, host shown), no images and copyable code blocks, tested against an XSS corpus. Sending a prompt in the new arena says that battles arrive with the next update (slice S9). New dependencies: `streamdown` (Apache-2.0) and `use-stick-to-bottom` (MIT); prompt-kit pieces are vendored in `web/src/components/vendor/prompt-kit/`.
- Sign-in on the new web app (redesign slice S6): `/login/` (Continue with Google or GitHub, then email and password, an email code or a text-message code), `/signup/` (name, email, a password with live strength rules and the k-anonymity breach check, then a "check your email" state with resend), `/forgot-password/` (a link to `/update-password.html`, with a confirmation and a resend cooldown), and the two Supabase email targets rendered in place at their old addresses: `/auth-callback.html` (confirms the link, sends the welcome email through the existing edge function, moves on to `?redirect` or `/`; recovery links go on to the reset page with their hash) and `/update-password.html`. A split layout with React Bits Silk and a quote on wide screens (a still poster on phones and with reduced motion), inline errors linked with `aria-describedby`, live regions for progress, autocomplete hints, a password visibility toggle and 44 px targets. One supabase-js client (`@supabase/supabase-js` 2.117.3, loaded only when needed, implicit flow, the default storage key the legacy pages share), `AuthProvider` and `useAuth()`, a one-time migration of sessions stored only under `dualmind.auth.supabase`, the profile from `POST /api/users/sync`, a route guard, a same-origin `?redirect=` check, and sign-out that also clears the offline vote queue and the legacy session keys. The typed API client now sends the signed-in user's token. The Supabase settings come from the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` build variables (never committed), with a build-time fallback to the public values in the legacy `config.js` until those are set; without either the pages say sign-in is unavailable. The web pages' CSP allows the Supabase origin from the build and the Pwned Passwords API.
- Redirects (301, query kept, so `?redirect=` survives): `/login-modern.html`, `/login/index.html` and the old `/login/login/` copy to `/login/`; `/signup-modern.html` to `/signup/`; `/forgot-password.html` to `/forgot-password/`; the clean forms `/auth-callback` and `/update-password` to their `.html` pages. The legacy sign-in files are no longer copied to `dist/`.
- The `/api/v2` platform (backend feature BE-0, [#48](https://github.com/dualmindlabs/DualMind_UI/pull/48)): a Hono router in `server/v2/` mounted in `worker.js` before the v1 proxy (v1 is unchanged). RFC 9457 `application/problem+json` errors with a type registry (`server/problem-types.js`, `docs/api/problems.md`), a request context (`X-Request-Id` on every response, one JSON log line per request), Supabase JWT verification behind a verifier interface (JWKS with `jose`, optional HS256 secret), the `not_enabled` guard, the production-vs-preview binding chooser by host, `GET /api/v2/health`, `GET /api/v2/me` and `GET /api/v2/openapi.json`. The OpenAPI 3.1 document is generated from zod routes (`contract/`) and committed as `docs/api/openapi.v2.json`. `api.yml` runs the typecheck, the Workers Vitest tests (Miniflare) and the OpenAPI freshness check. `hono`, `@hono/zod-openapi`, `jose` and `@cloudflare/vitest-plugin` are new dependencies in `web/package.json`; `SUPABASE_URL` is a new public var in `wrangler.jsonc`.

- One error shape on request, and a working text-to-speech route, at the API proxy (backend features BE-1 and BE-2). A request that sends `Accept: application/problem+json` now gets an RFC 9457 `application/problem+json` body for every non-2xx `/api/*` answer: the nine shapes the API sends today (arena `ai.error`, `{ success: false }`, empty 401 and 404, ASP.NET ProblemDetails, the legacy 502) and the Worker's own 502 and 504, with the status, request id and `WWW-Authenticate` / `Retry-After` kept, 4xx text shown only when short and plain, 5xx text never forwarded (`server/problem-rewrite.js`). Callers that do not send the header, such as the legacy app, get the same bodies as before. The typed client sends the opt-in header and reads problem bodies (the retained `code` still arrives; a `problem` mock scenario was added). `POST /api/audio/tts`, which the API does not have, is now a deprecated alias of `POST /api/speech/generate` at the Worker: body checked (text 1 to 5000 characters, 16 KiB), audio content type guaranteed, `Deprecation` and `Link` headers (`server/audio-alias.js`), so the legacy "Read aloud" plays the server voice (KNOWN_ISSUES #7). Designs: `docs/backend/designs/BE-1-error-shape.md`, `BE-2-tts-route.md`.
- The leaderboard and models pages on the new web app (redesign slice S7). `/leaderboard/` reads the public `GET /api/arena/model-stats` without a sign-in (the legacy page asked visitors to log in first) and refreshes every minute: a live stats strip, a podium of the top three (Spotlight Cards, a Shine Border on the leader, names that decode on first view), a sortable table with ranks that roll into place, an Elo bar relative to the board's range, wins, losses and ties, win rate and battles, search, a provider filter, and a card list on phones. Models with fewer than 100 battles are marked provisional (`PROVISIONAL_BATTLES`). A row or card opens a details sheet (a drawer on phones) with the model's record and a Recharts chart of its win rate against the board. `/models/` replaces the static article about older models with a live, searchable model directory that opens the same sheet. Both pages are prerendered (title, description, canonical, Open Graph, the methodology) and show honest loading, error with retry, empty and stale-data states. The models are also in the command palette. `recharts` and `react-is` are new dependencies; the shadcn/ui chart frame is in `web/src/components/ui/chart.tsx` and loads only with the sheet.
- Shared plumbing for pages that read the API: `ApiProvider` (`web/src/components/layout/api-provider.tsx`, mounted in `AppProviders`) creates one API client from the build environment and one TanStack Query cache per app, and `useApiClient()` (`web/src/hooks/use-api-client.ts`) hands the client to features (`useQuery(leaderboardQuery(useApiClient()))`). `pageMeta()` (`web/src/lib/site/page-meta.ts`) returns the title, description, canonical URL, Open Graph and Twitter card tags for a route's `meta` function, plus an optional preview image (large Twitter card), robots directive and JSON-LD structured data.
- The landing page at `/` (redesign slice S3), prerendered and readable without JavaScript: a hero with crossing Light Rays (static poster on phones and with reduced motion), the "Two models. One prompt. You decide." headline, a composer with rotating example prompts, and a live strip with battles, votes, models and the current #1 from the public leaderboard; a model strip; "How a battle works" with an Animated Beam diagram and a playable recorded demo battle (labelled as written for illustration, votes with buttons or keys 1 to 4, a decrypted reveal and a one-shot electric border, live-region announcements); "Why blind battles" as a bento grid; the four steps on a scroll-linked timeline; the live top five with the #1 on a spotlight card; a closing call to action. Every number comes from `GET /api/arena/model-stats`; when it fails the page says so instead. SEO: title, description, canonical, Open Graph and Twitter tags, JSON-LD (WebSite, Organization) and a 1200x630 card at `/og/landing.png`.
- Signed-in hand-off while the arena is still the legacy app: `build.js` keeps the legacy home page as `dist/legacy-app.html`, and an inline `<head>` script on `/` sends visitors with a Supabase session, or with Supabase auth parameters in the URL (OAuth and email-link returns), to it before the first paint, query string and hash kept.
- `web.yml`: Lighthouse CI on `/` (mobile; accessibility 100, best practices 95 and SEO 100 required, performance 90 reported as a warning for now), a report of the JavaScript `/` loads up front against the 180 KB gzip budget, landing screenshots and the rendered Open Graph card in `web-screenshots`.
- The command palette and the toaster load their code right after hydration, so pages no longer load cmdk and Sonner up front. Zod runs without `new Function` (`jitless`), so parsing an API response no longer reports a CSP violation.

- The info, legal and 404 pages rebuilt in the new web app (redesign slice S4), prerendered at the same URLs: `/about/` (with the "Built with" credits and licenses), `/how-it-works/` (an Animated Beam diagram of a battle, the steps as a scroll-linked timeline, the rating explanation at `#rating`), `/faq/` (accordion with a deep link per question and FAQPage structured data), `/privacy/`, `/terms/` and `/cookies/` (summary box, last updated date, a table of contents that marks the current section, print styles, no effects) and a 404 page with a fuzzy "404". The pages render the typed content in `web/src/features/info/`. `build.js` now generates `sitemap.xml` and `robots.txt` from the built pages, and the Worker serves the 404 page with status 404 for every unknown address. The legacy `about/`, `how-it-works/`, `faq/`, `privacy/`, `terms/` and `cookies/` files are removed.
- The UI kit and site shell for the new web app (redesign slice S2a): 30 shadcn/ui primitives in the Base UI flavour adapted to the design tokens in `web/src/components/ui/` (buttons with a loading state, fields with wired descriptions and errors, select, one-time code input, dialog, sheet, a swipeable drawer, menus, popover, tooltip, tabs with a sliding indicator, toggles, accordion, scroll area, badges with A / B role badges, cards, command list, toasts), a site header that condenses into a pill on scroll (plus a compact app variant), a phone menu drawer, the site footer, a command palette on Ctrl+K or Cmd+K, an SVG wordmark and emblem, app icons, and a `prose` style for long text. All of it is shown on `/design/` and covered by unit and end-to-end tests (keyboard paths, focus traps, axe in both themes, screenshots).

- The effects library (redesign slice S2b) in `web/src/components/vendor/`: 27 free components from React Bits (Light Rays, Silk, Blur Text, Decrypted Text, Count Up, Shiny Text, Text Type, Spotlight Card, Star Border, Electric Border, Magnet, Logo Loop, Fuzzy Text), Magic UI (Border Beam, Shine Border, Animated Beam, Blur Fade, Marquee, Number Ticker), Motion Primitives (Text Shimmer, Animated Background, Sliding Number, Border Trail) and Aceternity UI's free tier (Placeholders And Vanish Input, Glowing Effect, Bento Grid, Timeline), each with its license file and a header naming the source and our changes. All are ported to the design tokens, have a reduced-motion version and keep text available to screen readers. Motion wrappers in `web/src/components/motion/`: `WebGLGate` (static poster on the server and for reduced motion, Save-Data, low memory, touch-first small screens or no WebGL2; lazy loading, pausing off-screen, pixel ratio capped at 1.5), `MotionSafe`, `ReducedMotionScope`, `Reveal`, `MotionProvider` (LazyMotion) and motion presets from the tokens. `/design/` gains section 07, a gallery of every effect with its source and license and a reduced-motion preview switch. The "Built with" credits are typed data in `web/src/content/credits.ts`. `web.yml` adds a bundle report and fails if the WebGL effects or Motion's features stop being lazy chunks.
- Typed API client for the web app (redesign slice S5), in `web/src/lib/api/`: one function per endpoint (health, models, battle, chat, chat stream, vote, leaderboard, threads, shared threads, user sync, text to speech, feature flags) calling same-origin `/api/*`; Zod 4 schemas that normalise the API's duplicate camelCase/snake_case fields, `{ items }` envelopes, numeric strings and nulls; one `ApiError` model with ten kinds that reads every error body shape (arena `ai.error`, `{ success: false }`, the Worker's 502/504, ASP.NET ProblemDetails, empty bodies) and a user-facing message helper; `x-request-id` on every call; per-endpoint timeouts and abort signals; retries only for `GET` (two, with backoff, jitter and `Retry-After`), never for battles, chats or votes; an SSE parser for the chat stream; an offline vote queue (`dm.voteQueue.v1`) flushed on reconnect; a mock adapter with recorded fixtures and error scenarios for tests, Playwright and a demo mode (`VITE_API_MOCK=1`); TanStack Query defaults, query keys and query/mutation builders. Text to speech now calls the real route `POST /api/speech/generate` (KNOWN_ISSUES #7). `VITE_API_BASE_URL` and `VITE_API_MOCK` are new build variables (`web/src/config/api.ts`). The unit tests report the API layer's coverage in the `web.yml` job summary.

- Worker hygiene (redesign slice S1b): security headers on every response (HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP, X-Frame-Options); an enforced Content-Security-Policy for the web app's pages with sha256 hashes of their inline scripts (computed by `build.js` into `dist/__web-manifest.json`) and a report-only policy for the legacy pages; Cache-Control and legacy redirects as tables in `server/caching.js` and `server/redirects.js` (`/index.html`, the duplicated about and how-it-works folders, `/careers`, `/auth-verify.html` and `/verify.html`, all 301 with the query kept); Dependabot for `web/`.

- The new Arena frontend in `web/` (redesign slice S1): React 19, React Router 8 in framework mode (`ssr: false`, `/design/` prerendered), Vite 8, TypeScript strict and Tailwind CSS 4, with a feature-based `src/` layout and a README per folder. Design tokens for dark and light in `web/src/styles/tokens.css` (contrast checked in tests), self-hosted fonts, a System/Dark/Light theme without a flash, and `useReducedMotion()`. The first page is `/design/`, a living style guide (not indexed).
- `build.js` composes `dist/` from the legacy files and the web build, and fails on a missing legacy file or sitemap URL, a web file that would replace a legacy one, or an unhashed build file. `.node-version` pins Node 22.
- The worker caches the web app's hashed `/assets/*` files for a year, sends `X-Robots-Tag: noindex` for `/design/`, and can answer client-only routes with the SPA fallback page (`server/routing.js`).
- `web.yml` workflow: typecheck, ESLint, Prettier, Vitest (unit and worker tests), then Playwright against the composed site served by the real worker in `wrangler dev`, with axe in both themes and screenshots (`web-screenshots` artifact). `web-lockfile.yml` resolves `web/package-lock.json` in CI.
- `docs/architecture.md` and architecture decision records in `docs/adr/`.

- Redesigned waitlist page at `early.dualmindlab.tech`, rebuilt as a prerendered Vite + React + Tailwind app in `waitlist-worker/`: a headline reveal, crossing WebGL spotlights, a hands-on demo battle, the live top five from the public leaderboard API and a marquee of the Arena's models, using React Bits and Magic UI components. A `Waitlist page` workflow builds it, runs Playwright tests and uploads desktop and mobile screenshots.
- Real waitlist signups: the waitlist worker answers `POST /api/signup` and stores emails in the Cloudflare D1 database `dualmind-waitlist` (schema in `waitlist-worker/migrations/`), with email validation, a honeypot field, a 2 KB body limit, a same-origin check and a per-IP rate limit. Until now the page only saved emails in the visitor's own browser, so none reached the team; the form now offers to send such an old local signup for real.
- `deploy-waitlist.yml` workflow: applies D1 migrations and deploys the waitlist worker on pushes to `master` that touch `waitlist-worker/`, or by hand. Needs the `CLOUDFLARE_API_TOKEN` secret.
- `LICENSE` (proprietary, all rights reserved), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, `SUPPORT.md` and this changelog.
- GitHub issue forms for bug reports and feature requests, a pull request template, `CODEOWNERS` and a Dependabot configuration for npm and GitHub Actions.

### Changed

- `/` serves the new landing page instead of the legacy arena page; signed-in visitors continue to the legacy arena at `/legacy-app.html`. Legacy HTML served at a clean URL (`/legacy-app`, `/login-modern`) now gets the same `no-store` caching as the rest of the legacy pages.
- Labels (eyebrows, badges, keyboard hints) are 12px DM Mono caps with 0.22em tracking, up from 11px, so no text on the site is smaller than 12px.

- The `/api/*` proxy forwards only `Authorization`, `Content-Type`, `Accept`, `Accept-Language` and `X-Request-Id` (generated when missing and echoed on the response), sends no CORS headers, answers upstream failures with `502`/`504` JSON (`bad_gateway`, `gateway_timeout`) instead of the error text, times out after 30 s except for event streams, and no longer adds `x-dualmind-proxy-*` headers. The blanket CORS answer to every `OPTIONS` request is gone. `X-XSS-Protection` is no longer sent.

- CI builds on Node 22 (`.node-version`), because `build.js` now builds the web app. The root ESLint config ignores `web/` and `dist/`.

- `build.js` no longer copies `waitlist.html` into `dist/` or into the waitlist worker, and the old single-file `waitlist.html` is removed.
- Rewrote `README.md` with architecture, setup, configuration, deployment and related-project sections.
- `package.json` now declares the package as `UNLICENSED` to match the proprietary license.
- ESLint upgraded from 8 to 10. `.eslintrc.json` is replaced by a flat config, `eslint.config.mjs`, with the same rules; ESLint 10's new `no-useless-assignment` rule reports warnings.
- The arena worker now redirects every request on `arena.dualmindlab.tech` (all paths and methods, including `/`, `/leaderboard/` and `/api/*`) to the waitlist with a 302, behind a single `FORCE_WAITLIST` constant in `worker.js`. `assets.run_worker_first` is on so pages that exist as static files are covered too. A `?preview=dualmind-preview` link sets a 30-day `dm_preview` cookie that skips the redirect; `?preview=off` clears it.

### Fixed

- Share links work again (KNOWN_ISSUES #3): `/share/<id>`, and the old `/share/?id=`, `?thread=` and `?threadId=` forms, answer 200 with the share page, never cached, instead of a redirect to `/share/` that lost the id. The legacy `share/` page is no longer deployed.

## 2026-08 (August 2026)

### Added

- Pre-launch waitlist page with an animated shader background, and a standalone `dualmind-waitlist` worker (`waitlist-worker/`) that serves it with traffic logging. Later redesigned in full.
- Cloudflare Flagship feature-flag binding (`FLAGS`) and the `arena.dualmindlab.tech` route on the `dualmind-arena` worker; `workers_dev` enabled.
- GitHub Actions CI pipeline that installs with pnpm, lints and builds, and uploads `dist/` as an artifact.
- `AGENTS.md` contributor guide and codebase audit documents in `docs/`.
- Root `.gitignore` covering dependencies, build output, env files and editor files.

### Changed

- The arena worker now redirects all non-API traffic to the waitlist at `early.dualmindlab.tech`, keeping query strings such as UTM parameters.
- The front-end points at `api.dualmindlab.tech`; core icons modernised.
- `config.js` defaults now point at the production Supabase project.
- CI consolidated into a single pnpm build-and-lint workflow.

### Fixed

- Cloudflare deploy: `_worker.js` is no longer copied into `dist/`.
- `pnpm-lock.yaml` re-synced with `package.json` so CI installs succeed.
- Lint errors in the waitlist worker.

### Removed

- Dead prototypes (React and Next.js demos), archived HTML, the old admin email panel and the Azure Static Web Apps workflow.

## 2026-06 (June 2026)

### Added

- Custom 404 page with matching routing in the Cloudflare worker.
- Open Graph and Twitter card meta tags on all public pages.
- Loading skeletons for the leaderboard and battle view.
- ESLint workflow on pushes and pull requests.

### Changed

- The leaderboard modal is lazy-loaded and non-critical scripts are deferred.
- Reorganised `js/` into `auth`, `api` and `ui` modules.
- Rewrote the README with an overview, architecture and setup instructions.
- Expanded `.gitignore` for env files, `dist/`, local configs and OS files.

### Fixed

- Stronger input sanitisation and XSS protection across the chat input components.

### Security

- Hard-coded Supabase credentials moved out of `config.js`.

### Removed

- Debug files, test artifacts and scratch documents.

## 2026-05 (May 2026)

### Added

- "Resend verification email" flow on the auth pages.

### Changed

- Cleaned up the auth UI wiring.

## 2026-03 (March 2026)

### Added

- Redesigned authentication flow (sign-up, sign-in, callbacks).
- Welcome emails on sign-up and an upgraded tester mode with role-based UI.
- Elo explanation in the chat UI and a redesigned leaderboard.
- `wrangler.jsonc` and `build.js` for deploying as a Cloudflare Worker with static assets.
- `ads.txt` and an ad-network verification meta tag.

### Removed

- `dist/` from version control.

## 2026-02 (February 2026)

### Added

- Custom modal and toast components, new logo and refreshed auth styles.
- Azure Static Web Apps workflow (removed again in August).

### Changed

- Design refresh and functional fixes across the UI (#4), including container-level event delegation for model selectors.
- Production API URL and worker backend updated.

### Fixed

- XSS protection in the chat input.

## 2026-01 (January 2026)

### Added

- Thread sharing with public share links and a `/share/*` route in the worker.
- Responsive layout, web-search and code-mode toggles in the chat input.
- Complete sitemap with dynamic domain handling.
- Google Indexing API integration, web app manifest and a performance monitor.

### Changed

- New UI and design system update (#3), with layout, animation and text rendering fixes.
- Chat interface and input centring updates.
- The UI points at `api.dualmindlab.tech`, with steadier health and offline handling.

### Fixed

- Supabase auth token handling, thread list refresh and the production API base URL.
- `DualMindAuthReady` promise so the app no longer falls back to guest mode before auth has loaded.

## 2025-12 (December 2025)

### Added

- Initial DualMind Arena UI.
- Markdown and math rendering in responses (#1).
- Cloudflare deployment with a worker that serves assets and proxies the API.
- `sitemap.xml`, `robots.txt` and SEO metadata.
- Admin email panel (removed in August 2026).

### Fixed

- Worker asset fallback, CSS paths and caching behaviour.
