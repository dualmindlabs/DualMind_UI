/**
 * Light Rays, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/LightRays-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - Several beams in one WebGL2 context (`beams`), blended like `screen` in the dark theme and
 *   painted as ink in the light theme, instead of one canvas per beam.
 * - Colours come from design tokens (`--mind-a`, `--mind-b`...) and follow theme changes; light
 *   mode switches with the theme.
 * - `paused` and `maxDpr` props for components/motion/webgl-gate.tsx; the gate also handles
 *   reduced motion, so the component no longer reads the media query itself.
 * - Removed the cursor shadow, click pulses, pulsating and distortion options; named export;
 *   no 'use client'; latest props kept in a ref from an effect (React Compiler rules).
 */
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { isLightScheme, readCssColor, type Rgb, subscribeColorScheme } from '@/lib/utils/css-color';

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

export interface LightRaysBeam {
  origin: RaysOrigin;
  /** A colour token, such as `--mind-a`. */
  color: `--${string}`;
  /** Degrees, -90 to 90. */
  tilt?: number;
  /** 0 to 1. */
  opacity?: number;
}

export interface LightRaysProps {
  beams: LightRaysBeam[];
  speed?: number;
  spread?: number;
  length?: number;
  density?: number;
  sharpness?: number;
  glow?: number;
  haze?: number;
  atmosphere?: number;
  intensity?: number;
  fadeDistance?: number;
  saturation?: number;
  noise?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  intro?: boolean;
  paused?: boolean;
  maxDpr?: number;
  className?: string;
}

interface Origin {
  anchor: [number, number];
  dir: [number, number];
}

interface Settings {
  beams: LightRaysBeam[];
  speed: number;
  spread: number;
  length: number;
  density: number;
  sharpness: number;
  glow: number;
  haze: number;
  atmosphere: number;
  intensity: number;
  fade: number;
  saturation: number;
  noise: number;
  follow: boolean;
  influence: number;
  intro: boolean;
  paused: boolean;
  maxRatio: number;
}

interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const PIXEL_BUDGET = 2.4e6;
const WHITE: Rgb = [1, 1, 1];

const ORIGINS: Record<RaysOrigin, Origin> = {
  'top-left': { anchor: [0, -0.2], dir: [0, 1] },
  'top-center': { anchor: [0.5, -0.2], dir: [0, 1] },
  'top-right': { anchor: [1, -0.2], dir: [0, 1] },
  left: { anchor: [-0.2, 0.5], dir: [1, 0] },
  right: { anchor: [1.2, 0.5], dir: [-1, 0] },
  'bottom-left': { anchor: [0, 1.2], dir: [0, -1] },
  'bottom-center': { anchor: [0.5, 1.2], dir: [0, -1] },
  'bottom-right': { anchor: [1, 1.2], dir: [0, -1] },
};

const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2 uSource;
uniform vec2 uAim;
uniform float uReach;
uniform vec3 uColor;
uniform float uSpread;
uniform float uLength;
uniform float uFade;
uniform float uSaturation;
uniform float uNoise;
uniform float uDensity;
uniform float uSharpness;
uniform float uGlow;
uniform float uHaze;
uniform float uAtmosphere;
uniform float uIntensity;
uniform vec2 uIntro;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float shape(float strength, float width) {
  float edge = max(mix(0.5, 0.08, uSharpness), width);
  return mix(strength, smoothstep(0.62 - edge, 0.62 + edge, strength), uSharpness);
}

