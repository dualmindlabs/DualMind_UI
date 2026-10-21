import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeBlock } from '@/features/arena/components/code-block';
import type * as Highlight from '@/features/arena/lib/highlight';
import { type CodeLine, highlightCode } from '@/features/arena/lib/highlight';

// The code block around the highlighter: plain code first (same text, same box), colours once
// the grammar is in, plain for unknown languages and when a chunk fails to load.

vi.mock('@/features/arena/lib/highlight', async importOriginal => ({
  ...(await importOriginal<typeof Highlight>()),
  highlightCode: vi.fn(),
}));

const highlight = vi.mocked(highlightCode);

const KEYWORD = 'var(--code-token-keyword)';
const TOKENS: CodeLine[] = [
  [
    { content: 'const', color: KEYWORD, italic: false, bold: false, underline: false },
    { content: ' a = 1;', color: null, italic: false, bold: false, underline: false },
  ],
];

function pre(container: HTMLElement) {
  const element = container.querySelector('pre');
  if (!element) throw new Error('no <pre>');
  return element;
}

describe('CodeBlock', () => {
  beforeEach(() => {
    highlight.mockReset();
  });

  it('shows plain code at once, then the colours, with the same text', async () => {
    let finish: (lines: CodeLine[]) => void = () => {};
    highlight.mockImplementation(
      () =>
        new Promise<CodeLine[]>(resolve => {
          finish = resolve;
        }),
    );
    const { container } = render(<CodeBlock code="const a = 1;" language="ts" />);
    expect(pre(container)).not.toHaveAttribute('data-highlighted');
    expect(pre(container).textContent).toBe('const a = 1;');
    await waitFor(() => expect(highlight).toHaveBeenCalledWith('const a = 1;', 'typescript'));

    finish(TOKENS);
    await waitFor(() => expect(pre(container)).toHaveAttribute('data-highlighted', 'true'));
    expect(pre(container).textContent).toBe('const a = 1;');
    const keyword = pre(container).querySelector('span');
    expect(keyword?.textContent).toBe('const');
    expect(keyword?.getAttribute('style')).toContain('--code-token-keyword');
    // The copy button is unchanged.
    expect(screen.getByRole('button', { name: /copy the ts code/i })).toBeInTheDocument();
  });

  it('keeps an unknown language plain and never loads a grammar for it', async () => {
    const { container } = render(<CodeBlock code="++++[>++<-]" language="brainfuck" />);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(highlight).not.toHaveBeenCalled();
    expect(pre(container)).not.toHaveAttribute('data-highlighted');
    expect(pre(container).textContent).toBe('++++[>++<-]');
  });

  it('keeps the plain code when the highlighter cannot load', async () => {
    highlight.mockRejectedValue(new Error('Failed to fetch dynamically imported module'));
    const { container } = render(<CodeBlock code="print(1)" language="python" />);
    await waitFor(() => expect(highlight).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(pre(container)).not.toHaveAttribute('data-highlighted');
    expect(pre(container).textContent).toBe('print(1)');
  });

  it('keeps the colours of what did not change while more code streams in', async () => {
    highlight.mockResolvedValue(TOKENS);
    const { container, rerender } = render(<CodeBlock code="const a = 1;" language="ts" />);
    await waitFor(() => expect(pre(container)).toHaveAttribute('data-highlighted', 'true'));
    highlight.mockImplementation(() => new Promise<CodeLine[]>(() => {}));
    rerender(<CodeBlock code={'const a = 1;\nconst b = 2;'} language="ts" />);
    expect(pre(container)).toHaveAttribute('data-highlighted', 'partial');
    expect(pre(container).textContent).toBe('const a = 1;\nconst b = 2;');
    expect(pre(container).querySelector('span')?.textContent).toBe('const');
  });
});
