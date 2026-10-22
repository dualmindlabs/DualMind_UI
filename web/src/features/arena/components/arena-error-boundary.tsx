import { RefreshCw, WifiOff } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isChunkLoadError } from '@/lib/network/chunk-error';
import { cn } from '@/lib/utils/cn';

interface PanelProps {
  error: unknown;
  onReset: () => void;
  /** `screen`: the whole arena failed (it fills the screen); `stage`: only the thread area. */
  variant: 'screen' | 'stage';
}

/** The in-place panel a crash inside the arena shows instead of the full-page error screen. */
export function ArenaErrorPanel({ error, onReset, variant }: PanelProps) {
  const online = useOnlineStatus();
  const chunk = isChunkLoadError(error);
  const offline = !online || chunk;
  // A chunk that failed to load stays failed for this page load: only a reload gets it back.
  const retry = chunk ? () => window.location.reload() : onReset;
  return (
    <div
      role="alert"
      data-testid="arena-error"
      className={cn(
        'grid place-items-center px-4 py-10 text-center',
        variant === 'screen' ? 'min-h-svh bg-bg' : 'min-h-0 flex-1',
      )}
    >
      <div className="grid max-w-md justify-items-center gap-3">
        {offline ? (
          <WifiOff aria-hidden="true" className="size-6 text-human" strokeWidth={1.75} />
        ) : null}
        <h2 className="text-h3 font-medium">
          {offline && !online
            ? 'You are offline.'
            : chunk
              ? 'Part of the arena could not load.'
              : 'Something broke in the arena.'}
        </h2>
        <p className="text-fg-soft">
          {offline && !online
            ? 'Your drafts and votes are kept on this device. Try again when you are back online.'
            : chunk
              ? 'Check your connection, then try again. Your drafts are kept.'
              : 'Your drafts and queued votes are kept. Try again, or reload the page.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={retry}>
            <RefreshCw aria-hidden="true" strokeWidth={1.75} />
            Try again
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  variant?: 'screen' | 'stage';
  /** The panel clears itself when this changes (another thread is another screen). */
  resetKey?: string | null;
}

interface BoundaryState {
  error: unknown;
  failed: boolean;
}

/**
 * Catches what throws while the arena renders, so a crash shows a recoverable panel in place
 * (Try again re-mounts the part that failed; Reload) and never replaces the whole page with the
 * root error screen. The arena's own state (drafts, the vote queue) lives in storage, so it
 * survives the re-mount.
 */
export class ArenaErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null, failed: false };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error, failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('The arena crashed and was caught in place:', error, info.componentStack);
  }

  override componentDidUpdate(previous: BoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.reset();
  }

  reset = () => this.setState({ error: null, failed: false });

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ArenaErrorPanel
        error={this.state.error}
        onReset={this.reset}
        variant={this.props.variant ?? 'stage'}
      />
    );
  }
}
