import { cn } from '@/lib/utils/cn';

/**
 * The still version of the Light Rays background: rays from the two top corners, Mind A from the
 * left and Mind B from the right, painted with CSS gradients from the tokens (both themes).
 * WebGLGate shows it before the shader loads and instead of it when WebGL is off. Decorative.
 */
export function LightRaysPoster({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_35%,transparent_95%)]',
        className,
      )}
    >
      <div className="absolute -top-[30%] -left-[18%] size-[75%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-a)_45%,transparent),transparent)] blur-2xl" />
      <div className="absolute -top-[30%] -right-[18%] size-[75%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-b)_48%,transparent),transparent)] blur-2xl" />
      <div className="absolute inset-0 bg-[conic-gradient(from_112deg_at_10%_-10%,transparent_0deg,color-mix(in_oklab,var(--mind-a)_26%,transparent)_7deg,transparent_13deg,color-mix(in_oklab,var(--mind-a)_16%,transparent)_20deg,transparent_28deg,color-mix(in_oklab,var(--mind-a)_22%,transparent)_35deg,transparent_44deg,color-mix(in_oklab,var(--mind-a)_12%,transparent)_52deg,transparent_62deg)] blur-[6px]" />
      <div className="absolute inset-0 bg-[conic-gradient(from_186deg_at_90%_-10%,transparent_0deg,color-mix(in_oklab,var(--mind-b)_14%,transparent)_9deg,transparent_17deg,color-mix(in_oklab,var(--mind-b)_24%,transparent)_25deg,transparent_33deg,color-mix(in_oklab,var(--mind-b)_16%,transparent)_41deg,transparent_50deg,color-mix(in_oklab,var(--mind-b)_26%,transparent)_56deg,transparent_64deg)] blur-[6px]" />
    </div>
  );
}
