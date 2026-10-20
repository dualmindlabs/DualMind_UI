/**
 * Silk, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/Silk-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - Colours come from design tokens (`color` and `sheenColor` take `--token` names) and follow
 *   theme changes; light mode switches with the theme.
 * - `maxDpr` replaces `dpr` (a cap, default 1.5) for components/motion/webgl-gate.tsx, which also
 *   handles reduced motion, so the component no longer reads the media query itself.
 * - Removed click ripples, `variation`, `rotation` and `fade`; named export; no 'use client';
 *   latest props kept in a ref from an effect (React Compiler rules).
 */
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils/cn';
import { isLightScheme, readCssColor, subscribeColorScheme } from '@/lib/utils/css-color';

export interface SilkProps {
  speed?: number;
  scale?: number;
  /** Base colour token, such as `--bg-deep`. */
  color?: `--${string}`;
  /** Highlight colour token, such as `--mind-a`. */
  sheenColor?: `--${string}`;
  noiseIntensity?: number;
  sheen?: number;
  depth?: number;
  glow?: number;
  ripple?: number;
  wave?: number;
  mouseInteraction?: boolean;
  intro?: boolean;
  paused?: boolean;
  maxDpr?: number;
  className?: string;
}

interface Settings {
  speed: number;
  scale: number;
  color: `--${string}`;
  sheenColor: `--${string}`;
  noiseIntensity: number;
  sheen: number;
  depth: number;
  glow: number;
  ripple: number;
  wave: number;
  mouseInteraction: boolean;
  intro: boolean;
  paused: boolean;
  maxDpr: number;
}

type Uniforms = Record<string, WebGLUniformLocation | null>;

interface Program {
  program: WebGLProgram;
  uniforms: Uniforms;
}

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SILK = `
uniform vec2 uView;
uniform float uScale;
uniform float uTime;
uniform float uWave;
uniform float uRipple;
uniform float uFold;
uniform vec4 uPointer;
uniform vec2 uDrag;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 bend(vec2 uv) {
  vec2 aspect = vec2(uView.x / uView.y, 1.0);
  vec2 offset = (uv - uPointer.xy) * aspect;
  float touch = uPointer.z * exp(-dot(offset, offset) / (uPointer.w * uPointer.w));
  return uv - uDrag * touch;
}

float silk(vec2 vUv) {
  vec2 tex = vUv * uScale * uScale;
  float tOffset = uTime;
  tex.y += 0.03 * uWave * sin(8.0 * tex.x - tOffset);
  return 0.6 + 0.4 * uFold * sin(5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * tOffset) + uRipple * sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));
}
`;

const FIELD = `#version 300 es
precision highp float;
${SILK}
out vec4 outColor;

void main() {
  vec2 vUv = gl_FragCoord.xy / uView;
  float pattern = silk(bend(vUv));
  float n = clamp((pattern - 0.2) / 0.8, 0.0, 1.0);
  outColor = vec4(pow(n, 6.0), 0.0, 0.0, 1.0);
}`;

