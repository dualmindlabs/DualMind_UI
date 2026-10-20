import { cn } from '@/lib/utils/cn';

/**
 * The still version of the Light Rays background: two soft beams from the top, Mind A from the
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
      <div className="absolute -top-[18%] left-[28%] size-[70%] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-a)_34%,transparent),transparent)] blur-2xl" />
      <div className="absolute -top-[18%] left-[74%] size-[70%] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-b)_36%,transparent),transparent)] blur-2xl" />
      <div className="absolute inset-0 bg-[conic-gradient(from_160deg_at_30%_-12%,transparent_0deg,color-mix(in_oklab,var(--mind-a)_22%,transparent)_10deg,transparent_24deg,color-mix(in_oklab,var(--mind-a)_14%,transparent)_32deg,transparent_44deg)] blur-md" />
      <div className="absolute inset-0 bg-[conic-gradient(from_150deg_at_72%_-12%,transparent_0deg,color-mix(in_oklab,var(--mind-b)_14%,transparent)_12deg,transparent_22deg,color-mix(in_oklab,var(--mind-b)_24%,transparent)_34deg,transparent_48deg)] blur-md" />
    </div>
  );
}
