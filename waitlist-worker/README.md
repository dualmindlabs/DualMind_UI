# DualMind Arena waitlist

The pre-launch waitlist at **https://early.dualmindlab.tech**. The Arena (`arena.dualmindlab.tech`) redirects share links and unknown paths here with `?ref=arena`.

It is a small Vite + React + Tailwind app, prerendered to static HTML at build time and served as static assets by the `dualmind-waitlist` Cloudflare Worker (`worker.js`).

## Commands

Node 20.19 or newer.

```bash
npm ci
npm run dev         # dev server on http://localhost:5173
npm run build       # typecheck, build to dist/, prerender dist/index.html
npm run preview     # serve dist/ on http://localhost:4173
npx playwright test # behaviour tests and screenshots (needs dist/ and dist-endpoint/, see below)
```

## Deploy

Same command as before, from this folder:

```bash
npx wrangler deploy
```

`wrangler.jsonc` has a custom build step, so Wrangler runs `npm ci && npm run build` and then uploads `dist/`. Nothing deploys this Worker automatically: merging to `master` doesn't publish the page.

## Signups

Production has **no signup backend**. Exactly like the previous page, a valid email is trimmed, lower-cased and saved in the visitor's own browser (`localStorage`, key `dualmind_waitlist`, a JSON array of emails), after a 0.9 s pause. An email already in that list is reported as a duplicate. Nothing is sent to a server, so these signups can't be read by the team.

The code is ready for a real endpoint. Building with `VITE_WAITLIST_ENDPOINT` set switches the form to:

```
POST <VITE_WAITLIST_ENDPOINT>
Content-Type: application/json

{ "email": "ada@example.com", "ref": "arena" }   // ref only when the URL had a valid one
```

`2xx` means joined, `409` means already on the list, anything else (or no answer within 10 s) shows an error. See `src/lib/waitlist.ts`.

The `ref` query parameter is read on load, accepted only if it is a short slug (`[a-z0-9_-]`, up to 40 characters) and sent with the signup in endpoint mode. `ref=arena` also shows a one-line note explaining the redirect.

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

`.github/workflows/waitlist.yml` runs on pull requests that touch this folder. It checks the deploy path with `wrangler deploy --dry-run` (which runs the build), builds a second copy with `VITE_WAITLIST_ENDPOINT=/api/waitlist` into `dist-endpoint/`, then runs Playwright against both with the signup endpoint and the leaderboard API mocked. Screenshots (desktop 1440×900 and mobile 360×780: hero, full page, success, duplicate, error, network error, reduced motion, demo battle, leaderboard) are uploaded as the `waitlist-screenshots` artifact.

To run it locally:

```bash
npm run build
VITE_WAITLIST_ENDPOINT=/api/waitlist npx vite build --outDir dist-endpoint && node scripts/prerender.mjs dist-endpoint
npx playwright install chromium
npx playwright test
```
