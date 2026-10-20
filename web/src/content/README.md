# src/content

Typed data and copy shared by more than one feature, with no React in it.

- `credits.ts`: the "Built with" list: every third-party source (vendored component libraries and npm packages) with its licence and what we use from it. The About page renders it (slice S4) and the `/design/` effects gallery labels each effect with it. Keep it in sync with the inventory in [docs/redesign/licences.md](../../../docs/redesign/licences.md).

**Rules:** plain TypeScript data and small lookup helpers, unit-tested in `tests/unit/content/`. Copy used by one feature stays in that feature's `lib/`.

Owner: @harshbhx
