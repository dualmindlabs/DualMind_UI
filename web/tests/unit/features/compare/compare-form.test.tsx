import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ModelOption } from '@/features/arena';
import { CompareForm } from '@/features/compare/components/compare-form';
import { compareErrorMessage } from '@/features/compare/lib/errors';
import { ApiError } from '@/lib/api';

const OPTIONS: ModelOption[] = [
  {
    modelId: '1',
    modelName: 'groq/compound-mini',
    displayName: 'Compound Mini',
    provider: 'Groq',
    elo: null,
    rank: null,
  },
  {
    modelId: '2',
    modelName: 'llama',
    displayName: 'Llama',
    provider: 'Meta',
    elo: null,
    rank: null,
  },
];

function setup(running = false) {
  const onRun = vi.fn();
  render(
    <CompareForm
      options={OPTIONS}
      catalogueFailed={false}
      onRetryCatalogue={() => undefined}
      running={running}
      onRun={onRun}
    />,
  );
  return { onRun };
}

describe('CompareForm', () => {
  it('cannot run without a prompt and two models', async () => {
    const user = userEvent.setup();
    setup();
    const run = screen.getByRole('button', { name: 'Run compare' });
    expect(run).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: /your prompt/i }), 'Hello');
    expect(run).toBeDisabled();
  });

  it('says that results are private by default and expire, and has no system prompt field', () => {
    setup();
    expect(screen.getByText(/Off by default. Results are private to you/)).toBeInTheDocument();
    expect(screen.getByText(/deleted after 30 days/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/system/i)).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /anyone with the link/i })).not.toBeChecked();
  });

  it('counts the prompt against the 8,000 character limit', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('textbox', { name: /your prompt/i }), 'abc');
    expect(screen.getByText('3 / 8,000')).toBeInTheDocument();
  });

  it('keeps the button focusable and labeled while it runs', () => {
    setup(true);
    expect(screen.getByRole('button', { name: 'Asking both models' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});

describe('compareErrorMessage', () => {
  const error = (code: string, kind: 'rate_limited' | 'server' | 'validation') =>
    new ApiError({ kind, code, message: 'x', status: 400 });

  it('explains the backend codes in plain words', () => {
    expect(compareErrorMessage(error('MODEL_UNAVAILABLE', 'server'))).toContain(
      'Nothing was saved',
    );
    expect(compareErrorMessage(error('COMPARE_IN_PROGRESS', 'rate_limited'))).toContain(
      'still running',
    );
    expect(compareErrorMessage(error('SAME_MODEL', 'validation'))).toBe(
      'Pick two different models.',
    );
  });

  it('falls back to the generic message for an unknown code', () => {
    expect(compareErrorMessage(error('WHATEVER', 'server'))).toContain('went wrong');
  });
});
