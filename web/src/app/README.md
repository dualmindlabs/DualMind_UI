# src/app

The React Router app directory (`appDirectory` in `react-router.config.ts`):

- `root.tsx`: the HTML shell: fonts, the inline theme script, `<Meta>`/`<Links>`, the error boundary and the SPA fallback's loading state.
- `routes.ts`: the explicit route table.
- `routes/`: thin route modules, one per URL (see `routes/README.md`).
- Entry files (`entry.client.tsx`, `entry.server.tsx`) go here if the defaults ever need changing.

**Rules**

- Every URL is listed by hand in `routes.ts`, with its exact public path, so legacy URLs keep working. No file-system routing.
- Prerendered paths are listed in `react-router.config.ts`; client-only routes also need an entry in the Worker's `SPA_FALLBACK_ROUTES` (`server/routing.js`).
- Route modules live inside this folder because React Router only generates their `+types` for files in the app directory.
- `root.tsx`, `routes.ts` and the route modules are the only files with a default export.

Owner: @harshbhx
