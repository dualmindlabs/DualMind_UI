# 0005. Cloudflare Workers Builds deploys, with branch preview URLs

- Status: Accepted
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

The `dualmind-arena` Worker is deployed by Cloudflare Workers Builds, which is connected to this repository. It deploys `master` and builds every other branch as the `Workers Builds: dualmind-arena` check, publishing a preview alias URL per branch. Moving deploys to GitHub Actions was considered in the migration plan; Harsh decided on 2026-10-20 to keep Workers Builds and not change dashboard settings.

## Decision

- **Workers Builds stays the deploy path**, with its dashboard build settings unchanged.
- Because those settings are not changed, the **root build is self-contained**: `node build.js` installs and builds `web/` itself (`npm ci --include=dev`), then composes `dist/`. A root `.node-version` pins Node 22.
- Each PR's preview alias URL (`https://<branch-slug>-dualmind-arena.creharsh.workers.dev`, shown in the check's summary) is the clickable preview of a slice; open it with `?preview=dualmind-preview` once to pass the waitlist gate.
- GitHub Actions run all checks (lint, types, unit, Worker and end-to-end tests, screenshots) and never deploy the Arena.

## Consequences

- No secrets or deploy logic for the Arena in GitHub Actions; one deploy path.
- The Workers Builds check runs the full web build on every branch, so a broken build shows on the PR.
- Build time on Workers Builds includes `npm ci` for `web/` (no dependency cache for the nested project).
- Slice S1 verified the path end to end on the PR preview with curl (see the S1 pull request).

## Alternatives considered

- **Deploy from GitHub Actions** (`wrangler deploy` and `wrangler versions upload --preview-alias`, like the waitlist): more control, but needs a dashboard change to disconnect Workers Builds and duplicates what it already provides.
