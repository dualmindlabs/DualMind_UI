/**
 * Button feel for the arena's own controls, the ones that are not the kit's <Button> (the vote
 * buttons, the mode switch, the starter categories): the same press as the kit, on the motion
 * tokens. Colours ease on `--dur-fast`; the press itself lands on `--dur-instant` and springs back
 * on `--dur-fast`; the scale only runs when motion is allowed (`motion-safe`), and the global
 * reduced-motion rule (styles/base.css) makes every transition instant. Focus is the global ring.
 * Pair it with a hover colour and a 44px height under `pointer-coarse`.
 */
export const PRESSABLE =
  'transition-[background-color,border-color,color,box-shadow,opacity,scale] duration-(--dur-fast) ease-out-expo active:duration-(--dur-instant) motion-safe:active:scale-[0.97]';

/**
 * The "it worked" beat on a success icon (copied): a quick pop in. Give the icon a `key` that
 * changes with the state, so it remounts and plays once. Nothing moves under reduced motion.
 */
export const SUCCESS_POP = 'motion-safe:animate-pop';
