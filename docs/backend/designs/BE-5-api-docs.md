# BE-5: Public API docs (`/api/v2/openapi.json`, `/developers/`, `/leaderboard.md`, `/llms.txt`)

Status: **proposed** (2026-10-21). Wave W1. Depends on [BE-0](./BE-0-platform.md) (committed `docs/api/openapi.v2.json`, problem registry) and [BE-4](./BE-4-leaderboard-cache.md) (leaderboard service).

## 1. Summary

Make the v2 API discoverable by people and by machines: the OpenAPI 3.1 document served by the Worker, a human API reference page in the web app built from that document at build time, the leaderboard as Markdown, an `llms.txt` index for LLM tools, and one short page per problem type.

## 2. Goals and non-goals

Goals: one source of truth (the committed OpenAPI document); no third-party scripts, no new CSP rule; pages that are indexable and cheap to serve; machine-readable entry points that agree with each other.

Non-goals: an interactive "try it" console; API keys or a developer portal; docs for v1 (kept in [endpoints.md](../../api/endpoints.md) and on the developer docs site); CORS for third-party browsers (BE-0 open question 2).

## 3. User-visible behaviour

| URL | What |
| --- | --- |
| `/api/v2/openapi.json` | the OpenAPI 3.1 document, JSON |
| `/developers/` | the API reference page: overview, conventions, every operation with parameters, JSON examples and errors, problem types, versioning and deprecation policy, a link to the OpenAPI document and to the developer docs site |
| `/leaderboard.md` | the current leaderboard as a Markdown table |
| `/llms.txt` | index of the above for LLM tools, in the llms.txt convention |
| `/problems/` and `/problems/<slug>` | the problem type pages the `type` URLs point to |

All of them sit behind the pre-launch gate until `FORCE_WAITLIST` is turned off (preview cookie works).

## 4. Decision: where the human docs live

Options considered:

1. **A renderer inside the app** (Scalar, Redoc or Swagger UI): rich and interactive, but 0.5 to 3 MB of JavaScript, inline styles and scripts that fight the enforced CSP (`script-src 'self'` plus hashes), its own theme that ignores the design tokens, and a runtime fetch of the document.
2. **Link only to the developer docs site** (`dev-doc.dualmindlab.tech`, Mintlify): zero code here, but it is a separate repository and pipeline, the v2 document would have to be copied there on every change, and the docs would not match the app's design or be available offline in previews.
3. **A prerendered route in the web app, built from the OpenAPI document** (chosen): `/developers/` is a React Router route listed in the `prerender` array. At build time a small renderer (about 300 lines, `web/src/features/developers/`) reads `docs/api/openapi.v2.json` and emits plain semantic HTML using the existing design system: operation cards, parameter tables, `<pre>` JSON examples (taken from the schema `examples`), anchors per operation. No runtime dependency, no script beyond the app shell, passes the CSP and axe checks, is crawlable, and cannot disagree with the Worker because both read the same file (the web build fails if the file is missing or invalid).

It links to the developer docs site as "more guides" and offers the document for download, so tools that prefer their own renderer (Scalar, Postman, `openapi-typescript`) still work. Mintlify can import `https://arena.dualmindlab.tech/api/v2/openapi.json` later if Harsh wants v2 in that site too (open question 1).

## 5. API

### `GET /api/v2/openapi.json` (also `HEAD`)

Public. Response `200`: the committed document, the same bytes for every caller.

Headers: `Content-Type: application/json; charset=utf-8`, `Cache-Control: public, max-age=300, stale-while-revalidate=3600`, `ETag: "oa-<first 16 hex of sha256 of the file>"` (computed once at isolate start), `X-Request-Id`. `If-None-Match` gives `304`. Errors: `405` problem (`Allow: GET, HEAD`), `429` (BE-3).

The document is bundled into the Worker with a static JSON import (`import spec from '../../docs/api/openapi.v2.json'`), so what is served is exactly what the BE-0 CI check verified. A test also compares it with `app.getOpenAPI31Document()`.

### `GET /leaderboard.md`

Public. Built from `getLeaderboard()` (BE-4), so it shares the cache and its failure behaviour.

