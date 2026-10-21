import { LightRaysPoster } from '@/components/motion/light-rays-poster';
import { WebGLGate } from '@/components/motion/webgl-gate';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

// Code-split: the shader loads only when the gate opens (never on phones or reduced motion).
const LightRays = lazyWithRetry(
  () =>
    import('@/components/vendor/reactbits/light-rays').then(module => ({
      default: module.LightRays,
    })),
  { silent: true },
);

/**
 * The hero's background, the page's one WebGL layer: two crossing beams of light, Mind A from the
 * left and Mind B from the right, over a faint dot grid. The static poster is in the prerendered
 * HTML and stays on phones, with reduced motion, Save-Data or low memory. Decorative. Its height
 * is tied to the viewport, not to the hero's content, so late fonts or live numbers never move
 * (or resize) the light: no layout shift.
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(56rem,100svh)] min-h-[40rem]"
    >
      <WebGLGate className="absolute inset-0" poster={<LightRaysPoster />}>
        {({ paused, maxDpr }) => (
          <LightRays
            beams={[
              { origin: 'top-left', color: '--mind-a', tilt: -14, opacity: 0.9 },
              { origin: 'top-right', color: '--mind-b', tilt: 14, opacity: 0.9 },
            ]}
            speed={0.45}
            spread={0.55}
            length={2.6}
            sharpness={0.62}
            glow={0.55}
            haze={0.14}
            atmosphere={0.85}
            intensity={1.2}
            fadeDistance={1.5}
            saturation={1.1}
            noise={0.035}
            mouseInfluence={0.05}
            paused={paused}
            maxDpr={maxDpr}
          />
        )}
      </WebGLGate>
      <div className="absolute inset-0 dot-grid [mask-image:radial-gradient(ellipse_55%_45%_at_50%_42%,black,transparent)] opacity-50" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-bg-deep" />
    </div>
  );
}
