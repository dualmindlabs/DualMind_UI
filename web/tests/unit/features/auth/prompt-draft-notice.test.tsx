import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PromptDraftNotice } from '@/features/auth/components/prompt-draft-notice';
import { PROMPT_DRAFT_KEY, savePromptDraft } from '@/lib/session/prompt-draft';

afterEach(() => window.sessionStorage.clear());

describe('PromptDraftNotice', () => {
  it('renders nothing without a kept prompt', () => {
    const { container } = render(<PromptDraftNotice title="Sign in to run your prompt" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the kept prompt and promises it is not sent', () => {
    savePromptDraft('Explain entanglement simply');
    render(<PromptDraftNotice title="Sign in to run your prompt" />);
    expect(screen.getByRole('heading', { name: 'Sign in to run your prompt' })).toBeVisible();
    expect(screen.getByText(/Explain entanglement simply/)).toBeVisible();
    expect(screen.getByText(/Nothing is sent until you send it/)).toBeVisible();
  });

  it('does not show or keep an expired or unreadable prompt', () => {
    window.sessionStorage.setItem(PROMPT_DRAFT_KEY, '{not json');
    const { container } = render(<PromptDraftNotice title="Sign in to run your prompt" />);
    expect(container).toBeEmptyDOMElement();
    expect(window.sessionStorage.getItem(PROMPT_DRAFT_KEY)).toBeNull();
  });
});
