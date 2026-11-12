/**
 * Theme preference: "system" (follow the OS), "dark" or "light", stored in localStorage under
 * `dm.theme`. An explicit choice is written to <html data-theme="...">; "system" removes the
 * attribute so tokens.css follows `prefers-color-scheme`.
 */

export const THEME_STORAGE_KEY = 'dm.theme';
export const THEME_PREFERENCES = ['system', 'dark', 'light'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Runs inline in <head> before the first paint, so a stored choice never flashes the other
 * theme. Kept tiny and dependency-free; it must stay in sync with applyThemePreference().
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function applyThemePreference(preference: ThemePreference, root = document.documentElement) {
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}

const listeners = new Set<() => void>();

/** Duration of the circular reveal: the --dur-slow token (tokens.css, tokens.ts). */
const REVEAL_MS = 440;
const REVEAL_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Where the last pointer press happened, so the reveal grows from the toggle that was clicked. */
let lastPress: { x: number; y: number; at: number } | undefined;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    event => {
      lastPress = { x: event.clientX, y: event.clientY, at: Date.now() };
    },
    { capture: true, passive: true },
  );
}

interface ViewTransitionLike {
  ready: Promise<unknown>;
}

function motionAllowed(): boolean {
  const setting = document.documentElement.dataset.motion;
  if (setting === 'reduce') return false;
  if (setting === 'allow') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The reveal's centre: a recent pointer press, else the focused control, else the top right. */
function revealOrigin(): { x: number; y: number } {
  if (lastPress && Date.now() - lastPress.at < 1500) return lastPress;
  const box = document.activeElement?.getBoundingClientRect();
  if (box && box.width > 0 && box.height > 0) {
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
  return { x: window.innerWidth - 48, y: 32 };
}

/**
 * Runs `commit` (which switches the theme) inside a View Transition when the browser has them and
 * motion is allowed: the new theme grows from the click as a circle. Elsewhere, and under reduced
 * motion, the theme changes at once. Only the clip of one captured image animates.
 */
export function runThemeTransition(commit: () => void) {
  const start = (
    document as unknown as { startViewTransition?: (update: () => void) => ViewTransitionLike }
  ).startViewTransition;
  if (typeof start !== 'function' || !motionAllowed()) {
    commit();
    return;
  }
  const { x, y } = revealOrigin();
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const transition = start.call(document, commit);
  transition.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: REVEAL_MS,
          easing: REVEAL_EASING,
          pseudoElement: '::view-transition-new(root)',
        },
      ),
    )
    .catch(() => {
      // The transition was skipped (another one started, or the page hid): the theme is already set.
    });
}

export function setThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies): the choice then lasts for this page only.
  }
  runThemeTransition(() => {
    applyThemePreference(preference);
    listeners.forEach(listener => listener());
  });
}

/** Subscribes to changes made on this page and in other tabs (the `storage` event). */
export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    applyThemePreference(readThemePreference());
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
