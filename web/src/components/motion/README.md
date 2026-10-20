# src/components/motion

Our motion wrappers: the pieces that make effects safe to use. Third-party effect code lives in `components/vendor/<source>/` (see `vendor/README.md`); app code uses it through these wrappers or a feature component.

| File | What it does |
| --- | --- |
| `motion-provider.tsx` | `MotionProvider`: `LazyMotion` with Motion's animation features loaded after the first paint (`features-dom-animation.ts`), the default transition from the tokens, `reducedMotion="user"`. Wrap the part of the app that uses `m.*` components. |
| `features-dom-animation.ts`, `features-dom-max.ts` | Motion's feature bundles in their own modules, so they become lazy chunks. Layout animations (`layoutId`) load `domMax` for themselves. |
| `presets.ts` | `duration`, `ease` and `transitions` from `styles/tokens.ts`, in Motion's units. |
| `reduced-motion-scope.tsx` | `ReducedMotionScope`: forces reduced motion for a subtree (context for `useShouldReduceMotion()`, `MotionConfig`, and `data-reduced-motion` for CSS). The `/design/` preview switch uses it; a settings override can later. |
| `motion-safe.tsx` | `MotionSafe`: renders the `still` version while motion is reduced and remounts its children when the setting flips (several vendored effects read it once, at mount). |
| `reveal.tsx` | `Reveal`: in-view entrance (opacity and transform). Prerendered content stays visible; only content still below the fold after hydration is hidden and revealed. Off under reduced motion. |
| `webgl-gate.tsx` | `WebGLGate`: the gate every WebGL effect goes through. Static poster in the prerendered HTML and whenever the effect may not run (reduced motion, Save-Data, less than 4 GB of memory, touch-first small screens, no WebGL2: `lib/motion/webgl-policy.ts`); otherwise loads the lazy effect near the viewport, pauses it off-screen and in hidden tabs, caps the pixel ratio at 1.5. Decorative (`aria-hidden`), with `data-webgl` and `data-webgl-reason` for tests. |
| `light-rays-poster.tsx`, `silk-poster.tsx` | The still versions of the two WebGL backgrounds, in CSS gradients from the tokens. |

**Using a WebGL effect**

```tsx
const LightRays = lazy(() =>
  import('@/components/vendor/reactbits/light-rays').then(module => ({ default: module.LightRays })),
);

<WebGLGate className="absolute inset-0" poster={<LightRaysPoster />}>
  {({ paused, maxDpr }) => <LightRays beams={beams} paused={paused} maxDpr={maxDpr} />}
</WebGLGate>;
```

**Rules**

- Every effect has a still version and reads `useShouldReduceMotion()` (`@/hooks/use-should-reduce-motion`), which follows the OS setting live and any `ReducedMotionScope`.
- Animate only `transform`, `opacity` and `filter` (the text sweeps and the shine border repaint a small background, documented in `styles/effects.css`).
- At most one WebGL background per page, never behind the answer panes; always through `WebGLGate`, always lazy.
- Prerendered HTML never depends on JavaScript to become visible.
- Loops that run longer than five seconds next to other content need a visible pause control (WCAG 2.2.2), and stop on hover or keyboard focus.

Owner: @harshbhx
