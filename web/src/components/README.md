# src/components

Shared React components used by more than one feature.

- `ui/`: primitives (button, input, field...). Slice S2 replaces the S1 versions with shadcn/ui (Base UI) primitives, keeping the same props. No barrel file: import each one from its own file (`@/components/ui/button`).
- `layout/`: the shell (header, footer, theme toggle, skip link, wordmark, theme script).
- `motion/`: our motion wrappers: `MotionProvider`, `ReducedMotionScope`, `MotionSafe`, `Reveal`, `WebGLGate` with its posters, and the motion presets; see `motion/README.md`.
- `vendor/`: third-party component code, one folder per source (`reactbits/`, `magicui/`, `motion-primitives/`, `aceternity/`), each with its licence file; see `vendor/README.md`.

**Rules:** one component per file, kebab-case file names, PascalCase named exports, no default exports, colours and sizes only through the token utilities from `src/styles/tokens.css`.

Owner: @harshbhx
