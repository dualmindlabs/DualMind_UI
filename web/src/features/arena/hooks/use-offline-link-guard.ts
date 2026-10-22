import { useEffect } from 'react';

import { isOnline, OFFLINE_BLOCKED_EVENT } from '@/lib/network/online-status';

/**
 * Other pages are separate documents: a click on a link to one of them while offline would
 * replace the arena with the browser's offline page (and its drafts with nothing to look at).
 * While offline, such a click is cancelled and the arena's offline notice says why
 * (OFFLINE_BLOCKED_EVENT). Links inside the arena (same path, like `/?thread=`), new tabs,
 * downloads, anchors, mailto: and other sites are left alone.
 */
export function useOfflineLinkGuard(): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isOnline() || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      event.preventDefault();
      window.dispatchEvent(new CustomEvent(OFFLINE_BLOCKED_EVENT, { cancelable: true }));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
}
