import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BattlesLeft, nextResetTime } from '@/components/ui/battles-left';

describe('BattlesLeft', () => {
  it('is a polite live region, so a change after a battle is announced', () => {
    render(<BattlesLeft remaining={2} limit={3} noun="free battles" />);
    const counter = screen.getByTestId('battles-left');
    expect(counter).toHaveAttribute('role', 'status');
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveTextContent('2 of 3 free battles left today');
  });

  it('clamps the count to 0..limit', () => {
    render(<BattlesLeft remaining={9} limit={3} />);
    expect(screen.getByTestId('battles-left')).toHaveTextContent('3 of 3 battles left today');
  });

  it("says when today ends: the next 00:00 UTC, in the visitor's clock", async () => {
    render(<BattlesLeft remaining={1} limit={3} now={new Date('2026-11-26T10:00:00Z')} />);
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(Date.UTC(2026, 10, 27));
    expect(await screen.findByTestId('battles-reset')).toHaveTextContent(`resets at ${expected}`);
  });

  it('works out 00:00 UTC and 05:30 in India', () => {
    expect(nextResetTime(new Date('2026-11-26T23:59:00Z'), 'en-GB')).toMatch(/^\d{2}:\d{2}$/);
    const inIndia = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(Date.UTC(2026, 10, 27));
    expect(inIndia).toBe('05:30');
  });
});