const COMPOSITE = `#version 300 es
precision highp float;
${SILK}
uniform sampler2D uBloom;
uniform vec3 uColor;
uniform vec3 uSheenColor;
uniform float uNoiseIntensity;
uniform float uDepth;
uniform float uSheen;
uniform float uGlow;
uniform float uLightMode;
uniform vec3 uLight;
uniform vec2 uStep;
uniform float uPresence;
out vec4 outColor;

vec3 softClip(vec3 c) {
  vec3 over = max(c - 0.75, 0.0);
  return min(c, 0.75) + 0.25 * (1.0 - exp(-over * 4.0));
}

void main() {
  vec2 vUv = gl_FragCoord.xy / uView;
  vec2 coord = bend(vUv);
  float pattern = silk(coord);
  float rnd = noise(gl_FragCoord.xy);
  float n = clamp((pattern - 0.2) / 0.8, 0.0, 1.0);

  float gx = silk(coord + vec2(uStep.x, 0.0)) - pattern;
  float gy = silk(coord + vec2(0.0, uStep.y)) - pattern;
  vec3 normal = normalize(vec3(-gx * 26.0, -gy * 26.0, 1.0));
  vec3 toLight = normalize(vec3(uLight.xy, 0.85));
  float relief = 1.0 + (dot(normal, toLight) - toLight.z) * 1.8 * uDepth;
  vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));
  float gloss = pow(max(dot(normal, halfway), 0.0), 48.0) * smoothstep(0.25, 0.85, n);
  float crest = pow(n, 5.0);
  float shine = (gloss * 0.85 + crest * 0.4) * uSheen * (1.0 + uLight.z * 0.6);

  float bloom = 0.0;
  if (uGlow > 0.0) {
    bloom += textureLod(uBloom, vUv, 1.0).r * 0.35;
    bloom += textureLod(uBloom, vUv, 2.0).r * 0.3;
    bloom += textureLod(uBloom, vUv, 3.0).r * 0.2;
    bloom += textureLod(uBloom, vUv, 4.0).r * 0.15;
  }

  vec3 result;
  if (uLightMode > 0.5) {
    float fold = smoothstep(0.28, 0.9, pattern);
    float specular = smoothstep(0.72, 0.98, pattern);
    vec3 shadowColor = uColor * (0.72 - 0.12 * uDepth);
    vec3 bodyColor = min(uColor * 1.18, vec3(1.0));
    vec3 lightBase = mix(shadowColor, bodyColor, fold) * mix(1.0, relief, 0.6);
    vec3 tint = mix(uColor, uSheenColor, 0.8);
    lightBase = mix(lightBase, tint, clamp(specular * 0.6 + shine * 0.3 + bloom * uGlow * 0.2, 0.0, 1.0));
    float fineNoise = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
    float grainSignal = (rnd + fineNoise - 1.0);
    float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
    result = clamp(lightBase + grainSignal * grainStrength, 0.0, 1.0);
  } else {
    float grain = rnd / 15.0 * uNoiseIntensity;
    float floorValue = mix(0.2, 0.03, uDepth);
    float curve = uDepth > 0.0 ? pow(n, 1.0 + 1.4 * uDepth) : n;
    float shade = uDepth > 0.0 ? floorValue + (1.0 - floorValue) * curve : pattern;
    vec3 tone = mix(uColor, pow(uColor, vec3(1.45)), (1.0 - n) * uDepth);
    vec3 lit = tone * shade * relief - vec3(grain);
    vec3 tint = mix(uColor, uSheenColor, 0.8);
    vec3 extra = tint * (shine + bloom * uGlow * 0.55);
    float blend = clamp((uSheen + uGlow) * 4.0, 0.0, 1.0);
    result = mix(clamp(lit, 0.0, 1.0), clamp(softClip(lit + extra), 0.0, 1.0), blend);
  }

  float alpha = uPresence;
  outColor = vec4(result * alpha, alpha);
}`;