void main() {
  vec2 coord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  vec2 delta = coord - uSource;
  float distance = length(delta);
  vec2 dir = delta / max(distance, 1e-4);
  float cosAngle = dot(dir, uAim);
  float angle = cosAngle;
  float slope = fwidth(angle);
  float depth = distance / uReach;

  float source = exp(-depth * depth * 9.0) * 0.9 + exp(-depth * 3.2) * 0.25;
  float glowLight = uGlow * source * smoothstep(-0.2, 0.6, cosAngle);
  float spread = pow(max(angle, 0.0), 1.0 / uSpread);
  float lengthFalloff = clamp(1.0 - distance / (uReach * uLength), 0.0, 1.0);
  float fadeFalloff = clamp(1.0 - distance / (uReach * uFade), 0.5, 1.0);
  float envelope = spread * lengthFalloff * fadeFalloff;
  float reveal = uIntensity * uIntro.y * (1.0 - smoothstep(uIntro.x - 0.35, uIntro.x, depth));
  if ((envelope * 1.6 + glowLight) * reveal < 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float phaseA = angle * 36.2214 * uDensity + uTime * 1.5;
  float phaseB = -angle * 21.11349 * uDensity + uTime * 1.5;
  float phaseC = angle * 22.3991 * uDensity + uTime * 1.1;
  float phaseD = -angle * 18.0234 * uDensity + uTime * 1.1;
  float strengthA = clamp(0.75 + 0.15 * sin(phaseA) + 0.2 * cos(phaseB), 0.0, 1.0);
  float strengthB = clamp(0.75 + 0.15 * sin(phaseC) + 0.2 * cos(phaseD), 0.0, 1.0);
  float widthA = abs(0.15 * 36.2214 * cos(phaseA) + 0.2 * 21.11349 * sin(phaseB)) * uDensity * slope;
  float widthB = abs(0.15 * 22.3991 * cos(phaseC) + 0.2 * 18.0234 * sin(phaseD)) * uDensity * slope;
  float rayLight = envelope * (0.5 * shape(strengthA, widthA) + 0.4 * shape(strengthB, widthB));

  if (uHaze > 0.0) {
    float around = atan(uAim.x * dir.y - uAim.y * dir.x, cosAngle);
    vec2 drift = vec2(around * 2.2 + uTime * 0.035, depth * 2.6 - uTime * 0.11);
    float fog = 0.65 * valueNoise(drift * vec2(3.0, 1.0)) + 0.35 * valueNoise(drift * vec2(7.0, 2.3) + 4.1);
    rayLight *= mix(1.0, 0.25 + 1.2 * fog, uHaze);
  }

  float light = (rayLight + glowLight) * reveal;

  if (uNoise > 0.0) {
    float n = fract(sin(dot(coord * 0.02 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
    light *= 1.0 - uNoise + uNoise * n;
  }

  float near = clamp(1.2 - distance / (uResolution.y / uScale), 0.0, 1.0);
  vec3 tint = mix(vec3(0.9), vec3(0.1, 0.3, 0.5) + near * vec3(0.8, 0.6, 0.5), uAtmosphere);
  float gray = dot(tint, vec3(0.299, 0.587, 0.114));
  vec3 hue = max(mix(vec3(gray), tint, uSaturation), 0.0) * uColor;

  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uLight > 0.5) {
    vec3 color = hue * light;
    float energy = max(color.r, max(color.g, color.b));
    vec3 tone = clamp(1.0 - (1.0 - hue / max(max(hue.r, max(hue.g, hue.b)), 1e-4)) * 1.8, 0.0, 1.0);
    float warm = clamp((min(tone.r, tone.g) - tone.b) * 2.0, 0.0, 1.0);
    vec3 ink = tone * (mix(0.66, 0.94, warm) - 0.1 * smoothstep(0.4, 1.2, energy));
    float density = clamp(0.82 * (1.0 - exp(-1.5 * energy * energy)) * uOpacity + grain, 0.0, 1.0);
    fragColor = vec4(ink * density, density);
    return;
  }
  float level = light < 0.75 ? light : 0.75 + 0.25 * (1.0 - exp(-(light - 0.75) / 0.25));
  float top = max(hue.r, max(hue.g, hue.b));
  hue = mix(hue, vec3(top), smoothstep(0.8, 1.0, level) * 0.45);
  vec3 shown = clamp(hue * level, 0.0, 1.0) * level;
  fragColor = vec4(clamp(shown + grain, 0.0, level) * uOpacity, level * uOpacity);
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const smoother = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGL2RenderingContext): Program | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = vertex && fragment ? gl.createProgram() : null;
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Program['uniforms'] = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let index = 0; index < count; index++) {
    const info = gl.getActiveUniform(program, index);
    if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

/** Light rays from one or more edges of the parent. Decorative; render it through WebGLGate. */
export function LightRays({
  beams,
  speed = 1,
  spread = 0.5,
  length = 3,
  density = 1,
  sharpness = 0.35,
  glow = 0.6,
  haze = 0.25,
  atmosphere = 1,
  intensity = 1,
  fadeDistance = 1,
  saturation = 1,
  noise = 0,
  followMouse = true,
  mouseInfluence = 0.1,
  intro = true,
  paused = false,
  maxDpr = 1.5,
  className,
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const [generation, setGeneration] = useState(0);

  const settings: Settings = {
    beams,
    speed: Math.max(0, speed),
    spread: Math.max(0.001, spread),
    length: Math.max(0.01, length),
    density: clamp(density, 0.1, 6),
    sharpness: clamp(sharpness, 0, 1),
    glow: Math.max(0, glow),
    haze: clamp(haze, 0, 1),
    atmosphere: clamp(atmosphere, 0, 1),
    intensity: Math.max(0, intensity),
    fade: Math.max(0.01, fadeDistance),
    saturation: Math.max(0, saturation),
    noise: clamp(noise, 0, 1),
    follow: followMouse,
    influence: clamp(mouseInfluence, 0, 1),
    intro,
    paused,
    maxRatio: clamp(maxDpr, 0.5, 3),
  };
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    wakeRef.current?.();
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    const shader = gl ? link(gl) : null;
    if (!gl || !shader) return undefined;

    const vao = gl.createVertexArray();
    const size = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0.5, y: 0.5, seen: false };
    const aim = { x: 0.5, y: 0.5 };
    const palette = { light: false, colors: new Map<string, Rgb>() };
    let time = 0;
    let opening = settingsRef.current.intro && generation === 0 ? 0 : 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let pageVisible = document.visibilityState !== 'hidden';
    let lost = false;

    const readPalette = () => {
      palette.light = isLightScheme(container);
      palette.colors.clear();
      for (const beam of settingsRef.current.beams) {
        palette.colors.set(beam.color, readCssColor(container, beam.color) ?? WHITE);
      }
    };

    const resize = () => {
      const s = settingsRef.current;
      const rect = container.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width);
      const cssHeight = Math.max(1, rect.height);
      const detail = s.density * (0.35 + 0.65 * s.sharpness);
      const sampling = Math.max(clamp(0.35 + 0.3 * detail, 0.5, 2), s.noise > 0 ? 1 : 0);
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        s.maxRatio,
        sampling,
        Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight)),
      );
      const width = Math.max(1, Math.round(cssWidth * ratio));
      const height = Math.max(1, Math.round(cssHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      size.width = cssWidth;
      size.height = cssHeight;
      size.ratio = width / cssWidth;
    };

    const frame = (now: number) => {
      raf = 0;
      if (lost) return;
      const s = settingsRef.current;
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      time += dt * s.speed;
      if (opening < 1) opening = Math.min(1, opening + dt / 1.8);

      const steer = 1 - Math.exp(-dt / 0.2);
      const aimX = s.follow && pointer.seen ? pointer.x : 0.5;
      const aimY = s.follow && pointer.seen ? pointer.y : 0.5;
      aim.x += (aimX - aim.x) * steer;
      aim.y += (aimY - aim.y) * steer;
      const eased = 1 - Math.pow(1 - opening, 3);
      const { width, height } = size;
      const u = shader.uniforms;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(shader.program);
      gl.bindVertexArray(vao);
      gl.enable(gl.BLEND);
      if (palette.light) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.uniform2f(u.uResolution ?? null, canvas.width, canvas.height);
      gl.uniform1f(u.uScale ?? null, size.ratio);
      gl.uniform1f(u.uTime ?? null, time);
      gl.uniform1f(u.uReach ?? null, Math.max(width, height));
      gl.uniform1f(u.uSpread ?? null, s.spread);
      gl.uniform1f(u.uLength ?? null, s.length);
      gl.uniform1f(u.uFade ?? null, s.fade);
      gl.uniform1f(u.uSaturation ?? null, s.saturation);
      gl.uniform1f(u.uNoise ?? null, s.noise);
      gl.uniform1f(u.uDensity ?? null, s.density);
      gl.uniform1f(u.uSharpness ?? null, s.sharpness);
      gl.uniform1f(u.uGlow ?? null, s.glow);
      gl.uniform1f(u.uHaze ?? null, s.haze);
      gl.uniform1f(u.uAtmosphere ?? null, s.atmosphere);
      gl.uniform1f(u.uIntensity ?? null, s.intensity);
      gl.uniform2f(u.uIntro ?? null, eased * 2.6, smoother(opening / 0.5));
      gl.uniform1f(u.uLight ?? null, palette.light ? 1 : 0);

      for (const beam of s.beams) {
        const origin = ORIGINS[beam.origin];
        const tilt = (clamp(beam.tilt ?? 0, -90, 90) * Math.PI) / 180;
        const sourceX = origin.anchor[0] * width;
        const sourceY = origin.anchor[1] * height;
        const cos = Math.cos(tilt);
        const sin = Math.sin(tilt);
        let dirX = origin.dir[0] * cos - origin.dir[1] * sin;
        let dirY = origin.dir[0] * sin + origin.dir[1] * cos;
        if (s.follow && s.influence > 0) {
          const mx = aim.x * width - sourceX;
          const my = aim.y * height - sourceY;
          const ml = Math.hypot(mx, my) || 1;
          const bx = dirX + (mx / ml - dirX) * s.influence;
          const by = dirY + (my / ml - dirY) * s.influence;
          const bl = Math.hypot(bx, by) || 1;
          dirX = bx / bl;
          dirY = by / bl;
        }
        const [r, g, b] = palette.colors.get(beam.color) ?? WHITE;
        gl.uniform2f(u.uSource ?? null, sourceX, sourceY);
        gl.uniform2f(u.uAim ?? null, dirX, dirY);
        gl.uniform3f(u.uColor ?? null, r, g, b);
        gl.uniform1f(u.uOpacity ?? null, clamp(beam.opacity ?? 1, 0, 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      const settling = Math.abs(aim.x - aimX) > 1e-4 || Math.abs(aim.y - aimY) > 1e-4;
      const busy = s.speed > 0 || opening < 1 || settling;
      if (busy && visible && pageVisible && !s.paused) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || lost || !visible || !pageVisible || settingsRef.current.paused) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wakeRef.current = () => {
      if (palette.colors.size !== settingsRef.current.beams.length) readPalette();
      resize();
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = container.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(1, rect.width);
      pointer.y = (event.clientY - rect.top) / Math.max(1, rect.height);
      pointer.seen = true;
      wake();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onRestored = () => setGeneration(value => value + 1);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      wake();
    });
    resizeObserver.observe(container);

    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      wake();
    });
    intersection.observe(container);

    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const unsubscribeScheme = subscribeColorScheme(() => {
      readPalette();
      wake();
      // Repaint once even when the loop is idle, so a theme switch never leaves stale colours.
      if (!raf && !lost) frame(performance.now());
    });

    readPalette();
    resize();
    wake();

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      unsubscribeScheme();
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (!gl.isContextLost()) {
        gl.deleteVertexArray(vao);
        gl.deleteProgram(shader.program);
      }
    };
  }, [generation]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('pointer-events-none relative h-full w-full overflow-hidden', className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
