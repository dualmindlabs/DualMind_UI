import { useSyncExternalStore } from 'react';

import {
  readMotionPreference,
  resolveReducedMotion,
  subscribeMotionPreference,
} from '@/lib/motion/motion-preference';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribeSystem(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSystemSnapshot(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY).matches
    : false;
}

function subscribe(onChange: () => void): () => void {
  const stopSystem = subscribeSystem(onChange);
  const stopPreference = subscribeMotionPreference(onChange);
  return () => {
    stopSystem();
    stopPreference();
  };
}

function getSnapshot(): boolean {
  return resolveReducedMotion(readMotionPreference(), getSystemSnapshot());
}

const getServerSnapshot = (): boolean => false;

/**
 * True while motion should be reduced: the visitor's OS asks for it, unless the motion setting on
 * /settings/ overrides it ("reduce" always, "allow" never; lib/motion/motion-preference.ts). It
 * follows both live, so components can swap movement for a cross-fade or nothing. Prerendered HTML
 * assumes motion is allowed; styles/base.css stops CSS animations either way.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The OS setting alone, without the override (the settings page shows what "System" means). */
export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribeSystem, getSystemSnapshot, getServerSnapshot);
}
