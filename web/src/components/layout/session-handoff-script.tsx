import { SESSION_HANDOFF_SCRIPT } from '@/lib/session/handoff';

/**
 * Sends signed-in visitors and Supabase auth returns from the landing page to the legacy arena
 * before the first paint (see lib/session/handoff.ts). Rendered in <head> by the root layout for
 * routes whose `handle` asks for it.
 */
export function SessionHandoffScript() {
  return <script dangerouslySetInnerHTML={{ __html: SESSION_HANDOFF_SCRIPT }} />;
}
