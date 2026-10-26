/**
 * Small helpers for the arena shell's one-shot motion (the composer travelling to the dock, the
 * matchmaking beat). They use the Web Animations API, move only transform and opacity, and do
 * nothing where the API is missing (tests) or motion is reduced: callers pass `reduce`.
 */

export const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** True where elements can animate (every browser we support; false under jsdom). */
export function canAnimate(): boolean {
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}

/** Plays keyframes on an element if it can; returns the animation so the caller can cancel it. */
export function playOn(
  element: Element | null,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (!element || !canAnimate()) return null;
  return element.animate(keyframes, options);
}