```markdown
# DualMind Arena leaderboard

Updated: 2026-10-21T08:30:00.000Z. Ratings are Elo scores from blind head-to-head votes. Models marked "preliminary" have fewer than 30 battles.

| Rank | Model | Provider | Elo | Win rate | Battles | Status |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | llama-3.3-70b-instruct-fp8-fast | cloudflare | 1150.0 | 64.58% | 96 | |
| 2 | llama-3.1-70b-instruct | cloudflare | 1140.0 | 61.60% | 250 | |

Data as JSON: https://arena.dualmindlab.tech/api/v2/leaderboard
API description: https://arena.dualmindlab.tech/api/v2/openapi.json
Win rate counts ties as non-wins.
```

- `Content-Type: text/markdown; charset=utf-8`; `Cache-Control: public, max-age=60, stale-while-revalidate=600`; `ETag: "lbmd-<hash>"` (hash of the rendered text); `304` supported.
- Markdown escaping: `|`, `\`, `` ` `` and `*` in model names are backslash-escaped; newlines are removed. Status column: `preliminary` or empty.
- If BE-4 has no copy and fails: `502` or `504` problem JSON (`application/problem+json`), `Retry-After: 5`, `no-store`.
- `HEAD` works; other methods `405`.

### `GET /llms.txt`

Public, static text built from a template constant (`server/v2/docs/llms.ts`); the origin is taken from the request URL so previews list their own links.

```markdown
# DualMind Arena

> DualMind Arena is a blind, side-by-side comparison of AI models: users vote, and an Elo leaderboard ranks the models.

## Data

- [Leaderboard (Markdown)](https://arena.dualmindlab.tech/leaderboard.md): current ranking, one table
- [Leaderboard (JSON)](https://arena.dualmindlab.tech/api/v2/leaderboard): same data with typed fields

## API

- [OpenAPI 3.1 document](https://arena.dualmindlab.tech/api/v2/openapi.json): machine-readable description of the v2 API
- [API reference](https://arena.dualmindlab.tech/developers/): human documentation
- [Error types](https://arena.dualmindlab.tech/problems/): what each problem type means

## Optional

- [Developer docs](https://dev-doc.dualmindlab.tech/llms.txt): guides and the v1 API reference
- [Source code](https://github.com/dualmindlabs/DualMind_UI)
```

`Content-Type: text/plain; charset=utf-8`, `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`, `ETag: "llms-<hash>"`. Every link in it is checked by a test (section 11).

### `GET /problems/` and `GET /problems/<slug>`

From the BE-0 registry. `<slug>` page, Markdown (`text/markdown; charset=utf-8`, cache as `llms.txt`):

```markdown
# rate_limited (HTTP 429)

Too many requests. You sent more requests than the limit for this route group allows.

What to do: wait the number of seconds in the `Retry-After` header, then try again. Do not retry battle, chat or vote requests automatically.

See: [API reference](https://arena.dualmindlab.tech/developers/#problems)
```

Unknown slug: `404` problem. The index lists all slugs. Texts live in the registry (`server/problem-types.js` gets a `help` field), so docs and behaviour cannot drift.

### Routing in `worker.js`

A new step in `arena.fetch`, before the redirects and static steps:

```js
if (isDocRoute(pathname)) return serveDocRoute(request, env, ctx);   // /leaderboard.md, /llms.txt, /problems/*
```

`/api/v2/openapi.json` is an ordinary route of the BE-0 app. The `/developers/` page is a static file from `dist/` and needs no Worker code; the caching table (`server/caching.js`) already treats web pages from the manifest consistently. The rule `isDocRoute` accepts `GET` and `HEAD` only, and handles `405` itself.

## 6. Data model

None.

## 7. Auth

None; all public, no cookies read or set.

## 8. Limits and abuse

The three Worker-generated text routes and `openapi.json` are in the BE-3 `read` group (see BE-3 section 5). They are cheap: static text, a bundled constant, or the BE-4 cache. `/developers/` is a static asset.

## 9. Privacy

Nothing user-specific. The leaderboard text contains public model data only.

## 10. Failure modes

