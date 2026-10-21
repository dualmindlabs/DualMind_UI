# Backend design documents

One design per feature, written before its build PR (rules: [feature-roadmap.md, section 4](../feature-roadmap.md#4-rules-for-every-backend-pr)). Each follows the same template: summary, goals and non-goals, user-visible behaviour, API (requests, responses, problem+json errors), data model, auth, limits and abuse, privacy, failure modes, observability, implementation plan, test plan, rollout, open questions.

## Wave W1: platform and quick wins

| Design | Feature | Needs from Harsh |
| --- | --- | --- |
| [BE-0-platform.md](./BE-0-platform.md) | `/api/v2` Hono router, request context, Supabase JWT verification, problem+json, zod to OpenAPI 3.1, `not_enabled` guard, Miniflare test harness | `SUPABASE_URL` (var), `SUPABASE_JWT_SECRET` only if the project still uses the legacy secret, `PRIVACY_SALT` (secret) |
| [BE-1-error-shape.md](./BE-1-error-shape.md) | Opt-in normalisation of v1 errors to problem+json at the proxy | nothing |
| [BE-2-tts-route.md](./BE-2-tts-route.md) | `/api/audio/tts` alias for `/api/speech/generate`, with a removal plan | nothing |
| [BE-3-rate-limits.md](./BE-3-rate-limits.md) | Rate Limiting binding per route group, `RateLimit-Policy` and 429 with `Retry-After` | `PRIVACY_SALT` (shared with BE-0) |
| [BE-4-leaderboard-cache.md](./BE-4-leaderboard-cache.md) | `GET /api/v2/leaderboard` from the Cache API with stale-while-revalidate and ETag | nothing |
| [BE-5-api-docs.md](./BE-5-api-docs.md) | `/api/v2/openapi.json`, `/developers/`, `/leaderboard.md`, `/llms.txt`, problem pages | nothing |

Suggested build order: BE-0, then BE-1, BE-2, BE-3 (all touch the proxy; one PR each), then BE-4, then BE-5.

## Decisions made in W1 (details in the designs)

- Hono with `@hono/zod-openapi` (zod 4), `jose` for JWTs, `@cloudflare/vitest-plugin` plus `@msw/cloudflare` for Workers tests (BE-0).
- Shared zod schemas in a top-level `contract/` folder, used by the Worker and the web client (BE-0).
- Rate limit headers use the current IETF draft names (`RateLimit-Policy`, `RateLimit`) because the binding cannot report a remaining count (BE-3).
- The human API reference is a prerendered page built from the OpenAPI file, not a third-party renderer (BE-5).
