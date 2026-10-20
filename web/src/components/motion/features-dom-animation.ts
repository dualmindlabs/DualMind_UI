import { domAnimation } from 'motion/react';

/**
 * Motion's animation features (animate, exit, variants, gestures; about 15 kB gzipped), in their
 * own module so MotionProvider can load them after the first paint. Layout animations need
 * features-dom-max.ts instead.
 */
export const features = domAnimation;
