# src/features

One folder per product domain: `design-system/` today; `arena/`, `leaderboard/`, `auth/`, `marketing/`, `info/`, `share/` and `settings/` arrive with their slices.

**Shape of a feature** (create only the folders it needs):

```text
features/<name>/
├── components/   React components, one per file, kebab-case file names
├── hooks/        use-*.ts hooks used only by this feature
├── lib/          data, pure functions and copy for this feature
├── types.ts      types shared inside the feature
└── index.ts      the public API: the only file other code may import
```

**Rules**

- Import a feature only through its `index.ts` (`@/features/arena`). Deep imports such as `@/features/arena/components/x` fail ESLint.
- Inside a feature, use relative imports (`../lib/x`); for anything outside it, use `@/`.
- Code needed by two features moves to `src/components`, `src/hooks` or `src/lib`.

Owner: @harshbhx
