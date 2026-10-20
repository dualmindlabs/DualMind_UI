# 0003. shadcn/ui (Base UI) primitives and vendored effects, with their licences

- Status: Accepted
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

The redesign needs accessible primitives (dialog, menu, tabs, select, OTP input...) and a few high-impact effects (hero backgrounds, text reveals, border beams). The repository is **public**, so every copied component is published, and licences differ: MIT, Apache-2.0, MIT + Commons Clause, custom terms, paid, AGPL. The full survey is [docs/redesign/component-catalog.md](../redesign/component-catalog.md).

## Decision

- **Primitives:** shadcn/ui, Base UI flavour, copied into `web/src/components/ui/` (no barrel file), adapted to our tokens. Slice S1 ships small stand-ins with the same variant names.
- **Effects and other third-party components:** copied into `web/src/components/vendor/<source>/` (React Bits, Magic UI, Motion Primitives, prompt-kit, Kokonut UI, a few free Aceternity UI pieces...). Every folder has a licence file (`LICENSE.md`, or `LICENSE-NOTES.md` for custom terms); every file starts with a comment naming the source URL and our changes; every component is listed in `docs/redesign/licences.md`.
- **Our wrappers** (reduced-motion gate, WebGL gate with a poster fallback) live in `web/src/components/motion/`; app code uses effects through them or through feature components.
- **Never copied:** paid or Pro code, shadcnblocks, AGPL code (Origin UI / coss ui).

## Consequences

- We own and can fix the component code; upgrades are manual, per component.
- Licence notices travel with the code, and the "Built with" credits on `/about/` and `web/THIRD_PARTY_NOTICES.md` (later slices) satisfy attribution terms.
- MIT + Commons Clause components (React Bits) may be used as part of this site but never published as a kit or template.
- Every vendored effect must be ported to our tokens and support reduced motion before it ships.

## Alternatives considered

- **A full design system dependency (HeroUI, MUI...):** a second visual language that clashes with our tokens.
- **Aceternity UI as a main source:** its licence is unclear about public repositories, so only a handful of free pieces, easy to swap.
- **npm packages for effects:** most of these libraries are distributed as copy-paste source, not packages.
