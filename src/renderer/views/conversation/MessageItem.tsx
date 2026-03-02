import { cn } from '../../lib/utils';
import type { DisplayMessage } from '../../../shared/types';
import { ToolCallCard } from './ToolCallCard';

interface MessageItemProps {
  message: DisplayMessage;
}

/** Parse a tool role message's JSON content for display. */
function parseToolContent(content: string): {
  type: string;
  toolName: string;
  detail: string;
} | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    const type = typeof obj.type === 'string' ? obj.type : '';
    const toolName = typeof obj.toolName === 'string' ? obj.toolName : 'Unknown';
    let detail = '';
    if (type === 'tool_call') {
      detail = typeof obj.arguments === 'string' ? obj.arguments : JSON.stringify(obj.arguments);
    } else if (type === 'tool_result') {
      const output = typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
      detail = output.length > 500 ? output.slice(0, 500) + '...' : output;
    }
    return { type, toolName, detail };
  } catch {
    return null;
  }
}

export function MessageItem({ message }: MessageItemProps): React.JSX.Element {
  // Render tool messages as styled cards
  if (message.role === 'tool') {
    const parsed = parseToolContent(message.content);
    if (parsed) {
      const isCall = parsed.type === 'tool_call';
      return (
        <div className="flex gap-3 px-4 py-1.5" data-testid="tool-message">
          <div className="w-7 shrink-0" />
          <div className={cn('min-w-0 flex-1 rounded-md border px-3 py-2 text-xs', 'bg-muted/40')}>
            <div className="text-muted-foreground mb-1 font-medium">
              {isCall ? 'Tool Call' : 'Tool Result'}: {parsed.toolName}
            </div>
            {parsed.detail && (
              <pre className="text-muted-foreground overflow-x-auto font-mono text-[11px] break-all whitespace-pre-wrap">
                {parsed.detail}
              </pre>
            )}
          </div>
        </div>
      );
    }
    // Fallback: render as plain text
    return (
      <div className="flex gap-3 px-4 py-1.5" data-testid="tool-message-fallback">
        <div className="w-7 shrink-0" />
        <div className="text-muted-foreground min-w-0 flex-1 text-xs break-words whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        message.role === 'user' && 'bg-muted/50',
        message.role === 'system' && 'bg-muted/30',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
          message.role === 'user' && 'bg-primary text-primary-foreground',
          message.role === 'assistant' && 'bg-secondary text-secondary-foreground',
          message.role === 'system' && 'bg-muted text-muted-foreground',
        )}
      >
        {message.role === 'user' ? 'U' : message.role === 'assistant' ? 'A' : 'S'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm break-words whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && (
            <span
              className="bg-primary/80 ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-sm"
              aria-hidden="true"
            />
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
