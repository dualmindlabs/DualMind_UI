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

export function setThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies): the choice then lasts for this page only.
  }
  applyThemePreference(preference);
  listeners.forEach(listener => listener());
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
