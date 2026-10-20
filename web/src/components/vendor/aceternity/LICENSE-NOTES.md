# Aceternity UI: licence notes

Source: [Aceternity UI](https://ui.aceternity.com) by Aceternity Labs LLC.
Licence: custom, at <https://ui.aceternity.com/licence> (checked 2026-10-20). Aceternity UI ships no licence file to copy, so this note records the terms and how we comply.

## Free tier only

Every file in this folder is a **free** component, copied from the public registry at `https://ui.aceternity.com/registry/<name>.json`, which serves without an account. Nothing here comes from Aceternity UI Pro (`pro.aceternity.com`), templates or blocks, and nothing paid may be added.

| Component | File | Registry URL |
| --- | --- | --- |
| Placeholders And Vanish Input | `placeholders-and-vanish-input.tsx` | https://ui.aceternity.com/registry/placeholders-and-vanish-input.json |
| Glowing Effect | `glowing-effect.tsx` | https://ui.aceternity.com/registry/glowing-effect.json |
| Bento Grid | `bento-grid.tsx` | https://ui.aceternity.com/registry/bento-grid.json |
| Timeline | `timeline.tsx` | https://ui.aceternity.com/registry/timeline.json |

## What the licence says

- Allowed: "unlimited end products for yourself or your clients", including commercial ones; no attribution is required.
- Not allowed: "You cannot re-distribute the Item as a stock image or its source files, regardless of modifications", and no themes, templates or derivative products sold on a marketplace. The pricing FAQ adds that free components must not be resold or redistributed "as a competing template or component library".

## How we use them

- Only as part of the DualMind Arena website, adapted to our design tokens and accessibility rules (each file's header lists the changes).
- **Never as a kit:** these files are not exported from a package, registry, template or component library, and must not be.
- Open question: the licence does not say whether a public GitHub repository of a website counts as redistributing source files. Harsh accepted this risk on 2026-10-20; every component has a swap plan in [docs/redesign/licences.md](../../../../../docs/redesign/licences.md), and asking support@aceternity.com for a written OK is optional.
