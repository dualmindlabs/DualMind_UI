// Production vs preview bindings (docs/backend/resources.md). Workers Builds previews share one
// config with production, so every resource has a production binding and a *_PREVIEW twin and
// the code picks by host: the production binding ONLY for arena.dualmindlab.tech, the preview
// one for every other host (preview aliases, workers.dev, localhost, tests, unknown hosts).
// A host is never matched by suffix or substring, so a look-alike cannot reach production data.

import type { Env } from './env.ts';

export const PRODUCTION_HOST = 'arena.dualmindlab.tech';

export const LOGICAL_BINDINGS = ['DB', 'CACHE', 'EVENTS', 'PUBLIC_BUCKET'] as const;
export type LogicalBinding = (typeof LOGICAL_BINDINGS)[number];

export type Environment = 'production' | 'preview';

export function isProductionHost(hostname: string): boolean {
  return hostname.toLowerCase() === PRODUCTION_HOST;
}

export function environmentFor(hostname: string): Environment {
  return isProductionHost(hostname) ? 'production' : 'preview';
}

/** The binding name the host must use for a logical binding. */
export function bindingNameFor(hostname: string, logical: LogicalBinding): string {
  return isProductionHost(hostname) ? logical : `${logical}_PREVIEW`;
}

/** The chosen binding object, or undefined when this deployment does not have it. */
export function pickBinding(env: Env, hostname: string, logical: LogicalBinding): unknown {
  return env[bindingNameFor(hostname, logical)] ?? undefined;
}

/** Which logical bindings are present for this host. Names only, never values. */
export function enabledBindings(env: Env, hostname: string): Record<LogicalBinding, boolean> {
  const result = {} as Record<LogicalBinding, boolean>;
  for (const logical of LOGICAL_BINDINGS) {
    result[logical] = pickBinding(env, hostname, logical) !== undefined;
  }
  return result;
}
