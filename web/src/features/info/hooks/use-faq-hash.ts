import { useEffect } from 'react';

/**
 * Deep links to questions. When the URL hash names one of `ids` (on load, or when it changes
 * later), opens that question, scrolls to it and moves focus to its button, so keyboard and
 * screen reader users land on it.
 */
export function useFaqHash(ids: readonly string[], open: (id: string) => void): void {
  const key = ids.join('|');
  useEffect(() => {
    const known = key.split('|');
    const apply = () => {
      let id = '';
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!id || !known.includes(id)) return;
      open(id);
      // Wait a frame so the panel is open before measuring and focusing.
      window.requestAnimationFrame(() => {
        const item = document.getElementById(id);
        if (!item) return;
        item.scrollIntoView({ block: 'start' });
        item.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
      });
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [key, open]);
}
