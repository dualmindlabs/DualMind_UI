import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge needs to know the custom type scale from styles/tokens.css, or it would treat
 * `text-ui` (a font size) and `text-fg` (a colour) as the same group and drop one of them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'h1', 'h2', 'h3', 'body', 'ui', 'ui-sm', 'caption', 'label'],
    },
  },
});

/** Joins class names (clsx syntax) and resolves Tailwind conflicts, last one wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
