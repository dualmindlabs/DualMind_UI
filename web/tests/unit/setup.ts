import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no canvas: effects that draw on one skip it, as in a browser without canvas support
// (and jsdom stops logging "not implemented" for every attempt). Tests can still spy on it.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: () => null,
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
