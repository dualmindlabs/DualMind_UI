/** Sets what `navigator.onLine` reports in jsdom; returns a function that restores it. */
export function setNavigatorOnline(value: boolean): () => void {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
  return () => {
    delete (window.navigator as unknown as { onLine?: boolean }).onLine;
  };
}
