# 0004. Own battle state machine and Streamdown for answers

- Status: Accepted
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

The Arena is not a normal chat: two answer panes must stay synchronised, the vote must happen before the model names are shown, and there are three modes (Battle, Side by side, Direct). Model output is untrusted Markdown with code and math. See [design-direction.md](../redesign/design-direction.md) sections 10 and 11.

## Decision

- A typed **`useBattle()` state machine** (`idle -> submitting -> answering -> awaiting_vote -> voting -> revealed`, plus `error` and follow-up turns), unit-tested, lives in the arena feature. `POST` battle calls are never retried automatically.
- **Streamdown** (with its code and math plugins) renders answers in every mode, hardened: `https://` links only, images only from our origins, no data images, raw HTML off, sanitising kept. It is the only place allowed to render HTML; ESLint bans `dangerouslySetInnerHTML` elsewhere.
- shadcn's AI patterns and prompt-kit are the visual reference for messages, the composer and loaders.

## Consequences

- We write and maintain about 150 lines of state machine and a few components, in exchange for an exact fit and simple tests.
- When the backend streams real tokens, the same renderer streams them; until then answers get a short progressive reveal.

## Alternatives considered

- **assistant-ui:** one runtime per thread; two panes in lockstep with a shared vote would fight it.
- **Vercel AI SDK `useChat` + AI Elements:** our API does not speak the AI SDK stream protocol, and AI Elements is being folded into shadcn and assumes Next.js.
- **marked + DOMPurify + highlight.js from CDNs** (today): three CDN scripts, no streaming safety, and a weaker CSP.

## Amendment (2026-10-21): code highlighting

Answers render code blocks with our own component (`web/src/features/arena/components/code-block.tsx`: language label, copy button), so Streamdown's code plugin is not used. Shiki is loaded directly instead, only when a code block is on screen and one grammar at a time (a fixed set of about twenty languages; anything else stays plain), with the **JavaScript regex engine** (no WebAssembly, so the enforced CSP needs no `wasm-unsafe-eval`) and a **CSS-variables theme** whose colours are our light and dark tokens. Tokens are rendered as React text, so the "no raw HTML outside Streamdown" rule still holds.
