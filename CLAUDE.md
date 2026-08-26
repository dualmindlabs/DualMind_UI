# CLAUDE.md — DualMind Arena

This document is for Claude Code / Claude desktop agent sessions. Read it along with `AGENTS.md` when working on this repository.

## Project Overview

- **Name:** DualMind Arena
- **Domain:** AI model comparison / LLM battle arena / leaderboard
- **Frontend stack:** Vanilla HTML, CSS (custom design tokens), ES modules. No React framework in production.
- **Backend:** Azure Web API (out of repo) proxied through a Cloudflare Worker.
- **Auth:** Client-side Supabase (localStorage session).
- **Deployment target:** Cloudflare Workers + static assets (`dist/`).

## Repository map (canonical files)

| Layer | File(s) |
|-------|---------|
| Config | `config.js` |
| Entry HTML | `index.html` |
| Main app | `js/ui/app.js` |
| Auth service | `js/auth/supabase-auth.js` |
| Auth init | `js/auth/supabase-init.js` |
| API facade | `js/api/DualMindApi.js` |
| API singleton | `js/apiInstance.js` |
| HTTP client | `js/api/core/HttpClient.js` |
| Components | `components/Header.js`, `components/Sidebar.js`, `components/ChatInput.js`, `components/chat/ChatView.js`, etc. |
| Worker | `worker.js` |
| Worker config | `wrangler.jsonc` |
| Design tokens | `css/tokens.css` |

Deprecated / orphaned files you should not touch for production changes:
- `App.jsx`, `next-dualmind/`, `old-html-backup/`, `arena-core.js`
- `js/api-client.js`, `js/auth.js`, `js/auth/api-service.js`

## Typical commands

```bash
# Install
npm install

# Dev (serves static files on 8000)
npm run dev

# Lint (broken until package.json glob quoting is fixed)
npm run lint

# Tests (broken until @playwright/test is installed)
npm run test

# Build (copies files to ./dist)
npm run build

# Deploy (build + wrangler deploy)
npm run deploy
```

## Critical context

### Tooling is currently broken

- `npm run lint` fails because `package.json` unquoted glob `admin-email-system/**` is expanded by the shell.
- `npm run test` fails because `@playwright/test` is not a dev dependency.
- `npm run validate` depends on both and therefore fails.

### Auth is broken in `login/auth-complete.js`

The file references undefined variables: `emailInput`, `setLoading`, `supabaseClient`, `SITE_URL`. This will crash the email/phone OTP flow. Any auth-related task must start here.

### Config / environment

`config.js` checks `process.env` which does not exist in browsers, so local env substitution does not work. Real Supabase URL and partial anon key are committed. Move configuration to build-time replacement or Wrangler secrets.

### Security headwinds

- `worker.js` responds with `Access-Control-Allow-Origin: *` for `/api/*`.
- Worker forwards request headers unfiltered to the backend.
- Auth tokens are in Supabase localStorage (XSS exposure).
- No Content-Security-Policy header.
- Heavy `innerHTML` use; Markdown is sanitized with DOMPurify but several UI templates are not.

## Coding rules

1. **Use `api` from `js/apiInstance.js`** for backend calls. Do not import `js/api-client.js` or `js/api/apiClient.js`.
2. **Use `window.DualMindAuth` / `window.DualMindAuthReady`** for auth state; do not instantiate a second Supabase client.
3. **Use CSS tokens** from `css/tokens.css`. No hardcoded hex colors in new CSS/JS templates.
4. **Sanitize dynamic HTML.** If a template string includes user-provided or model-generated content, pass it through `DOMPurify` or escape it.
5. **No `console.log` in production paths.** Prefer guarded debug toggles (`DUALMIND_CONFIG.debug.enabled`) or `console.error` for real errors.
6. **Keep window globals minimal.** If you add one, document it in `AGENTS.md`.
7. **Document file/path changes in `AGENTS.md`.**

## Common change patterns

### Adding a new CustomEvent

1. Define it in `AGENTS.md` event bus table.
2. Dispatch using `document.dispatchEvent(new CustomEvent('event-name', { detail }))`.
3. Listen in the component(s) that own the DOM changes; avoid re-rendering the whole app.

### Adding a new API call

1. Add the request method to the appropriate service in `js/api/services/`.
2. If the response shape is unusual, add an extractor in `js/api/utils/extractors.js`.
3. Use `api.<service>.<method>()` from `js/ui/app.js` or via CustomEvent handlers.

### Styling a component

1. Check if the rules already exist in `css/tokens.css`, `css/styles.css`, or `css/ui-improvements.css`.
2. Modify component-specific CSS files (`css/chat-input.css`, etc.) only if the style is truly local.
3. Ensure any new CSS variables are added to `css/tokens.css`, not inline or ad-hoc.

## Before finishing a task

- [ ] The code does not import deprecated shims.
- [ ] No new `window.*` globals were added without documentation.
- [ ] User/AI content touching `innerHTML` is sanitized.
- [ ] `AGENTS.md` and/or `CLAUDE.md` are updated if paths, events, or globals changed.
- [ ] Lint passes (after fixing the glob quoting if needed).

## Want to know more?

- `docs/CODEBASE_AUDIT.md` has the full audit with line numbers, metrics, and roadmap.
- `docs/PROJECT_HEALTH_REPORT.md` is an older, mostly outdated report from Jan 2026.
- `admin-email-system/` is a separate admin panel sub-project with its own deployment guide.
