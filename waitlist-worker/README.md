# DualMind Arena waitlist

The pre-launch waitlist at **https://early.dualmindlab.tech**. The Arena (`arena.dualmindlab.tech`) redirects share links and unknown paths here with `?ref=arena`.

It is a small Vite + React + Tailwind app, prerendered to static HTML at build time and served as static assets by the `dualmind-waitlist` Cloudflare Worker (`worker.js`). The same Worker answers `POST /api/signup` (`server/signup.js`) and stores signups in Cloudflare D1.

## Commands

Node 20.19 or newer.

```bash
npm ci
npm run dev         # dev server on http://localhost:5173
npm run build       # typecheck, build to dist/, prerender dist/index.html
npm run preview     # serve dist/ on http://localhost:4173
npx playwright test # behaviour tests, handler unit tests and screenshots (needs dist/)
```

## Deploy

**GitHub Actions** deploys it: [`.github/workflows/deploy-waitlist.yml`](../.github/workflows/deploy-waitlist.yml) runs on every push to `master` that touches `waitlist-worker/`, and by hand:

```bash
gh workflow run deploy-waitlist.yml -R dualmindlabs/DualMind_UI
```

It applies new D1 migrations (`wrangler d1 migrations apply dualmind-waitlist --remote`), then runs `wrangler deploy`, then checks that the live site answers. `wrangler.jsonc` has a custom build step, so `wrangler deploy` runs `npm ci && npm run build` and uploads `dist/`.

It needs one repository secret, **`CLOUDFLARE_API_TOKEN`**: a Cloudflare API token for the DualMind Labs account with **Account > Workers Scripts > Edit** and **Account > D1 > Edit** (the easy way: the "Edit Cloudflare Workers" template plus D1 Edit). Without it the workflow stops at its first step with an error saying so. The account ID is set in the workflow; it isn't secret.

By hand, from this folder, still works: `npx wrangler deploy` (and `npx wrangler d1 migrations apply dualmind-waitlist --remote` first if `migrations/` changed).

## Signups

The form sends the email to the Worker, which stores it in the D1 database **`dualmind-waitlist`** (binding `DB`, table `signups`; schema in `migrations/0001_signups.sql`):

```
POST /api/signup
Content-Type: application/json

{ "email": "ada@example.com", "ref": "arena" }   // ref only when the URL had a valid one
```

| Answer | Meaning | The page shows |
| --- | --- | --- |
| `201 {"status":"created"}` | added | "You're on the list." |
| `200 {"status":"exists"}` | already on the list (case-insensitive) | "… is already on the list" |
| `400 {"error":"invalid_email" \| "invalid_body"}` | | "Enter a valid email address" |
| `429 {"error":"rate_limited"}` | too many tries | "Too many tries from this network" |
| `403`, `405`, `413`, `415`, `500`, or no answer within 10 s | | "We couldn't save your spot" |

What the handler does:

- **Validates** the email (the browser's `type="email"` rule, plus a dot in the domain, at most 254 characters and 64 before the `@`) and stores it trimmed and lower-cased. `ref` is kept only as a short slug (`[a-z0-9_-]`, up to 40 characters), otherwise `null`.
- **Stores** `email`, `ref`, `country` (`request.cf.country`) and `user_agent` (first 256 characters), with `created_at`. `INSERT … ON CONFLICT(email) DO NOTHING` makes repeats harmless. It does not store the IP address, and the Worker's traffic log skips `/api/` requests.
- **Abuse guards:** only same-origin `POST`s with a JSON body (the `Origin` must be the page's own, so other sites can't post through visitors' browsers); bodies over 2 KB are refused; a hidden honeypot field (`website`) that people never see: if a bot fills it, it gets a normal-looking `201` and nothing is stored; and a per-IP limit of 10 requests per 10 minutes, counted in the Cache API. That limit is per Cloudflare data centre and not atomic, so it slows scripts down rather than stopping a determined attacker.

To read the list:

```bash
npx wrangler d1 execute dualmind-waitlist --remote --command "SELECT email, ref, country, created_at FROM signups ORDER BY created_at DESC"
```

**This browser:** after a successful signup the page remembers the email in `localStorage` (`dualmind_waitlist_joined`) and greets a returning visitor with "You've already joined from this device". That is only a hint; the server decides what counts. The previous page had no backend and kept its "signups" in `localStorage['dualmind_waitlist']` only, so they never reached the team. If that key holds an email, the form fills it in and asks the visitor to join again.

The `ref` query parameter is read on load and sent with the signup. `ref=arena` also shows a one-line note explaining the redirect.

## Live data

The hero strip, the model marquee and the leaderboard section read the Arena's public leaderboard, `GET https://api.dualmindlab.tech/api/arena/model-stats` (no token; the API allows any origin). If it fails, the page says so and falls back to the documented "50+ models, 3 providers, 3 arena modes"; it never shows made-up numbers. `src/content/models.ts` is a dated snapshot of model names, used only as the marquee's first frame.

## Components

| Component | From | Used for |
| --- | --- | --- |
| LightRays | React Bits | Two crossing spotlights (cyan, violet) behind the hero |
| BlurText | React Bits | Headline reveal (adds an `as` prop) |
| DecryptedText | React Bits | Wordmark hover, model names in the leaderboard, the demo's reveal |
| Magnet | React Bits | Magnetic submit and closing buttons |
| SpotlightCard | React Bits | The three value cards |
| CountUp | React Bits | Live counts and the rolling ELO numbers |
| LogoLoop | React Bits | Marquee of the Arena's models |
| BorderBeam | Magic UI | Light running around the signup card |

React Bits components (`src/components/reactbits/`) are © David Haz under the MIT + Commons Clause license in that folder's `LICENSE.md`: they may be used as part of this site but not redistributed or sold on their own. Magic UI (`src/components/magicui/`) is MIT. Each file names its source and any change.

Motion: every animation honours `prefers-reduced-motion`. The beams render one still frame, text appears without movement, the marquee and border beam stop, and the demo answers appear in full.

## Tests and screenshots

`.github/workflows/waitlist.yml` runs on pull requests that touch this folder. It checks the deploy path with `wrangler deploy --dry-run` (which runs the build and bundles the Worker with the signup handler), then runs Playwright:

- `tests/api.spec.ts`: unit tests of `server/signup.js` and the Worker's routing in Node with a fake D1, no browser: validation, duplicates, honeypot, origin, method, content type, body size, rate limit and database errors.
- `tests/signup.spec.ts`: the page's behaviour, with `POST /api/signup` mocked (it isn't available under `vite preview`) and the leaderboard API answered from a saved response.
- `tests/screens.spec.ts`: screenshots (desktop 1440×900 and mobile 360×780: hero, full page, success, duplicate, error, network error, returning visitor, an old local-only signup, reduced motion, demo battle, leaderboard), uploaded as the `waitlist-screenshots` artifact.

To run it locally:

```bash
npm run build
npx playwright install chromium
npx playwright test
```
