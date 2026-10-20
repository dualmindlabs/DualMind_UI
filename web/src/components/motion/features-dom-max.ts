import { domMax } from 'motion/react';

/**
 * Motion's full feature set, adding layout animations and drag to domAnimation. Only components
 * that animate layout (shared `layoutId` highlights) load it, through their own LazyMotion.
 */
export const features = domMax;