| Failure | Behaviour |
| --- | --- |
| Leaderboard source down, no cached copy | `/leaderboard.md` answers a 502 or 504 problem; `llms.txt`, `openapi.json` and the problem pages are unaffected (they do not call the API) |
| Spec import missing at build | the Worker build fails (static import), so a broken release cannot ship |
| `/developers/` build cannot read the spec | `web` build fails with a clear message |
| Model name with Markdown characters | escaped (tested) |

## 11. Observability

Log events: `doc_route` (`{ requestId, route: "leaderboard.md" | "llms.txt" | "problems" | "openapi", status, cache: "304" | "200" }`). Metric names (log fields until BE-20): `doc_requests_total{route,status}`. A scheduled link check is not needed; the tests below cover links.

## 12. Implementation plan

```text
server/v2/routes/openapi.ts           GET /api/v2/openapi.json (bundled JSON, ETag)
server/v2/docs/leaderboard-md.ts      renderLeaderboardMarkdown(items, meta) pure
server/v2/docs/llms.ts                renderLlmsTxt(origin) pure
server/v2/docs/problems.ts            renderProblemPage(slug), renderProblemIndex()
server/v2/docs/routes.ts              isDocRoute(), serveDocRoute()
server/problem-types.js (edit)        add `help` text per type
worker.js (edit)                      the doc route step
web/src/app/routes/developers.tsx     prerendered route
web/src/features/developers/          renderer: operations, parameters, examples, problem table
web/react-router.config.ts (edit)     add '/developers'
web/src/components/...                footer link "API" -> /developers/
docs/api/endpoints.md, CHANGELOG      mention the v2 docs
```

The renderer reads the spec with a Vite `?raw` or a JSON import from `../../../docs/api/openapi.v2.json` through an alias (`@api-spec`), so web and Worker use one file.

## 13. Test plan

- Unit: `renderLeaderboardMarkdown` (snapshot with the two-row fixture, escaping of `|` and `*`, `preliminary` status, no rows); `renderLlmsTxt` for production and preview origins; `renderProblemPage` for every registry entry (non-empty help, status matches); ETag stability.
- Unit (web): the renderer on the committed spec: every operation id appears once, every parameter row, every example is valid JSON, anchors are unique; the page has one `h1`; a snapshot of the table of problem types.
- Miniflare integration: `SELF.fetch` of `/api/v2/openapi.json` (bytes equal to the committed file, `304`, `HEAD`, 405), `/leaderboard.md` (MSW upstream: content, cache headers, 304, cold failure problem, reuses the BE-4 cache: one upstream call across `/api/v2/leaderboard` and `/leaderboard.md`), `/llms.txt`, `/problems/rate_limited`, unknown slug 404, `POST` to each gives 405.
- Link check: a test fetches every link in `llms.txt` and the leaderboard footer that points at the Arena origin through the Worker (status 200 or 3xx) and asserts external ones are well-formed URLs (no network).
- Contract: `/api/v2/openapi.json` parses as OpenAPI 3.1 (validator in the test), `info.version` equals the health route's `apiVersion`.
- End to end through `wrangler dev`: `/developers/` has status 200, enforced CSP, no console errors, axe clean in both themes (the existing a11y suite gets the route), and the link to the spec works.
- Headers: security headers present on all of these (`other` kind for non-`/api/` routes, `api` kind for `openapi.json`).

## 14. Rollout

1. Land with BE-4 (needs its service). `/leaderboard.md`, `llms.txt` and the problem pages need no account resource.
2. Add `/developers/` to the sitemap automatically (build.js lists prerendered public pages) and, if desired, `Sitemap`/`llms.txt` mention in `robots.txt` (no change needed).
3. Flags: none; remove a route to switch it off.
4. Mention the new URLs in the repository README and CHANGELOG.

## 15. Open questions

1. Should the developer docs site (Mintlify) also import the v2 OpenAPI URL, so v1 and v2 share one portal? Needs Harsh's decision and access to that repository.
2. `/llms.txt` content type: `text/plain` (chosen, broadly accepted) or `text/markdown`. Easy to change.
3. Should `/leaderboard.md` list `provisional` models at all, or only ranked ones? Default: list all, mark `preliminary`.
4. Is a "try it" console wanted later? It would need CORS and a token flow; out of scope here.
