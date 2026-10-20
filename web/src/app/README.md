# src/app

The React Router entry: `root.tsx` (the HTML shell: fonts, theme script, `<Meta>`/`<Links>`, error boundary, SPA fallback) and `routes.ts` (the explicit route table). React Router's `appDirectory` points here (see `react-router.config.ts`).

**Belongs here:** the root route and the route table only. Entry files (`entry.client.tsx`, `entry.server.tsx`) go here if the defaults ever need changing.

**Rules**

- Every URL is listed by hand in `routes.ts`, with its exact public path, so legacy URLs keep working. No file-system routing.
- Prerendered paths are listed in `react-router.config.ts`; client-only routes also need an entry in the Worker's `SPA_FALLBACK_ROUTES` (`server/routing.js`).
- `root.tsx` and `routes.ts` are the only files here with a default export.

Owner: @harshbhx
