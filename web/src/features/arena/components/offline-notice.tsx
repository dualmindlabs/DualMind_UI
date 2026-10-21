import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { OFFLINE_BLOCKED_EVENT } from '@/lib/network/online-status';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';

/** How long "Back online" stays, and how long it takes to fade, in milliseconds. */
const BACK_ONLINE_MS = 2600;
const FADE_MS = 400;

type Phase = 'online' | 'offline' | 'back' | 'fading';

/**
 * The arena's connection notice, a slim polite status line under the header. Offline it says so
 * honestly: new battles wait (a send keeps the draft instead of firing a doomed request), and
 * votes are saved on this device and sent when the network is back (the vote queue listens for
 * `online`); the count of waiting votes is in it. Back online it says "Back online" and fades.
 * It also explains a blocked link ("That page needs a connection"), see useOfflineLinkGuard.
 */
export function OfflineNotice() {
  const online = useOnlineStatus();
  const {
    battle: { pendingVotes },
  } = useArena();
  const [seenOnline, setSeenOnline] = useState(online);
  const [recovery, setRecovery] = useState<'idle' | 'back' | 'fading'>('idle');
  const [blocked, setBlocked] = useState(false);

  // The connection changed since the last render: start or end the "Back online" moment.
  if (seenOnline !== online) {
    setSeenOnline(online);
    setRecovery(online ? 'back' : 'idle');
    if (online) setBlocked(false);
  }

  useEffect(() => {
    if (recovery === 'idle') return;
    const timer = window.setTimeout(
      () => setRecovery(recovery === 'back' ? 'fading' : 'idle'),
      recovery === 'back' ? BACK_ONLINE_MS : FADE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [recovery]);

  useEffect(() => {
    const onBlocked = (event: Event) => {
      event.preventDefault();
      setBlocked(true);
    };
    window.addEventListener(OFFLINE_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(OFFLINE_BLOCKED_EVENT, onBlocked);
  }, []);

  const phase: Phase = !online ? 'offline' : recovery === 'idle' ? 'online' : recovery;
  const visible = phase !== 'online';
  return (
    <div role="status" aria-live="polite" data-testid="offline-notice" data-phase={phase}>
      {visible ? (
        <p
          className={cn(
            'flex items-center gap-2 border-b border-line px-4 py-1.5 text-ui-sm text-fg-soft sm:px-6',
            phase === 'offline' ? 'bg-surface-2' : 'bg-surface',
            'transition-opacity duration-(--dur-base) motion-reduce:transition-none',
            phase === 'fading' && 'opacity-0',
          )}
        >
          {phase === 'offline' ? (
            <>
              <WifiOff aria-hidden="true" className="size-4 shrink-0 text-human" strokeWidth={1.75} />
              <span>
                You are offline. New battles wait until you are back; votes are saved on this device
                {pendingVotes > 0 ? ` (${pendingVotes} waiting)` : ''}.
                {blocked ? ' That page needs a connection.' : ''}
              </span>
            </>
          ) : (
            <span>Back online.</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
