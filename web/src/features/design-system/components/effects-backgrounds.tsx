import { LightRaysPoster } from '@/components/motion/light-rays-poster';
import { SilkPoster } from '@/components/motion/silk-poster';
import { WebGLGate } from '@/components/motion/webgl-gate';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

import { EffectFrame } from './effect-frame';

// Code-split: the shaders load only when a gate opens.
const LightRays = lazyWithRetry(
  () =>
    import('@/components/vendor/reactbits/light-rays').then(module => ({
      default: module.LightRays,
    })),
  { silent: true },
);
const Silk = lazyWithRetry(
  () => import('@/components/vendor/reactbits/silk').then(module => ({ default: module.Silk })),
  { silent: true },
);

/** Light Rays (landing hero) and Silk (sign-in brand panel), each behind a WebGLGate. */
export function EffectsBackgrounds() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EffectFrame effect="light-rays" stageClassName="h-80 p-0">
        <WebGLGate className="absolute inset-0" poster={<LightRaysPoster />}>
          {({ paused, maxDpr }) => (
            <LightRays
              beams={[
                { origin: 'top-left', color: '--mind-a', tilt: -12, opacity: 0.85 },
                { origin: 'top-right', color: '--mind-b', tilt: 12, opacity: 0.85 },
              ]}
              speed={0.5}
              spread={0.5}
              length={2.4}
              sharpness={0.68}
              glow={0.55}
              haze={0.12}
              atmosphere={0.85}
              intensity={1.25}
              fadeDistance={1.6}
              saturation={1.15}
              noise={0.04}
              mouseInfluence={0.06}
              paused={paused}
              maxDpr={maxDpr}
            />
          )}
        </WebGLGate>
        <div className="relative z-10 px-6 text-center">
          <p className="eyebrow text-fg-soft">Landing hero</p>
          <p className="mt-3 text-h2 font-light text-fg">
            Two models. <span className="human-voice text-human">You decide.</span>
          </p>
        </div>
      </EffectFrame>

      <EffectFrame effect="silk" stageClassName="h-80 p-0">
        <WebGLGate className="absolute inset-0" poster={<SilkPoster />}>
          {({ paused, maxDpr }) => (
            <Silk
              color="--surface-2"
              sheenColor="--mind-a"
              speed={4}
              noiseIntensity={0.9}
              sheen={0.8}
              depth={0.55}
              glow={0.5}
              paused={paused}
              maxDpr={maxDpr}
            />
          )}
        </WebGLGate>
        <figure className="relative z-10 mx-6 max-w-sm rounded-lg border border-line bg-glass p-5 shadow-raise-strong backdrop-blur-md">
          <blockquote className="text-ui text-fg">
            &ldquo;Both answers were right. Only one of them was useful.&rdquo;
          </blockquote>
          <figcaption className="mt-3 eyebrow text-muted">Sign-in brand panel</figcaption>
        </figure>
      </EffectFrame>
    </div>
  );
}
