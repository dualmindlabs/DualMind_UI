/**
 * Electric Border, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/ElectricBorder-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - Only the WebGL overlay: it fills its positioned parent and bleeds 64px outside it, so the
 *   parent keeps its own border (the static outline it settles into) and content. Render it
 *   through components/motion/webgl-gate.tsx, which handles reduced motion and pausing.
 * - Colour is a design token and follows theme changes; light mode switches with the theme.
 * - `paused` and `maxDpr` props (pixel ratio capped at 1.5 by default).
 * - Removed the cursor heat, click surges and spark arcs (shader and JavaScript), `interactive`,
 *   `cursorRadius` and `offset`; named export; no 'use client'.
 */
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { isLightScheme, readCssColor, subscribeColorScheme } from '@/lib/utils/css-color';

export interface ElectricBorderProps {
  /** Colour token. */
  color?: `--${string}`;
  speed?: number;
  chaos?: number;
  spread?: number;
  thickness?: number;
  strands?: number;
  glow?: number;
  intensity?: number;
  flicker?: number;
  /** Corner radius of the parent, in pixels. */
  borderRadius?: number;
  /** Fades the current in (true) or out (false). */
  active?: boolean;
  /** Runs the current around the border once when it starts. */
  intro?: boolean;
  paused?: boolean;
  maxDpr?: number;
  className?: string;
}

interface Settings {
  color: `--${string}`;
  speed: number;
  chaos: number;
  spread: number;
  thickness: number;
  strands: number;
  glow: number;
  intensity: number;
  flicker: number;
  borderRadius: number;
  active: boolean;
  intro: boolean;
  paused: boolean;
  maxDpr: number;
}

interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

interface BorderPath {
  hx: number;
  hy: number;
  r: number;
  vr: number;
  ax: number;
  ay: number;
  perimeter: number;
}

const MARGIN = 64;
const PIXEL_BUDGET = 3e6;
const HALF_PI = Math.PI / 2;

const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uSize;
uniform float uRatio;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform vec3 uParam;
uniform float uPerimeter;
uniform vec4 uCells;
uniform vec2 uSoft;
uniform float uTime;
uniform float uPower;
uniform float uReveal;
uniform vec3 uCore;
uniform vec3 uGlowColor;
uniform float uIntensity;
uniform float uGlow;
uniform float uThickness;
uniform float uStrands;
uniform float uChaos;
uniform float uSpread;
uniform float uFlicker;
uniform float uInk;

out vec4 fragColor;

uint scramble(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

vec2 slant(uint x, uint y, uint seed) {
  uint h = scramble(x * 0x8da6b343u + y * 0xd8163841u + seed * 0xcb1ab31fu);
  return vec2(uvec2(h, h >> 8u) & 255u) / 127.5 - 1.0;
}

vec2 ring(vec2 p, float period, uint seed) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float du = 30.0 * f.x * f.x * (f.x * (f.x - 2.0) + 1.0);
  uint x0 = uint(mod(i.x, period));
  uint x1 = uint(mod(i.x + 1.0, period));
  uint y0 = uint(i.y + 65536.0);
  vec2 ga = slant(x0, y0, seed);
  vec2 gb = slant(x1, y0, seed);
  vec2 gc = slant(x0, y0 + 1u, seed);
  vec2 gd = slant(x1, y0 + 1u, seed);
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  float value = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  float gx = ga.x + u.x * (gb.x - ga.x) + u.y * (gc.x - ga.x) + u.x * u.y * (ga.x - gb.x - gc.x + gd.x);
  return vec2(value, gx + du * (vb - va + u.y * k));
}

float wobble(float x, uint seed) {
  return ring(vec2(x, 0.5), 1048576.0, seed).x;
}

vec2 frameAt(vec2 p) {
  vec2 inner = max(uHalf - uRadius, 0.0);
  vec2 q = abs(p) - inner;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float quarter = uPerimeter * 0.25;
  vec2 v = abs(p) - uParam.xy;
  float t;
  if (v.x > 0.0 && v.y > 0.0) t = uParam.x + uParam.z * atan(v.x, v.y);
  else if (v.x > v.y) t = uParam.x + 1.5707963 * uParam.z + uParam.y - abs(p.y);
  else t = abs(p.x);
  t = clamp(t, 0.0, quarter);
  float s = p.x >= 0.0 ? (p.y < 0.0 ? t : 2.0 * quarter - t) : (p.y < 0.0 ? 4.0 * quarter - t : 2.0 * quarter + t);
  return vec2(s, d);
}

