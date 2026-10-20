import { cn } from '@/lib/utils/cn';

/**
 * The still version of the Silk background: soft diagonal folds in the deep background colour
 * with a Mind A sheen, painted with CSS gradients from the tokens (both themes). WebGLGate shows
 * it before the shader loads and instead of it when WebGL is off. Decorative.
 */
export function SilkPoster({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden bg-bg-deep', className)}
    >
      <div className="absolute -inset-1/4 rotate-[-24deg] bg-[repeating-linear-gradient(90deg,transparent_0,color-mix(in_oklab,var(--mind-a)_16%,transparent)_7%,transparent_14%,color-mix(in_oklab,var(--fg)_6%,transparent)_20%,transparent_27%)] blur-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_15%,color-mix(in_oklab,var(--mind-a)_14%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_85%_90%,color-mix(in_oklab,var(--bg)_70%,transparent),transparent)]" />
    </div>
  );
}