const INTRO_SECONDS = 2.2;
const INTRO_RUSH = 1.6;
const DEFAULT_LIGHT: [number, number] = [-0.55, 0.7];
const LIGHT_TILT = Math.hypot(DEFAULT_LIGHT[0], DEFAULT_LIGHT[1]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function link(gl: WebGL2RenderingContext, fragmentSource: string): Program | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

/** Flowing silk with a soft sheen. Decorative; render it through WebGLGate. */
export function Silk({
  speed = 5,
  scale = 1,
  color = '--bg-deep',
  sheenColor = '--mind-a',
  noiseIntensity = 1.5,
  sheen = 0.5,
  depth = 0.5,
  glow = 0.3,
  ripple = 1,
  wave = 1,
  mouseInteraction = true,
  intro = true,
  paused = false,
  maxDpr = 1.5,
  className,
}: SilkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const settings: Settings = {
    speed,
    scale,
    color,
    sheenColor,
    noiseIntensity: Math.max(0, noiseIntensity),
    sheen: Math.max(0, sheen),
    depth: clamp(depth, 0, 1),
    glow: Math.max(0, glow),
    ripple: Math.max(0, ripple),
    wave: Math.max(0, wave),
    mouseInteraction,
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
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!container || !canvas || !gl) return undefined;

    const fieldProgram = link(gl, FIELD);
    const compositeProgram = link(gl, COMPOSITE);
    if (!fieldProgram || !compositeProgram) return undefined;

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    const target = { width: 0, height: 0 };
    const sizeTarget = (width: number, height: number) => {
      if (target.width === width && target.height === height) return;
      target.width = width;
      target.height = height;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    };

    const palette = {
      light: false,
      base: [0.04, 0.04, 0.05] as [number, number, number],
      sheen: [1, 1, 1] as [number, number, number],
    };
    const readPalette = () => {
      const s = settingsRef.current;
      palette.light = isLightScheme(container);
      palette.base = readCssColor(container, s.color) ?? palette.base;
      palette.sheen = readCssColor(container, s.sheenColor) ?? palette.sheen;
    };

    const view = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0, y: 0, inside: false };
    const state = {
      flow: 0,
      intro: settingsRef.current.intro ? 0 : 1,
      touch: 0,
      x: 0,
      y: 0,
      dragX: 0,
      dragY: 0,
      lightX: DEFAULT_LIGHT[0],
      lightY: DEFAULT_LIGHT[1],
    };
    let raf = 0;
    let last = 0;
    let visible = true;

    const setShared = (uniforms: Uniforms, width: number, height: number, s: Settings, unfold: number) => {
      gl.uniform2f(uniforms.uView ?? null, width, height);
      gl.uniform1f(uniforms.uScale ?? null, s.scale);
      gl.uniform1f(uniforms.uTime ?? null, state.flow - INTRO_RUSH * (1 - unfold));
      gl.uniform1f(uniforms.uWave ?? null, s.wave);
      gl.uniform1f(uniforms.uRipple ?? null, s.ripple);
      gl.uniform1f(uniforms.uFold ?? null, 0.25 + 0.75 * unfold);
      gl.uniform4f(
        uniforms.uPointer ?? null,
        state.x / view.width,
        1 - state.y / view.height,
        state.touch,
        0.32,
      );
      gl.uniform2f(uniforms.uDrag ?? null, state.dragX, state.dragY);
    };

    const render = () => {
      const s = settingsRef.current;
      const unfold = ease(state.intro);
      const presence = 1 - Math.pow(1 - state.intro, 3);
      gl.bindVertexArray(vao);

      if (s.glow > 0) {
        sizeTarget(
          Math.max(1, Math.round(canvas.width / 4)),
          Math.max(1, Math.round(canvas.height / 4)),
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, target.width, target.height);
        gl.useProgram(fieldProgram.program);
        setShared(fieldProgram.uniforms, target.width, target.height, s, unfold);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.generateMipmap(gl.TEXTURE_2D);
      }

      const c = compositeProgram.uniforms;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compositeProgram.program);
      setShared(c, canvas.width, canvas.height, s, unfold);
      gl.uniform3fv(c.uColor ?? null, palette.base);
      gl.uniform3fv(c.uSheenColor ?? null, palette.sheen);
      gl.uniform1f(c.uNoiseIntensity ?? null, s.noiseIntensity);
      gl.uniform1f(c.uDepth ?? null, s.depth);
      gl.uniform1f(c.uSheen ?? null, s.sheen);
      gl.uniform1f(c.uGlow ?? null, s.glow);
      gl.uniform1f(c.uLightMode ?? null, palette.light ? 1 : 0);
      gl.uniform3f(c.uLight ?? null, state.lightX, state.lightY, state.touch);
      gl.uniform2f(c.uStep ?? null, view.ratio / canvas.width, view.ratio / canvas.height);
      gl.uniform1f(c.uPresence ?? null, presence);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(c.uBloom ?? null, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const s = settingsRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const flowing = !s.paused && s.speed !== 0;
      if (flowing) state.flow += dt * 0.1 * s.speed;
      if (!s.intro) state.intro = 1;
      else if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / INTRO_SECONDS);

      const engaged = s.mouseInteraction && pointer.inside;
      if (engaged && state.touch < 0.01) {
        state.x = pointer.x;
        state.y = pointer.y;
      }
      const follow = 1 - Math.exp(-dt * 10);
      const prevX = state.x;
      const prevY = state.y;
      state.x += (pointer.x - state.x) * follow;
      state.y += (pointer.y - state.y) * follow;
      const velX = (state.x - prevX) / Math.max(dt, 0.001) / view.height;
      const velY = (state.y - prevY) / Math.max(dt, 0.001) / view.height;
      const dragBlend = 1 - Math.exp(-dt * 4);
      state.dragX += (clamp(velX * 0.03, -0.06, 0.06) - state.dragX) * dragBlend;
      state.dragY += (clamp(-velY * 0.03, -0.06, 0.06) - state.dragY) * dragBlend;
      state.touch +=
        ((engaged ? 1 : 0) - state.touch) * (1 - Math.exp(-dt * (engaged ? 3.5 : 1.4)));

      let lightGoalX = DEFAULT_LIGHT[0];
      let lightGoalY = DEFAULT_LIGHT[1];
      if (engaged) {
        const aimX = (pointer.x / view.width - 0.5) * (view.width / view.height);
        const aimY = 0.5 - pointer.y / view.height;
        const reach = Math.hypot(aimX, aimY);
        if (reach > 0.04) {
          lightGoalX = (aimX / reach) * LIGHT_TILT;
          lightGoalY = (aimY / reach) * LIGHT_TILT;
        } else {
          lightGoalX = state.lightX;
          lightGoalY = state.lightY;
        }
      }
      const lightFollow = 1 - Math.exp(-dt * 3);
      state.lightX += (lightGoalX - state.lightX) * lightFollow;
      state.lightY += (lightGoalY - state.lightY) * lightFollow;

      render();

      const settling =
        state.intro < 1 ||
        Math.abs((engaged ? 1 : 0) - state.touch) > 0.002 ||
        Math.abs(state.dragX) + Math.abs(state.dragY) > 0.0002 ||
        Math.abs(pointer.x - state.x) + Math.abs(pointer.y - state.y) > 0.3 ||
        Math.abs(lightGoalX - state.lightX) + Math.abs(lightGoalY - state.lightY) > 0.001;
      if ((flowing || settling) && !s.paused) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf && visible && !document.hidden && !settingsRef.current.paused) {
        raf = requestAnimationFrame(frame);
      }
    };

    const resize = () => {
      const s = settingsRef.current;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, s.maxDpr);
      view.width = width;
      view.height = height;
      view.ratio = ratio;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      if (!raf) render();
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = container.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.inside =
        pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      wake();
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };

    const onVisibility = () => {
      last = 0;
      wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    const unsubscribeScheme = subscribeColorScheme(() => {
      readPalette();
      if (!raf) render();
    });
    readPalette();
    resize();

    let lastDpr = settingsRef.current.maxDpr;
    wakeRef.current = () => {
      const s = settingsRef.current;
      if (s.maxDpr !== lastDpr) {
        lastDpr = s.maxDpr;
        resize();
        return;
      }
      if (!raf) render();
      wake();
    };

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      unsubscribeScheme();
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteProgram(fieldProgram.program);
      gl.deleteProgram(compositeProgram.program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('relative h-full w-full overflow-hidden', className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