vec2 glowShape(float line, float spread, float w) {
  float x = abs(line);
  float y = abs(spread);
  return vec2(exp(-x * x / (w * w * 0.5)) + exp(-y / (w * 2.2)) * 0.6, exp(-y / (w * 4.5)) * 0.5);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x / uRatio, uSize.y - gl_FragCoord.y / uRatio);
  vec2 frame = frameAt(p - uCenter);
  float s = frame.x;
  float d = frame.y;
  float t = uTime;
  vec3 light = vec3(0.0);
  float energy = 0.0;
  float hot = 0.0;

  float along = min(s, uPerimeter - s);
  float front = uReveal * (uPerimeter * 0.5 + 80.0);
  float shown = smoothstep(front, front - 70.0, along) * uPower;
  float flare = uReveal < 1.0 ? exp(-pow((along - front + 30.0) / 26.0, 2.0)) * uPower : 0.0;
  float heat = min(flare * 0.6, 1.2);
  vec2 inset = min(p, uSize - p);
  float frameFade = smoothstep(0.0, 14.0, min(inset.x, inset.y));

  float edge = abs(d);
  float inward = d < 0.0 ? exp(d / 14.0) : 1.0;
  float bloom = (exp(-edge / 3.0) * 0.1 + exp(-edge / 16.0) * 0.05 * inward) * uGlow * (1.0 + heat * 0.6) * shown;
  light += uGlowColor * bloom;
  energy += bloom;

  float bendAmp = uSpread * 16.0 * (1.0 + heat * 0.35);
  float rippleAmp = uSpread * 6.0 * (1.0 + heat * 0.3);
  float crinkleAmp = uChaos * 4.5 * (1.0 + heat * 0.3);
  float squeeze = min(1.0, 34.0 / max((bendAmp + rippleAmp) * 1.6 + crinkleAmp, 1e-3));
  bendAmp *= squeeze;
  rippleAmp *= squeeze;
  crinkleAmp *= squeeze;
  float reach = (bendAmp * 1.9 + rippleAmp + crinkleAmp * 1.6) * 1.3 + uThickness * 14.0 + 8.0;
  if (edge < reach && shown > 0.0) {
    float fade = smoothstep(reach, reach * 0.55, edge);
    float count = min(uStrands + heat * 1.2, 6.0);
    float slopeScale = 1.0 / uPerimeter;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      if (fi >= ceil(count)) break;
      float present = clamp(count - fi, 0.0, 1.0);
      uint seed = uint(i) * 7u + 3u;
      float lead = i == 0 ? 1.0 : 0.0;
      float range = mix(1.35 + fi * 0.18, 0.7, lead);
      float x = s * slopeScale;
      vec2 a = ring(vec2(x * uCells.x, t * 0.7 + fi * 3.1), uCells.x, seed);
      vec2 b = ring(vec2(x * uCells.y, t * 1.9 + fi * 1.7), uCells.y, seed + 1u);
      vec2 c = ring(vec2(x * uCells.z, t * 4.6 + fi * 0.9), uCells.z, seed + 2u);
      vec2 e = ring(vec2(x * uCells.w, t * 6.8), uCells.w, seed + 3u);
      float offset = (a.x * bendAmp + b.x * rippleAmp) * range + (c.x + e.x * 0.35) * crinkleAmp;
      float slope =
        ((a.y * uCells.x * bendAmp + b.y * uCells.y * rippleAmp) * range +
          (c.y * uCells.z + e.y * 0.35 * uCells.w) * crinkleAmp) *
        slopeScale;
      float drift = lead > 0.5 ? 0.0 : wobble(fi * 7.3, seed + 9u) * 2.5 * uSpread;
      offset += drift;
      float across = (d - offset) / sqrt(1.0 + slope * slope);
      float spread = d - a.x * bendAmp * range - drift;
      float swell = 0.5 + 0.5 * ring(vec2(x * uSoft.y, t * 2.0 + fi * 5.1), uSoft.y, seed + 8u).x;
      float w = uThickness * mix(0.55, 1.0, lead) * (0.5 + swell);
      float vis = mix(0.3 + 0.45 * smoothstep(-0.25, 0.2, ring(vec2(x * uSoft.x, t * 0.5 + fi * 3.7), uSoft.x, seed + 5u).x), 1.0, lead);
      float spark = 1.0 - uFlicker * 0.3 * (0.5 + 0.5 * wobble(t * 13.0 + fi * 2.3, seed + 6u));
      float weight = max(vis, heat * 0.6) * spark * fade * present * (0.7 + 0.6 * swell);
      vec2 g = glowShape(across, spread, w) * weight;
      g.y *= inward;
      float haze = uGlow * (1.0 + heat * 0.5) * (1.0 - uInk * 0.7);
      light += uCore * g.x + uGlowColor * g.y * haze;
      energy += g.x + g.y * haze;
      hot += exp(-across * across / (w * w * 0.16)) * lead * weight;
    }
    light *= shown;
    energy *= shown;
    hot *= shown;
  }

  float breath = 1.0 + uFlicker * 0.5 * wobble(t * 4.6 + 7.0, 3u);
  float gain = uIntensity * breath * (1.0 + heat * 0.25) * 1.4;
  light *= frameFade;
  energy *= frameFade;
  hot *= frameFade;
  float alpha = 1.0 - exp(-energy * gain);
  vec3 color = mix(1.0 - exp(-light * gain), alpha * light / max(energy, 1e-4), uInk);
  color = mix(color, vec3(alpha), clamp(hot, 0.0, 1.0) * uInk * 0.85);
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  alpha = clamp(alpha + grain, 0.0, 1.0);
  fragColor = vec4(clamp(color + grain, 0.0, alpha), alpha);
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

