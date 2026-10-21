/**
 * The motion override from /settings/: "system" (follow the OS `prefers-reduced-motion`),
 * "reduce" (no movement, whatever the OS says) or "allow" (full motion even when the OS asks for
 * less), stored in localStorage under `dm.motion`. An explicit choice is written to
 * <html data-motion="reduce|allow"> before the first paint, so CSS can follow it (styles/base.css
 * and the `motion-safe` / `motion-reduce` variants in styles/app.css); JavaScript reads it through
 * useReducedMotion() and the Motion provider.
 */

export const MOTION_STORAGE_KEY = 'dm.motion';
export const MOTION_ATTRIBUTE = 'data-motion';
export const MOTION_PREFERENCES = ['system', 'reduce', 'allow'] as const;
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];

export function isMotionPreference(value: unknown): value is MotionPreference {
  return typeof value === 'string' && (MOTION_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Runs inline in <head> before the first paint, next to the theme script (one <script>, so the
 * CSP hash list does not grow). Kept tiny and dependency-free; it must stay in sync with
 * applyMotionPreference().
 */
export const MOTION_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(
  MOTION_STORAGE_KEY,
)});if(m==="reduce"||m==="allow"){document.documentElement.setAttribute(${JSON.stringify(
  MOTION_ATTRIBUTE,
)},m)}}catch(e){}})();`;

export function readMotionPreference(): MotionPreference {
  try {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    return isMotionPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function applyMotionPreference(
  preference: MotionPreference,
  root: HTMLElement = document.documentElement,
): void {
  if (preference === 'system') root.removeAttribute(MOTION_ATTRIBUTE);
  else root.setAttribute(MOTION_ATTRIBUTE, preference);
}

const listeners = new Set<() => void>();

export function setMotionPreference(preference: MotionPreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(MOTION_STORAGE_KEY);
    else window.localStorage.setItem(MOTION_STORAGE_KEY, preference);
  } catch {
    // Blocked storage: the choice lasts for this page only.
  }
  applyMotionPreference(preference);
  listeners.forEach(listener => listener());
}

/** Subscribes to changes made on this page and in other tabs (the `storage` event). */
export function subscribeMotionPreference(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === 'undefined') return () => listeners.delete(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== MOTION_STORAGE_KEY) return;
    applyMotionPreference(readMotionPreference());
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** True when motion should be reduced: the override wins, "system" asks the OS. */
export function resolveReducedMotion(preference: MotionPreference, systemReduce: boolean): boolean {
  if (preference === 'reduce') return true;
  if (preference === 'allow') return false;
  return systemReduce;
}

/** Motion's `MotionConfig reducedMotion` value for a preference. */
export function motionConfigValue(preference: MotionPreference): 'always' | 'never' | 'user' {
  if (preference === 'reduce') return 'always';
  if (preference === 'allow') return 'never';
  return 'user';
}
