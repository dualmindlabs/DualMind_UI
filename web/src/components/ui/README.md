# src/components/ui

The UI kit: [shadcn/ui](https://ui.shadcn.com) primitives in the **Base UI** flavour (registry style `base-vega`, see `web/components.json`), redrawn with our tokens. One file per primitive, kebab-case, no barrel: import each from its own file (`@/components/ui/button`). The licence is in `LICENSE.md`; every file's header names its source item and what we changed. Every primitive is shown in its states on `/design/#components`.

| File | Built on | Notes |
| --- | --- | --- |
| `button.tsx` | Base UI Button | Variants `primary`, `human`, `secondary`, `ghost`, `outline`, `destructive`, `link`; sizes `xs`, `sm`, `md` (44px, default), `lg`, `icon-xs`, `icon-sm`, `icon`; `loading`. `buttonVariants()` styles links that look like buttons. |
| `input.tsx`, `textarea.tsx`, `label.tsx` | native elements | 16px text on phones (no iOS zoom), 15px from `sm`. |
| `field.tsx` | ours | `Field` and `GroupField` wire the label, description and error (`id`, `aria-describedby`, `aria-invalid`, `aria-required`) through a render prop. |
| `checkbox.tsx`, `radio-group.tsx`, `switch.tsx` | Base UI | Hidden native inputs for forms; label them with `Field` (`layout="control-start"` or `"control-end"`). |
| `select.tsx` | Base UI Select | Trigger matches `Input`; the popup opens below it. |
| `input-otp.tsx` | input-otp | One real input (announced as one field, `autocomplete="one-time-code"`). |
| `dialog.tsx`, `sheet.tsx` | Base UI Dialog | Focus trap, Esc, focus returns to the trigger. |
| `drawer.tsx` | Base UI Drawer | Phone sheets with swipe to dismiss. Replaces Vaul (unmaintained). |
| `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx` | Base UI | Share `popupSurface` and `popupMotion` from `dropdown-menu.tsx`. `TooltipProvider` is mounted in the root. |
| `tabs.tsx`, `toggle.tsx`, `toggle-group.tsx` | Base UI | Tabs use Base UI's sliding indicator; `segment` and `line` variants. |
| `accordion.tsx`, `scroll-area.tsx`, `separator.tsx`, `avatar.tsx` | Base UI | |
| `command.tsx` | cmdk | The command palette (`components/layout/command-palette.tsx`) and pickers. |
| `sonner.tsx` | Sonner | `Toaster` (mounted in the root) and `toast()` with our defaults: import `toast` from here, not from `sonner`. |
| `badge.tsx`, `role-badge.tsx`, `card.tsx`, `kbd.tsx`, `skeleton.tsx` | ours / shadcn | `RoleBadge` is Mind A, Mind B (with their A / B letters) or You. |

## Adding a primitive without the shadcn CLI

`npx shadcn add` installs packages, so this repository adds primitives by hand (it also keeps small machines out of `npm install`):

1. Fetch the registry item: `curl -s https://ui.shadcn.com/r/styles/base-vega/<name>.json`. Its `files[0].content` is the source; `dependencies` lists npm packages and `registryDependencies` other items.
2. Create `src/components/ui/<name>.tsx` with a header comment: the source item, "MIT, see ./LICENSE.md", and what you changed.
3. Adapt it: `cn` from `@/lib/utils/cn`; Lucide icons for `IconPlaceholder`; our token utilities for shadcn's palette (`bg-surface-2` for `bg-popover` and `bg-muted`, `text-muted` for `text-muted-foreground`, `bg-hover` for `bg-accent`, `border-line` / `border-line-strong`, `bg-scrim` for overlays); our type scale (`text-ui-sm`, `text-caption`...) for `text-sm` and `text-xs`; drop `focus-visible:ring-*` and `outline-none` (the global focus ring in `styles/base.css` applies); replace `animate-in` / `animate-out` with transitions on Base UI's `data-starting-style` / `data-ending-style` and the motion tokens (`duration-(--dur-fast)`, `ease-out-expo`); rewrite `dark:` classes to tokens.
4. Add the npm dependencies to `web/package.json` with exact versions (`npm view <pkg> version`) and let `web-lockfile.yml` resolve the lockfile.
5. Show it on `/design/` (`features/design-system/components/kit-*.tsx`), add unit tests for anything with logic, and list it in `docs/redesign/licences.md`.

Registry code that is pasted as is still renders correctly: `styles/tokens.css` maps shadcn's colour names (`background`, `foreground`, `primary`, `border`, `ring`...) onto our tokens.

## Rules

- **Tokens only.** No hex, no default Tailwind palette (it is switched off).
- **Focus:** keep the global ring. Inside menus and lists draw it inset (`focus-visible:-outline-offset-2`), never remove it.
- **Targets:** interactive elements are at least 24 by 24px, 44 by 44px on touch screens. Small controls use the `hit-area` utility (an invisible `::before`), so the visible size does not change.
- **Motion:** only `transform`, `opacity` (and `filter`) transition, on the motion tokens; `styles/base.css` makes them instant under reduced motion.
- **Variants:** names describe the role, not the colour (`human`, not `terra`; `destructive`, not `red`). A new variant needs a reason on `/design/` and a test.
- **Accessible names:** icon-only buttons get `aria-label`; decorative icons get `aria-hidden="true"`. Tooltips repeat a name, they never carry the only one.
- **Compound parts** (`DialogContent`, `SelectItem`...) live in their primitive's file, like shadcn.

Owner: @harshbhx
