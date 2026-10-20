import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaceholdersAndVanishInput } from '@/components/vendor/aceternity/placeholders-and-vanish-input';

const examples = ['Explain recursion', 'Write a haiku', 'Plan a trip'];
const originalMatchMedia: unknown = Reflect.get(window, 'matchMedia');

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  });
}

function Composer({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <PlaceholdersAndVanishInput
      label="Ask both models"
      placeholders={examples}
      value={value}
      onValueChange={setValue}
      onSubmit={onSubmit}
      interval={1000}
    />
  );
}

/** The example shown right now (the overlay is decorative, so it is found by attribute). */
const currentExample = () => document.querySelector('[data-placeholder="current"]')?.textContent;

beforeEach(() => {
  // jsdom has no canvas: the vanish effect is skipped and the field clears at once.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
  vi.useRealTimers();
});

describe('PlaceholdersAndVanishInput', () => {
  it('is a labelled text field with a labelled send button', () => {
    render(<Composer onSubmit={vi.fn()} />);
    const field = screen.getByLabelText('Ask both models');
    expect(field).toHaveAttribute('type', 'text');
    expect(field).toHaveAccessibleDescription('For example: Explain recursion');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('keeps the rotating examples away from screen readers', () => {
    render(<Composer onSubmit={vi.fn()} />);
    const overlay = document.querySelector('[data-placeholder="current"]')?.parentElement;
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  it('submits with Enter and clears the field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const field = screen.getByLabelText('Ask both models');

    await user.type(field, 'Explain recursion{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('Explain recursion');
    expect(field).toHaveValue('');
  });

  it('does not submit empty or blank text', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Ask both models'), '   {Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rotates the examples, but not while the field has focus', () => {
    vi.useFakeTimers();
    render(<Composer onSubmit={vi.fn()} />);
    expect(currentExample()).toBe('Explain recursion');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentExample()).toBe('Write a haiku');

    const field = screen.getByLabelText('Ask both models');
    act(() => field.focus());
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(currentExample()).toBe('Write a haiku');

    act(() => field.blur());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentExample()).toBe('Plan a trip');
  });

  it('does not rotate under reduced motion', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    render(<Composer onSubmit={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(currentExample()).toBe('Explain recursion');
  });
});
