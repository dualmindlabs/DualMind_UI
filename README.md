# DualMind Arena — AI Model Battle Platform

[![Live Demo](https://img.shields.io/badge/Live-arena.dualmindlab.tech-4AABC2)](https://arena.dualmindlab.tech)

DualMind Arena is a premium AI comparison platform where users run side-by-side battles between language models, vote on the best responses, and explore an open LLM leaderboard.

> **Status:** Active development / pre-launch clean-up. See `docs/CODEBASE_AUDIT.md` for current issues and the [Setup](#setup) section below for the correct way to run the project.

## What it does

- **Battle mode:** Two anonymous models respond to the same prompt; you vote before identities are revealed.
- **Arena mode:** Pick a model pair and compare responses with names visible.
- **Direct mode:** One-on-one chat with a single model.
- **Leaderboard:** Elo ratings and model stats across the community.
- **Threading, sharing, exports:** Save conversations, share them publicly or via link, export to MD/JSON/CSV/HTML/PDF.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla JavaScript (ES modules), custom CSS design tokens, Cloudflare Worker static hosting |
| Auth | Supabase client-side auth (localStorage session) |
| Backend proxy | Cloudflare Worker (`worker.js`) proxies `/api/*` to an Azure Web API |
| CSS | Custom design system in `css/tokens.css` — **not** Tailwind |
| Tests | Playwright (dependency config currently incomplete — see Setup) |

## Project Structure

```
DualMind_UI/
├── index.html                 # Main app shell
├── config.js                  # Runtime config (loaded synchronously)
├── worker.js                  # Cloudflare Worker: routing + API proxy
├── wrangler.jsonc             # Cloudflare Worker config
├── css/                       # Design tokens + component styles
├── js/                        # Core application logic
│   ├── ui/app.js              # Main App class
│   ├── apiInstance.js         # API singleton
│   ├── api/                   # API client, services, HTTP core
│   └── auth/                  # Supabase auth service + init
├── components/                # Reusable UI components
├── login/                     # Auth pages
├── leaderboard/               # Leaderboard standalone page
├── share/                     # Public shared thread view
├── docs/                      # Audit, architecture, roadmap
└── AGENTS.md                  # AI agent / contributor guide
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase credentials:**
   Edit `config.js` and set your own Supabase project values:
   ```js
   const envSupabaseUrl = 'https://your-project.supabase.co';
   const envSupabaseAnonKey = 'your-anon-key';
   ```
   > Note: `config.js` runs in the browser, so it cannot read `process.env` or `.env` files directly. Use build-time replacements or Wrangler secrets for production.

3. **Run the local dev server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:8000`.

4. **Linting (currently needs a small fix):**
   `package.json` line 9 has an unquoted glob that fails on some shells. Quote the ignore patterns, then run:
   ```bash
   npm run lint
   ```

5. **Tests (currently broken):**
   Playwright is not installed by default. If you want to run E2E tests:
   ```bash
   npm i -D @playwright/test
   npx playwright install
   npm run test
   ```

## Deployment

```bash
npm run deploy
```

This runs `npm run build` (copies the curated static set to `dist/`) then `npx wrangler deploy` using `wrangler.jsonc`.

> There is also a second build script pair (`build-deploy.js` + `wrangler-dist.toml`) that is currently redundant; we are consolidating on `build.js` + `wrangler.jsonc`.

## API Endpoints (proxied through `/api/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/arena/chat` | Single-model chat |
| `POST` | `/api/arena/dualchat` | Two-model anonymous battle |
| `POST` | `/api/arena/model-vote` | Submit a vote |
| `GET`  | `/api/arena/model-stats` | Leaderboard stats |

## Documentation

- [`AGENTS.md`](./AGENTS.md) — canonical architecture, file map, event bus, globals, and design-token rules for contributors and AI agents.
- [`CLAUDE.md`](./CLAUDE.md) — targeted guide for Claude Code / Claude desktop agents.
- [`docs/CODEBASE_AUDIT.md`](./docs/CODEBASE_AUDIT.md) — current health audit and startup-readiness roadmap.
- [`docs/DEEP_AUDIT.md`](./docs/DEEP_AUDIT.md) — fine-grained, per-file findings with line numbers.
- [`admin-email-system/DEPLOYMENT_GUIDE.md`](./admin-email-system/DEPLOYMENT_GUIDE.md) — separate admin panel sub-project.

## Contributing

1. Read `AGENTS.md` and `CLAUDE.md`.
2. Do not import deprecated shims (`js/api-client.js`, `js/auth.js`, `js/auth/api-service.js`).
3. Keep `window.*` globals minimal and document them if added.
4. Run lint and verify Playwright tests before submitting PRs.

## License

MIT — see [package.json](./package.json).
