# 0006. Same-origin /api through a hardened Worker proxy

- Status: Accepted
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

The legacy app calls `api.dualmindlab.tech` cross-origin. The Worker already proxies `/api/*` to the backend, but it forwards every request header, answers with `Access-Control-Allow-Origin: *`, adds `x-dualmind-proxy-*` debug headers and returns `error.toString()` on failures. A strict Content-Security-Policy needs as few origins as possible.

## Decision

- The new app calls **same-origin `/api/*`** only; the Worker proxies it to the backend.
- The proxy is hardened in the Worker hygiene PR (S1b) and tested row by row: forward only `Authorization`, `Content-Type`, `Accept`, `Accept-Language` and a request id; no `Access-Control-Allow-Origin: *`; no `x-dualmind-proxy-*` headers; no error details in responses; responses streamed straight through (SSE), with a timeout for non-streaming calls.
- The typed client (`web/src/lib/api/`, slice S5) owns schemas, errors and request ids; `POST` battle and chat calls are never retried automatically.

## Consequences

- No CORS for the app's own calls; the backend origin stays an implementation detail.
- The CSP can use `connect-src 'self'` plus the Supabase origin.
- The Worker is on the request path for every API call, so its proxy code needs the same test coverage as the backend contract.

## Alternatives considered

- **Keep cross-origin calls:** CORS configuration on the backend, a wider CSP, and the backend origin exposed in the bundle.
- **A separate API Worker or route:** more moving parts for the same effect.
