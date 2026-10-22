import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArenaErrorBoundary } from '@/features/arena/components/arena-error-boundary';

import { setNavigatorOnline } from '../../lib/network/navigator-online';

afterEach(() => vi.restoreAllMocks());

function Bomb({ message = 'boom' }: { message?: string }): never {
  throw new Error(message);
}

function silence() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

describe('ArenaErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ArenaErrorBoundary>
        <p>fine</p>
      </ArenaErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('shows a recoverable panel in place, and Try again re-mounts the children', async () => {
    silence();
    function Harness() {
      const [broken, setBroken] = useState(true);
      return (
        <>
          <button onClick={() => setBroken(false)}>fix it</button>
          <ArenaErrorBoundary>{broken ? <Bomb /> : <p>recovered</p>}</ArenaErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something broke in the arena.');
    await userEvent.click(screen.getByRole('button', { name: 'fix it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears itself when the reset key changes', () => {
    silence();
    const { rerender } = render(
      <ArenaErrorBoundary resetKey="a">
        <Bomb />
      </ArenaErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <ArenaErrorBoundary resetKey="b">
        <p>another thread</p>
      </ArenaErrorBoundary>,
    );
    expect(screen.getByText('another thread')).toBeInTheDocument();
  });

  it('says offline when the network is down, and names a chunk failure', () => {
    silence();
    const restore = setNavigatorOnline(false);
    const { unmount } = render(
      <ArenaErrorBoundary>
        <Bomb />
      </ArenaErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('You are offline.');
    unmount();
    restore();
    render(
      <ArenaErrorBoundary>
        <Bomb message="Failed to fetch dynamically imported module: /a.js" />
      </ArenaErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Part of the arena could not load.');
  });
});
