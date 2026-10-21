// The not_enabled guard (BE-0 design, section 6.6): code can merge before its Cloudflare resource
// exists. A route that needs a binding or secret answers 501 until the deployment has it.

import { createMiddleware } from 'hono/factory';
import { pickBinding, type LogicalBinding } from './bindings.ts';
import type { AppEnv } from './context.ts';
import { log } from './log.ts';
import { ProblemError } from './problems.ts';

export type GuardOptions = {
  feature: string;
  /** Logical bindings (DB, CACHE, ...): checked under the name this host uses (production or *_PREVIEW). */
  bindings?: LogicalBinding[];
  /** Worker secrets or vars that must be set, by name. */
  secrets?: string[];
};

export function guard(options: GuardOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const hostname = new URL(c.req.url).hostname;
    const missingBinding = (options.bindings ?? []).some(logical => pickBinding(c.env, hostname, logical) === undefined);
    const missingSecret = (options.secrets ?? []).some(name => !c.env[name]);
    if (missingBinding || missingSecret) {
      log({ event: 'not_enabled', requestId: c.get('requestId'), feature: options.feature });
      throw new ProblemError('not_enabled', { feature: options.feature, detail: `The ${options.feature} is not enabled on this deployment.` });
    }
    await next();
  });
}