function pathOf(width: number, height: number, radius: number): BorderPath {
  const hx = Math.max(1, width / 2);
  const hy = Math.max(1, height / 2);
  const r = clamp(radius, 0, Math.min(hx, hy));
  const vr = Math.min(r + 48, Math.min(hx, hy));
  const ax = hx - vr;
  const ay = hy - vr;
  const quarter = ax + ay + HALF_PI * vr;
  return { hx, hy, r, vr, ax, ay, perimeter: quarter * 4 };
}

/** A living electric current around the parent's border. Decorative; render it through WebGLGate. */
export function ElectricBorder({
  color = '--human',
  speed = 1,
  chaos = 0.5,
  spread = 0.6,
  thickness = 1.5,
  strands = 3,
  glow = 0.6,
  intensity = 0.8,
  flicker = 0.5,
  borderRadius = 14,
  active = true,
  intro = true,
  paused = false,
  maxDpr = 1.5,
  className,
}: ElectricBorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const [generation, setGeneration] = useState(0);

  const settings: Settings = {
    color,
    speed: Math.max(0, speed),
    chaos: clamp(chaos, 0, 2),
    spread: clamp(spread, 0, 2),
    thickness: Math.max(0.25, thickness),
    strands: clamp(Math.round(strands), 1, 6),
    glow: clamp(glow, 0, 3),
    intensity: Math.max(0, intensity),
    flicker: clamp(flicker, 0, 1),
    borderRadius: Math.max(0, borderRadius),
    active,
    intro,
    paused,
    maxDpr: clamp(maxDpr, 0.5, 2),
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
    const program = gl ? link(gl) : null;
    if (!gl || !program) return undefined;

    const vao = gl.createVertexArray();
    const size = { width: 1, height: 1, ratio: 1 };
    const palette = { core: [1, 1, 1], glow: [1, 1, 1], light: false };
    const first = settingsRef.current;
    let power = first.active && !(first.intro && generation === 0) ? 1 : 0;
    let reveal = power;
    let wasActive = first.active;
    let ink = 0;
    let path = pathOf(1, 1, 0);
    let time = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let pageVisible = document.visibilityState !== 'hidden';
    let lost = false;

    const readPalette = () => {
      const base = readCssColor(container, settingsRef.current.color) ?? [0.49, 0.98, 1];
      palette.light = isLightScheme(container);
      palette.glow = base;
      palette.core = palette.light ? base : base.map(channel => channel + (1 - channel) * 0.55);
    };

    const resize = () => {
      const s = settingsRef.current;
      const width = Math.max(1, container.offsetWidth);
      const height = Math.max(1, container.offsetHeight);
      const canvasWidth = width + MARGIN * 2;
      const canvasHeight = height + MARGIN * 2;
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        s.maxDpr,
        Math.sqrt(PIXEL_BUDGET / (canvasWidth * canvasHeight)),
      );
      const pixelWidth = Math.max(1, Math.round(canvasWidth * ratio));
      const pixelHeight = Math.max(1, Math.round(canvasHeight * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      size.width = width;
      size.height = height;
      size.ratio = pixelWidth / canvasWidth;
      path = pathOf(width, height, s.borderRadius);
    };

    const render = (s: Settings) => {
      const u = program.uniforms;
      const width = size.width + MARGIN * 2;
      const height = size.height + MARGIN * 2;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (power <= 0.001) return;
      gl.useProgram(program.program);
      gl.uniform2f(u.uSize ?? null, width, height);
      gl.uniform1f(u.uRatio ?? null, size.ratio);
      gl.uniform2f(u.uCenter ?? null, width / 2, height / 2);
      gl.uniform2f(u.uHalf ?? null, path.hx, path.hy);
      gl.uniform1f(u.uRadius ?? null, path.r);
      gl.uniform3f(u.uParam ?? null, path.ax, path.ay, path.vr);
      gl.uniform1f(u.uPerimeter ?? null, path.perimeter);
      gl.uniform4f(
        u.uCells ?? null,
        Math.max(1, Math.round(path.perimeter / 75)),
        Math.max(2, Math.round(path.perimeter / 25)),
        Math.max(3, Math.round(path.perimeter / 9)),
        Math.max(4, Math.round(path.perimeter / 4)),
      );
      gl.uniform2f(
        u.uSoft ?? null,
        Math.max(1, Math.round(path.perimeter / 150)),
        Math.max(1, Math.round(path.perimeter / 50)),
      );
      gl.uniform1f(u.uTime ?? null, time);
      gl.uniform1f(u.uPower ?? null, power * power * (3 - 2 * power));
      gl.uniform1f(u.uReveal ?? null, reveal);
      gl.uniform3fv(u.uCore ?? null, palette.core);
      gl.uniform3fv(u.uGlowColor ?? null, palette.glow);
      gl.uniform1f(u.uIntensity ?? null, s.intensity);
      gl.uniform1f(u.uGlow ?? null, s.glow);
      gl.uniform1f(u.uThickness ?? null, s.thickness);
      gl.uniform1f(u.uStrands ?? null, s.strands);
      gl.uniform1f(u.uChaos ?? null, s.chaos);
      gl.uniform1f(u.uSpread ?? null, s.spread);
      gl.uniform1f(u.uFlicker ?? null, s.flicker);
      gl.uniform1f(u.uInk ?? null, ink);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      raf = 0;
      if (lost) return;
      const s = settingsRef.current;
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      time += dt * s.speed;

      if (s.active && !wasActive) reveal = 0;
      wasActive = s.active;
      power += ((s.active ? 1 : 0) - power) * (1 - Math.exp(-dt / (s.active ? 0.28 : 0.4)));
      if (s.active) reveal = Math.min(1, reveal + dt / 0.9);
      ink += ((palette.light ? 1 : 0) - ink) * (1 - Math.exp(-dt / 0.25));

      render(s);

      const busy = power > 0.002 || s.active;
      if (busy && visible && pageVisible && !s.paused) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || lost || !visible || !pageVisible || settingsRef.current.paused) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wakeRef.current = () => {
      resize();
      wake();
    };

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
    });

    readPalette();
    ink = palette.light ? 1 : 0;
    resize();
    wake();

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      unsubscribeScheme();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (!gl.isContextLost()) {
        gl.deleteVertexArray(vao);
        gl.deleteProgram(program.program);
      }
    };
  }, [generation]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute block"
        style={{ top: -MARGIN, left: -MARGIN }}
      />
    </div>
  );
}
