import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button, buttonVariants } from '@/components/ui/button';

describe('Button', () => {
  it('is a native button of type "button" by default', () => {
    render(<Button>Start a battle</Button>);
    const button = screen.getByRole('button', { name: 'Start a battle' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });

  it.each([
    ['primary', 'bg-mind-a'],
    ['human', 'bg-human'],
    ['secondary', 'bg-surface-2'],
    ['ghost', 'hover:bg-hover'],
    ['outline', 'border-line-strong'],
    ['destructive', 'bg-bad'],
    ['link', 'text-mind-a'],
  ] as const)('the %s variant uses its token classes', (variant, token) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' }).className).toContain(token);
  });

  it('defaults to the 44px primary button', () => {
    const classes = buttonVariants().split(' ');
    expect(classes).toContain('bg-mind-a');
    expect(classes).toContain('h-11');
  });

  it('keeps a link variant free of the size box', () => {
    const classes = buttonVariants({ variant: 'link', size: 'md' });
    expect(classes).toContain('h-auto');
    expect(classes).toContain('px-0');
  });

  it('applies the sizes, icon sizes included', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('h-9');
    expect(buttonVariants({ size: 'icon' })).toContain('size-11');
    expect(buttonVariants({ size: 'icon-sm' })).toContain('size-9');
  });

  it('gives every size a pointer target of at least 24px (44px on touch)', () => {
    expect(buttonVariants({ size: 'xs' })).toContain('hit-area');
  });

  it('is disabled for real when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Vote
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Vote' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('while loading: busy, ignores presses, keeps its name and stays focusable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('data-loading');

    await user.tab();
    expect(button).toHaveFocus();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('submits a form only when asked to', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form aria-label="Vote form" onSubmit={event => onSubmit(event.nativeEvent)}>
        <Button>Plain</Button>
        <Button type="submit">Send</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Plain' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
