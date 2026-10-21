import { SharePage, shareDocumentTitle } from '@/features/share';

import type { Route } from './+types/share';

/**
 * Only the title: the Worker writes the description, canonical URL, robots, Open Graph and Twitter
 * tags into the page for each share link (server/share.js), because link previews never run
 * JavaScript; tags from here would only duplicate them.
 */
export const meta: Route.MetaFunction = () => [{ title: shareDocumentTitle(undefined) }];

/**
 * `/share/<id>`, and the old `/share/?id=<id>` forms: a shared battle or chat, client-only (the
 * Worker answers with the SPA fallback page, status 200, never cached).
 */
export default function ShareRoute() {
  return <SharePage />;
}
