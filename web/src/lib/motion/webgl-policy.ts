/**
 * When a WebGL effect may run (docs/redesign/design-direction.md, section 6, rule 3). The
 * effect is replaced by its static poster when any of these is true, checked in this order:
 *
 * 1. the visitor asks for reduced motion;
 * 2. Save-Data is on (`navigator.connection.saveData` or `prefers-reduced-data`);
 * 3. the device reports less than 4 GB of memory (`navigator.deviceMemory`);
 * 4. a touch-first small screen (`pointer: coarse` up to 820 px wide): phones and small tablets;
 * 5. WebGL2 is missing.
 *
 * Framework-free: components/motion/webgl-gate.tsx reads the browser through these functions.
 */

export type WebGLBlockReason =
  | 'reduced-motion'
  | 'save-data'
  | 'low-memory'
  | 'small-touch-screen'
  | 'no-webgl2';

export interface WebGLEnvironment {
  reducedMotion: boolean;
  saveData: boolean;
  /** GB, rounded by the browser (0.25 to 8); undefined where the API does not exist. */
  deviceMemory: number | undefined;
  smallTouchScreen: boolean;
  webgl2: boolean;
}

/** Below this much memory (GB) the poster is shown. */
export const MIN_DEVICE_MEMORY = 4;

export const SMALL_TOUCH_SCREEN_QUERY = '(pointer: coarse) and (max-width: 820px)';
export const REDUCED_DATA_QUERY = '(prefers-reduced-data: reduce)';

/** The first reason that keeps the effect off, or null when it may run. */
export function webglBlockReason(env: WebGLEnvironment): WebGLBlockReason | null {
  if (env.reducedMotion) return 'reduced-motion';
  if (env.saveData) return 'save-data';
  if (env.deviceMemory !== undefined && env.deviceMemory < MIN_DEVICE_MEMORY) return 'low-memory';
  if (env.smallTouchScreen) return 'small-touch-screen';
  if (!env.webgl2) return 'no-webgl2';
  return null;
}

interface NetworkInformationLike {
  saveData?: boolean;
}

interface NavigatorHints {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
}

function matches(win: Window, query: string): boolean {
  return typeof win.matchMedia === 'function' && win.matchMedia(query).matches;
}

/** Creates a throwaway WebGL2 context, then releases it straight away. */
export function probeWebGL2(doc: Document): boolean {
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

let webgl2Support: boolean | undefined;

/** probeWebGL2(), run once per page: creating contexts is expensive and browsers cap them. */
export function supportsWebGL2(doc: Document): boolean {
  webgl2Support ??= probeWebGL2(doc);
  return webgl2Support;
}

/** Forgets the cached WebGL2 probe. Only tests need this. */
export function resetWebGL2Support(): void {
  webgl2Support = undefined;
}

/**
 * Reads the environment from the browser. Reduced motion comes from the caller, because the app
 * can force it for a subtree (components/motion/reduced-motion-scope.tsx). WebGL2 is only probed
 * when nothing else blocks the effect already.
 */
export function readWebGLEnvironment(
  win: Window,
  { reducedMotion, probe = supportsWebGL2 }: { reducedMotion: boolean; probe?: (doc: Document) => boolean },
): WebGLEnvironment {
  const hints = win.navigator as Navigator & NavigatorHints;
  const env: WebGLEnvironment = {
    reducedMotion,
    saveData: hints.connection?.saveData === true || matches(win, REDUCED_DATA_QUERY),
    deviceMemory: typeof hints.deviceMemory === 'number' ? hints.deviceMemory : undefined,
    smallTouchScreen: matches(win, SMALL_TOUCH_SCREEN_QUERY),
    webgl2: true,
  };
  if (webglBlockReason(env) === null) env.webgl2 = probe(win.document);
  return env;
}
