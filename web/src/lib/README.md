# src/lib

Framework-free code shared across features: plain TypeScript, no React components.

- `utils/`: small helpers (`cn()` for class names, WCAG contrast maths, `css-color.ts` to read colour tokens for canvas and WebGL effects, `clipboard.ts` for copy and the system share sheet).
- `theme/`: the theme preference store and the inline script that applies it before the first paint.
- `motion/`: `webgl-policy.ts`, when a WebGL effect may run (reduced motion, Save-Data, memory, touch-first small screens, WebGL2), and `motion-preference.ts`, the motion override from `/settings/` (`dm.motion`: system, reduce or allow), the inline script that writes `<html data-motion>` before the first paint, and its mapping for Motion.
- `site/`: the site's links (header, phone menu, footer, command palette), `isActivePath()`, `pageMeta()` for a route's title, description, canonical, social tags, preview image, robots and JSON-LD, and `share.ts` for share links (`/share/<id>` and the old `?id=` forms, the same rules as the Worker's `server/share.js`).
- `models/`: `display-name.ts`, the one place that names a model for people: a curated map, the API's own display name when it reads like a title, then a prettifier for ids (`@cf/meta/llama-3.3-70b-instruct-fp8-fast` -> "Llama 3.3 70B Instruct (FP8, fast)"); plus `modelMaker` (Meta, DeepSeek, Alibaba Qwen...) and `platformLabel` ("Cloudflare Workers AI") with the "via ..." note. The API schemas run every `displayName` through it, so the leaderboard, models directory, landing, arena and share page agree; the raw id stays in `modelName`.
- `api/`: the typed API client (slice S5): endpoints, schemas, errors, SSE, the vote queue, the mock adapter and TanStack Query bindings. See its README.
- `session/`: `handoff.ts`, the landing page's signed-in hand-off to the legacy arena (the rules and the inline `<head>` script built from them), until the arena slice S8; `prompt-draft.ts`, a prompt typed on the signed-out landing page, kept in this tab's sessionStorage (capped, dropped after an hour, never sent anywhere) through sign-in, then opened in the arena's prompt box unsent.
- `supabase/`: the auth layer (slice S6): the lazily loaded Supabase client, the auth store and its state machine, the legacy session migration, the safe redirect, the route guard rule, field and password checks, and the auth emails. See its README.

**Rules:** no imports from `src/features`; every module is unit-tested in `tests/unit/lib/`.

Owner: @harshbhx
