import { memo, useState, useCallback, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check } from 'lucide-react';
import 'highlight.js/styles/github-dark-dimmed.css';

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

/** Recursively extract plain text from React children for copy-to-clipboard. */
function extractTextContent(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (children == null || typeof children === 'boolean') return '';
  if (Array.isArray(children)) return children.map(extractTextContent).join('');
  if (typeof children === 'object' && 'props' in children) {
    return extractTextContent((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={() => void handleCopy()}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  isStreaming,
}: MarkdownRendererProps): React.JSX.Element {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          pre({ children }) {
            // Extract language from the child <code> element
            const codeChild = children as React.ReactElement<{
              className?: string;
              children?: ReactNode;
            }>;
            const className = codeChild.props.className ?? '';
            const match = /language-(\w+)/.exec(className);
            const language = match?.[1] ?? '';
            const textContent = extractTextContent(codeChild.props.children);

            return (
              <div className="group relative my-3 overflow-hidden rounded-lg bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-1.5">
                  <span className="text-xs text-zinc-400">{language || 'text'}</span>
                  <CopyButton text={textContent} />
                </div>
                <pre className="overflow-x-auto p-4 text-sm leading-relaxed">{children}</pre>
              </div>
            );
          },
          code({ className, children, ...props }) {
            // Only style inline code (not inside pre blocks)
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.875em]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a({ children, href, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="bg-primary/80 ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-sm"
          aria-hidden="true"
        />
      )}
    </div>
  );
});
