/**
 * Colour helpers for canvas and WebGL effects, which cannot use CSS variables directly: read a
 * token such as `--mind-a` from the page, as RGB channels from 0 to 1, and follow theme changes.
 */

export type Rgb = [number, number, number];

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;

let probe: CanvasRenderingContext2D | null | undefined;

/** Lets the browser resolve any other CSS colour (color-mix(), oklch()...) by painting one pixel. */
function paintedColor(value: string): Rgb | null {
  if (typeof document === 'undefined') return null;
  if (probe === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    probe = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000000';
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/** Parses a CSS colour into RGB channels from 0 to 1, or null when it is not a colour. */
export function parseCssColor(input: string): Rgb | null {
  const value = input.trim();
  if (!value) return null;
  const hex = HEX.exec(value)?.[1];
  if (hex) {
    const full =
      hex.length <= 4 ? Array.from(hex.slice(0, 3), digit => digit + digit).join('') : hex;
    return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255) as Rgb;
  }
  const rgb = RGB.exec(value);
  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]].map(channel =>
      Math.min(1, Math.max(0, Number(channel) / 255)),
    ) as Rgb;
  }
  return paintedColor(value);
}

/** Reads a colour custom property (`--mind-a`) as it applies to `element`. */
export function readCssColor(element: Element, property: `--${string}`): Rgb | null {
  return parseCssColor(getComputedStyle(element).getPropertyValue(property));
}

/** True when the element renders in the light theme (tokens.css sets `color-scheme`). */
export function isLightScheme(element: Element): boolean {
  return getComputedStyle(element).colorScheme === 'light';
}

/**
 * Calls `onChange` when the theme may have changed: an explicit choice (`data-theme` on <html>)
 * or the system setting. Returns the unsubscribe function.
 */
export function subscribeColorScheme(onChange: () => void): () => void {
  const root = document.documentElement;
  const observer =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => onChange());
  observer?.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  const media =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: light)')
      : null;
  media?.addEventListener('change', onChange);
  return () => {
    observer?.disconnect();
    media?.removeEventListener('change', onChange);
  };
}
