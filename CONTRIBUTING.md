# Contributing to DualMind_UI

Thanks for helping improve DualMind Arena. This is a proprietary DualMind Labs repository (see [LICENSE](./LICENSE)). These rules apply to everyone who works in it, including maintainers.

By taking part you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ground rules

- **Never push to `master`.** Every change starts on its own branch.
- **Any work with more than one commit goes through a pull request.** Open the PR against `master` and wait for review and green CI before merging.
- **Never force-push** a branch someone else is working on or reviewing.
- **No secrets in the repo.** No API keys, tokens, passwords, service-role keys or `.env` files. The Supabase anon key in `config.js` is public by design; nothing else secret belongs in client code.
- Read [AGENTS.md](./AGENTS.md) before larger changes. It is the source of truth for the file map, event bus, window globals and CSS token rules, and it must be updated when you change any of them.

## Branch names

Create branches from an up-to-date `master` and use one of these prefixes:

| Prefix | Use it for | Example |
| --- | --- | --- |
| `feat/` | A new user-facing feature | `feat/leaderboard-filters` |
| `fix/` | A bug fix | `fix/share-page-cache` |
| `chore/` | Tooling, CI, dependencies, docs, refactors with no behaviour change | `chore/eslint-flat-config` |

Use short, lowercase, hyphenated names.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>(<optional scope>): <short summary in the imperative>

<optional body: what changed and why>

<optional footer: Closes #123, BREAKING CHANGE: ...>
```

| Type | When |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build scripts or dependencies |
| `ci` | GitHub Actions or other CI configuration |
| `chore` | Anything else that does not touch app behaviour |

Examples from this repo's history:

```text
feat(waitlist): full redesign + traffic logging + arena redirect
fix(build): remove _worker.js copy from dist to fix Cloudflare deploy
ci: streamline CI pipeline to pnpm build & lint, remove redundant workflows
```

Keep each commit focused on one logical change.

## Local setup and checks

Requirements: Node.js 22 (`.node-version`) and pnpm 10. `pnpm build` runs `node build.js`, which also installs and builds `web/`.

```bash
pnpm install          # install dev dependencies
pnpm dev              # serve the app on http://localhost:8000
pnpm lint             # ESLint, must pass (CI runs it)
pnpm build            # build dist/, must succeed (CI runs it)
pnpm exec playwright install chromium   # once
pnpm test             # Playwright end-to-end tests
```

On `localhost` the app talks to a local DualMind API on port 5079. See [README.md](./README.md#getting-started) for details.

Code conventions (from [AGENTS.md](./AGENTS.md)):

- Call the backend through `api` from `js/apiInstance.js`; do not import the deprecated shims.
- Use `window.DualMindAuth` / `window.DualMindAuthReady` for auth state; never create a second Supabase client.
- Use the CSS variables in `css/tokens.css`; no hard-coded brand colours.
- Sanitise any user or model content before it reaches `innerHTML` (DOMPurify or the escape helpers).
- No `console.log` in production paths.

## The web app (`web/`)

The new React frontend lives in `web/` and is replacing the legacy pages slice by slice (see [docs/architecture.md](./docs/architecture.md) and [docs/redesign/migration-plan.md](./docs/redesign/migration-plan.md)). It has its own npm project.

Requirements: Node.js 22.22 or newer (`.node-version`).

```bash
cd web
npm ci                # install from package-lock.json
npm run dev           # dev server, http://localhost:5173/design
npm run check         # typecheck + lint + Prettier check + Vitest
cd .. && node build.js && cd web   # compose dist/ (legacy + web build)
npx playwright install chromium    # once
npm run test:e2e      # Playwright against dist/ served by the real Worker
```

GitHub Actions runs all of this on every pull request (`web.yml`), uploads screenshots as the `web-screenshots` artifact, and offers a `web-autofix` patch when formatting or a fixable lint rule fails. If you cannot install dependencies locally, change `web/package.json` and let `web-lockfile.yml` resolve the lockfile for you.

Conventions (details in each `web/src/*/README.md` and in [docs/architecture.md](./docs/architecture.md#8-conventions)):

- Files and folders in kebab-case; one React component per file, PascalCase named export; hooks are `use-*.ts`.
- Only route modules (`src/app/routes/`, `root.tsx`, `routes.ts`) have a default export.
- Import features through `@/features/<name>` only; no deep imports, no barrel in `components/ui`.
- Colours, type and spacing through the token utilities from `src/styles/tokens.css`; no hex values, no default Tailwind palette.
- No `dangerouslySetInnerHTML`; no new `window` globals.
- Third-party component code goes in `src/components/vendor/<source>/` with its licence file.
- Tests live under `web/tests/` (`unit/`, `worker/`, `e2e/`).

### Web PR checklist

- [ ] `web.yml` is green: typecheck, lint, format, unit, Worker and e2e tests, axe in both themes.
- [ ] Screenshots from the `web-screenshots` artifact checked (desktop and mobile, dark and light, reduced motion), and linked in the PR.
- [ ] The page was opened on the Workers Builds preview (`?preview=dualmind-preview`).
- [ ] Every URL the slice touches still answers as before (or redirects as planned); new client-only routes are in `SPA_FALLBACK_ROUTES`.
- [ ] Copied third-party code has its licence file and a header comment, and is listed in `docs/redesign/licences.md`.
- [ ] Docs updated: the folder READMEs, `docs/architecture.md` or an ADR if a decision changed.

## Pull requests

1. Push your branch and open a pull request against `master`. Open it as a draft if it is still in progress.
2. Fill in the [pull request template](./.github/pull_request_template.md): summary, linked issue, type of change and how you tested it.
3. Link the issue it resolves (`Closes #123`).
4. Keep the PR focused. Split unrelated changes into separate PRs.

### PR checklist

- [ ] The branch name uses `feat/`, `fix/` or `chore/`.
- [ ] Commits follow Conventional Commits.
- [ ] `pnpm lint` and `pnpm build` pass locally.
- [ ] `pnpm test` passes, or the PR explains why tests do not apply.
- [ ] UI changes were checked in a browser (light and dark theme, desktop and mobile width), with screenshots in the PR.
- [ ] No secrets, tokens or environment values are committed.
- [ ] `AGENTS.md`, `README.md` and `CHANGELOG.md` are updated where relevant.

## Review process

- [CODEOWNERS](./.github/CODEOWNERS) requests a review from **@harshbhx** automatically on every pull request.
- The **CI Pipeline** workflow (lint and build) must pass. The Cloudflare Workers Builds check shows whether the worker still builds.
- Reviewers may ask for changes. Push follow-up commits to the same branch rather than opening a new PR, and reply to each comment.
- A maintainer merges the PR once it is approved and all checks pass. Delete the branch after merging.

## Reporting bugs and requesting features

Use the issue forms: [bug report](https://github.com/dualmindlabs/DualMind_UI/issues/new?template=bug_report.yml) or [feature request](https://github.com/dualmindlabs/DualMind_UI/issues/new?template=feature_request.yml). Search existing issues first.

Security problems must **not** be reported in public issues. Follow [SECURITY.md](./SECURITY.md) instead.
