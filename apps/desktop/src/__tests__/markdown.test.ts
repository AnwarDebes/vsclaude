import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../lib/markdown';

describe('renderMarkdown', () => {
  it('renders headings at the right level', () => {
    expect(renderMarkdown('# Title')).toBe('<h1>Title</h1>');
    expect(renderMarkdown('### Sub')).toBe('<h3>Sub</h3>');
  });

  it('renders bold, italic, and inline code in a paragraph', () => {
    expect(renderMarkdown('**b** and *i* and `c`')).toBe(
      '<p><strong>b</strong> and <em>i</em> and <code>c</code></p>',
    );
  });

  it('does not format Markdown inside inline code', () => {
    expect(renderMarkdown('`a * b * c`')).toBe('<p><code>a * b * c</code></p>');
  });

  it('does not turn a spaced number into a stray code span', () => {
    expect(renderMarkdown('I have 5 apples')).toBe('<p>I have 5 apples</p>');
  });

  it('renders an unordered list', () => {
    expect(renderMarkdown('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
  });

  it('renders a fenced code block without formatting its contents', () => {
    expect(renderMarkdown('```\nconst x = *y*;\n```')).toBe('<pre><code>const x = *y*;</code></pre>');
  });

  it('renders a safe link and drops an unsafe one', () => {
    expect(renderMarkdown('[site](https://x.com)')).toBe('<p><a href="https://x.com">site</a></p>');
    expect(renderMarkdown('[x](javascript:void)')).toBe('<p>x</p>');
  });

  it('escapes raw HTML so it cannot inject', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });

  it('joins consecutive lines of a paragraph with a break', () => {
    expect(renderMarkdown('line one\nline two')).toBe('<p>line one<br>line two</p>');
  });

  it('separates blocks across blank lines', () => {
    expect(renderMarkdown('# H\n\ntext')).toBe('<h1>H</h1>\n<p>text</p>');
  });
});
