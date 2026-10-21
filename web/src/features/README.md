# src/features

One folder per product domain: `design-system/` (the `/design/` style guide), `info/`, `leaderboard/` (the live board and the shared model details sheet, formatters and data rules), `models/` (the model directory, built on `leaderboard`'s public API) `marketing/` (the landing page at `/`: its sections in `components/`, copy and the recorded demo in `content/`, the live numbers and demo hooks in `hooks/`, the demo state machine and live totals in `lib/`) and `auth/` (the sign-in pages: `/login/`, `/signup/`, `/forgot-password/`, `/update-password.html`, `/auth-callback.html`, with the email-link URL reading in `lib/`) , `arena/` (the signed-in arena at `/`: the shell, history and composer from slice S8, battles and the reveal from S9, the share dialog from S11; it also exports the read-only `ThreadTranscript`) and `share/` (the public share page at `/share/<id>`, slice S11: its states, the summary line and the shared-thread hook) today; `settings/` arrives with its slice.

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
