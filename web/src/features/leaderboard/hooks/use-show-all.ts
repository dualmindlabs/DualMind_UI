import { useCallback, useState } from 'react';

/** `?show=all` in the address: the board opens with every model, and the link can be shared. */
export const SHOW_ALL_PARAM = 'show';
export const SHOW_ALL_VALUE = 'all';

export function readShowAll(search: string): boolean {
  return new URLSearchParams(search).get(SHOW_ALL_PARAM) === SHOW_ALL_VALUE;
}

/**
 * The switch that widens a board from its default models to all of them. Its state lives in the
 * address (`?show=all`, replaced in place, no new history entry), so a link to the wider board
 * works and a reload keeps the choice. The board's rows load in the browser, so the first render
 * (the prerendered HTML) never depends on it.
 */
export function useShowAll(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() =>
    typeof window === 'undefined' ? false : readShowAll(window.location.search),
  );
  const set = useCallback((next: boolean) => {
    setOn(next);
    try {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(SHOW_ALL_PARAM, SHOW_ALL_VALUE);
      else url.searchParams.delete(SHOW_ALL_PARAM);
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      );
    } catch {
      // No history to write to: the choice still holds for this visit.
    }
  }, []);
  return [on, set];
}
