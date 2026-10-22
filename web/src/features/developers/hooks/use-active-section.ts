import { useEffect, useState } from 'react';

/** How far below the top of the window a section counts as "current" (clears the header, the page's scroll padding and the section's scroll margin). */
const OFFSET = 200;

/**
 * The id of the section being read: the last one whose top has passed `OFFSET`, or the last
 * section once the page is scrolled to the bottom (short final sections never reach the top).
 * `null` on the server and before the first scroll measurement.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    const list = key.split('|').filter(Boolean);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      let current = list[0] ?? null;
      for (const id of list) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= OFFSET) current = id;
      }
      if (atBottom && window.scrollY > 0) current = list[list.length - 1] ?? current;
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, [key]);

  return active;
}
