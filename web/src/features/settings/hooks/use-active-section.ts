import { useEffect, useState } from 'react';

/**
 * The section the reader is in, for the section nav: the last section whose top has passed a
 * line just under the sticky header (the last one at the very bottom of the page). A passive
 * scroll listener, read once per frame; it starts on the first section. The setter lets a clicked link mark its section at once (a
 * short page may have nothing to scroll, so no scroll event would ever move the mark).
 */
export function useActiveSection(
  ids: readonly string[],
  offset = 120,
): readonly [string | undefined, (id: string) => void] {
  const [active, setActive] = useState<string | undefined>(ids[0]);

  useEffect(() => {
    const elements = ids
      .map(id => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return undefined;

    let frame = 0;
    const pick = () => {
      frame = 0;
      let current = elements[0]?.id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top - offset <= 0) current = element.id;
      }
      const scroller = document.scrollingElement;
      if (scroller && scroller.scrollTop + window.innerHeight >= scroller.scrollHeight - 2) {
        current = elements[elements.length - 1]?.id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(pick);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [ids, offset]);

  return [active, setActive];
}
