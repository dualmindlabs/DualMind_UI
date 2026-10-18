import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

/** Used by scripts/prerender.mjs at build time only. */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
