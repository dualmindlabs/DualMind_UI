# API fixtures

Response bodies the schema and client tests run against. Prettier skips this folder, so recorded files stay byte-for-byte as recorded.

| File | Source |
| --- | --- |
| `health.recorded.json` | `GET https://api.dualmindlab.tech/health`, recorded 2026-10-20 (no token) |
| `model-stats.recorded.json` | `GET https://api.dualmindlab.tech/api/arena/model-stats`, recorded 2026-10-20 (no token). Trimmed from 53 to 7 rows (ranks 1, 2, 9, 16, 18, 18, 36: all three providers, a shared rank, a 0 % win rate); rows unchanged, including the snake_case duplicates |
| `feature-flag.recorded.json` | `GET /api/settings/feature-flag/public_sharing`, as recorded in `docs/api/endpoints.md` section 3.11 |
| `models.json`, `dualchat.json`, `chat.json`, `vote.json`, `thread*.json`, `threads.json`, `visibility.json`, `mutation.json`, `users-sync.json` | Synthetic, written from the shapes in `docs/api/endpoints.md` (these routes need a token or a `POST`, which is never sent to production). Some rows deliberately use snake_case, numeric strings, nulls and unknown enum values to exercise the normalisation |
| `chat-stream.sse.txt` | Synthetic SSE body (endpoints.md 3.5) with a comment, an unknown event type, multi-byte text and `[DONE]` |
| `errors.json` | One body per error shape the normaliser reads (arena `ai.error`, `{ success: false }`, the Worker's 502/504, the legacy Worker 502, ASP.NET ProblemDetails, the proposed nested error) |

To refresh a recording, repeat the `GET` (public routes only, never a `POST` to production) and keep the trimming rule above.
