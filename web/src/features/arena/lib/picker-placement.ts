/**
 * Where the model picker's list may go. The list opens under the hero composer (above the docked
 * one) and flips when there is no room; on top of that it must never cover the empty arena's
 * heading (UI audit P1-11). The heading becomes the top of the list's collision area: the list
 * flips and shrinks inside what is left, and never reaches above it. When that would leave no
 * usable list on either side (a phone held sideways), covering the heading beats a list too
 * short to use, and the plain viewport edge applies again.
 */

/** Space kept between the list and the viewport edge, or the heading. */
export const PICKER_EDGE = 8;

/** Below this many pixels on both sides of the trigger, the heading rule gives way. */
export const PICKER_MIN_SPACE = 200;

export interface PickerPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_PICKER_PADDING: PickerPadding = {
  top: PICKER_EDGE,
  right: PICKER_EDGE,
  bottom: PICKER_EDGE,
  left: PICKER_EDGE,
};

type Box = Pick<DOMRectReadOnly, 'top' | 'bottom'>;

/**
 * The collision padding for the list: the viewport edge, with the top moved down to just under
 * `avoid` (the heading) when there is room for a usable list above or below the trigger.
 */
export function pickerPadding(
  avoid: Box | null,
  trigger: Box | null,
  viewportHeight: number,
): PickerPadding {
  if (!avoid || !trigger) return DEFAULT_PICKER_PADDING;
  const top = Math.max(PICKER_EDGE, Math.ceil(avoid.bottom) + PICKER_EDGE);
  // The heading is below the trigger (or level with it): nothing to keep clear above.
  if (top >= trigger.top) return DEFAULT_PICKER_PADDING;
  const roomAbove = trigger.top - top;
  const roomBelow = viewportHeight - trigger.bottom - PICKER_EDGE;
  if (roomAbove < PICKER_MIN_SPACE && roomBelow < PICKER_MIN_SPACE) return DEFAULT_PICKER_PADDING;
  return { ...DEFAULT_PICKER_PADDING, top };
}
