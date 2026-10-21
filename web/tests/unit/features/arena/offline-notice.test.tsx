import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OfflineNotice } from '@/features/arena/components/offline-notice';
import { OFFLINE_BLOCKED_EVENT } from '@/lib/network/online-status';

import { setNavigatorOnline } from '../../lib/network/navigator-online';
import { FakeArena, fakeBattle } from './arena-context';

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
  vi.useRealTimers();
});

function go(online: boolean) {
  act(() => {
    restore ??= setNavigatorOnline(online);
    setNavigatorOnline(online);
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

function renderNotice(pendingVotes = 0) {
  const battle = { ...fakeBattle(), pendingVotes };
  return render(
    <FakeArena overrides={{ battle }}>
      <OfflineNotice />
    </FakeArena>,
  );
}

describe('OfflineNotice', () => {
  it('is an empty polite status region while online', () => {
    renderNotice();
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
  });

  it('says it honestly offline, with the votes waiting', () => {
    renderNotice(2);
    go(false);
    expect(screen.getByRole('status')).toHaveTextContent(
      'You are offline. New battles wait until you are back; votes are saved on this device (2 waiting).',
    );
  });

  it('leaves the count out when no vote waits', () => {
    renderNotice(0);
    go(false);
    expect(screen.getByRole('status')).toHaveTextContent(
      'votes are saved on this device.',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('waiting');
  });

  it('shows Back online, then fades away', () => {
    vi.useFakeTimers();
    renderNotice();
    go(false);
    go(true);
    expect(screen.getByRole('status')).toHaveTextContent('Back online.');
    act(() => void vi.advanceTimersByTime(2700));
    expect(screen.getByTestId('offline-notice')).toHaveAttribute('data-phase', 'fading');
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('explains a blocked link and cancels the event', () => {
    renderNotice();
    go(false);
    const event = new CustomEvent(OFFLINE_BLOCKED_EVENT, { cancelable: true });
    act(() => void window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('That page needs a connection.');
  });
});
