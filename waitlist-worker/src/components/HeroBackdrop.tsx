import { lazy, Suspense, useEffect, useState } from 'react';
import { useHydrated, useMediaQuery, useReducedMotion } from '@/lib/media';

// The WebGL light is code-split and only loads after the page has painted.
const LightRays = lazy(() => import('./reactbits/LightRays'));

/** Same check the shader needs; without WebGL2 the CSS glows below carry the look on their own. */
function supportsWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * The arena under two spotlights, one per mind: on wide screens a cyan beam from the top centre and a
 * violet one from the top right cross behind the battle preview, away from the headline; on phones
 * they come in from both top corners, dimmer. Static CSS glows sit underneath, so the hero looks
 * finished before the shader loads, without WebGL, and in screenshots of the prerendered HTML.
 * With reduced motion the beams render once and stay still.
 */
export function HeroBackdrop() {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const wide = useMediaQuery('(min-width: 768px)');
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    // Let the first paint and hydration finish before compiling shaders.
    const id = window.setTimeout(() => setWebgl(supportsWebGL2()), 120);
    return () => window.clearTimeout(id);
  }, []);

  const shared = {
    raysSpeed: reduced ? 0 : 0.5,
    lightSpread: 0.5,
    rayLength: 2.4,
    raySharpness: 0.68,
    glow: 0.45,
    haze: 0.12,
    atmosphere: 0.85,
    intensity: wide ? 1.15 : 1,
    fadeDistance: 1.6,
    saturation: 1.15,
    noiseAmount: 0.04,
    followMouse: !reduced,
    mouseInfluence: 0.06,
    cursorShadow: false,
    clickPulse: false,
    intro: !reduced,
    maxDevicePixelRatio: 1.5,
  } as const;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-[20%] -top-[30%] h-[80%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgb(0_217_255/0.16),transparent)] blur-2xl" />
      <div className="absolute -right-[20%] -top-[30%] h-[80%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.18),transparent)] blur-2xl" />
      <div className="hero-grid absolute inset-0" />

      {hydrated && webgl && (
        <Suspense fallback={null}>
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,#000_45%,transparent_92%)]">
            <div className="absolute inset-0 mix-blend-screen">
              <LightRays
                {...shared}
                raysOrigin={wide ? 'top-center' : 'top-left'}
                raysColor="#00D9FF"
                tilt={wide ? -30 : -16}
                opacity={wide ? 0.8 : 0.6}
              />
            </div>
            <div className="absolute inset-0 mix-blend-screen">
              <LightRays {...shared} raysOrigin="top-right" raysColor="#8B5CF6" tilt={wide ? 28 : 16} opacity={wide ? 0.8 : 0.7} />
            </div>
          </div>
        </Suspense>
      )}

      {/* The light source sits just above the page; the nav stays on dark. */}
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/90 via-ink/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-ink" />
    </div>
  );
}
