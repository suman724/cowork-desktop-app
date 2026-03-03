import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownRenderer } from '../../../../src/renderer/views/conversation/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders plain text', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    render(<MarkdownRenderer content="This is **bold** text" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });

  it('renders italic text', () => {
    render(<MarkdownRenderer content="This is *italic* text" />);
    expect(screen.getByText('italic')).toBeInTheDocument();
    expect(screen.getByText('italic').tagName).toBe('EM');
  });

  it('renders headings', () => {
    const content = ['# Heading 1', '', '## Heading 2'].join('\n');
    render(<MarkdownRenderer content={content} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2');
  });

  it('renders unordered lists', () => {
    const content = ['- Item 1', '- Item 2', '- Item 3'].join('\n');
    render(<MarkdownRenderer content={content} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('renders ordered lists', () => {
    const content = ['1. First', '2. Second', '3. Third'].join('\n');
    render(<MarkdownRenderer content={content} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('renders links with target=_blank', () => {
    render(<MarkdownRenderer content="[Click here](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'Click here' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders code blocks with copy button', () => {
    const content = ['```javascript', 'const x = 1;', '```'].join('\n');
    render(<MarkdownRenderer content={content} />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
  });

  it('renders inline code', () => {
    render(<MarkdownRenderer content="Use `npm install` to install" />);
    const code = screen.getByText('npm install');
    expect(code.tagName).toBe('CODE');
  });

  it('renders blockquotes', () => {
    render(<MarkdownRenderer content="> This is a quote" />);
    expect(screen.getByText('This is a quote')).toBeInTheDocument();
    expect(screen.getByRole('blockquote')).toBeInTheDocument();
  });

  it('shows streaming cursor when isStreaming is true', () => {
    const { container } = render(<MarkdownRenderer content="Streaming text" isStreaming={true} />);
    const cursor = container.querySelector('span[aria-hidden="true"]');
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveClass('animate-pulse');
  });

  it('does not show streaming cursor when isStreaming is false', () => {
    const { container } = render(<MarkdownRenderer content="Done text" isStreaming={false} />);
    const cursor = container.querySelector('span[aria-hidden="true"]');
    expect(cursor).not.toBeInTheDocument();
  });

  it('renders code block with copy button that is clickable', async () => {
    const user = userEvent.setup();
    const content = ['```', 'hello world', '```'].join('\n');
    render(<MarkdownRenderer content={content} />);

    // Verify copy button exists and is clickable
    const copyButton = screen.getByLabelText('Copy code');
    expect(copyButton).toBeInTheDocument();

    // Click should not throw (clipboard may not be available in jsdom)
    await user.click(copyButton);
  });

  it('renders GFM tables', () => {
    const content = ['| A | B |', '|---|---|', '| 1 | 2 |'].join('\n');
    render(<MarkdownRenderer content={content} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
